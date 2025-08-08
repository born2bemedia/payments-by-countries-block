export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import axios from "axios";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log(
      "Received blocked visitors update for all sites:",
      JSON.stringify(body, null, 2)
    );

    // Get all sites
    const sites = await prisma.site.findMany();

    if (sites.length === 0) {
      return NextResponse.json({ error: "No sites found" }, { status: 404 });
    }

    // Transform data to WordPress format
    const wordpressData = body.map((device: any) => ({
      deviceId: device.device_id,
      affiliate_utm: device.utm || "",
      blocked_at: new Date().toISOString(),
    }));

    console.log(
      "Transformed data for WordPress:",
      JSON.stringify(wordpressData, null, 2)
    );

    // Collect all new device IDs from all sites
    const allNewDeviceIds = new Set<string>();
    const allNewData: Array<{ utm: string; deviceId: string; newDevice: boolean }> = [];

    // Process each site and update it immediately
    const updateResults = [];
    for (const site of sites) {
      try {
        // Get existing data from this site
        const existingResponse = await axios.get(
          `${site.url}/wp-json/pagw/v1/blocked-visitors`,
          {
            headers: {
              "Content-Type": "application/json",
              "X-API-Key": site.apiKey,
            },
          }
        );

        const existingData = existingResponse.data || [];
        const existingDeviceIds = existingData.map(
          (visitor: any) => visitor.deviceId
        );

        // Find new data for this site
        const newData = wordpressData.filter(
          (visitor: any) => !existingDeviceIds.includes(visitor.deviceId)
        );

        // Add to global collections
        newData.forEach((visitor: any) => {
          if (!allNewDeviceIds.has(visitor.deviceId)) {
            allNewDeviceIds.add(visitor.deviceId);
            allNewData.push({
              utm: visitor.affiliate_utm,
              deviceId: visitor.deviceId,
              newDevice: true,
            });
          }
        });

        console.log(`Site ${site.url}: Found ${newData.length} new device IDs`);

        // Update this site immediately
        const updateResponse = await axios.post(
          `${site.url}/wp-json/pagw/v1/blocked-visitors`,
          wordpressData,
          {
            headers: {
              "Content-Type": "application/json",
              "X-API-Key": site.apiKey,
            },
          }
        );

        if (!updateResponse.data.success) {
          throw new Error(`Failed to update ${site.url}`);
        }

        updateResults.push({ site: site.url, success: true });
      } catch (error: any) {
        console.error(`Error processing site ${site.url}:`, error.message);
        updateResults.push({ site: site.url, success: false, error: error.message });
      }
    }

    // Send only one request to external endpoint with all new data
    if (allNewData.length > 0) {
      console.log("Sending all new data to external endpoint...");
      console.log(
        "External endpoint data (all new):",
        JSON.stringify(allNewData, null, 2)
      );

      try {
        const externalResponse = await axios.post(
          "https://eoukl1htzrpr4pw.m.pipedream.net",
          allNewData,
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        console.log("External endpoint response:", externalResponse.data);
      } catch (externalError: any) {
        console.error("External endpoint error:", {
          message: externalError.message,
          response: externalError.response?.data,
          status: externalError.response?.status,
        });
        // Don't fail the main request if external endpoint fails
      }
    } else {
      console.log("No new data to send to external endpoint");
    }

    const failedSites = updateResults.filter(result => !result.success);

    if (failedSites.length > 0) {
      console.error("Some sites failed to update:", failedSites);
      return NextResponse.json(
        { 
          error: "Some sites failed to update",
          failedSites: failedSites.map(f => f.site),
          results: updateResults
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Updated all sites successfully",
      totalSites: sites.length,
      newDevices: allNewData.length,
      results: updateResults
    });

  } catch (error) {
    console.error("Error updating blocked visitors for all sites:", error);
    return NextResponse.json(
      { error: "Failed to update blocked visitors" },
      { status: 500 }
    );
  }
}
