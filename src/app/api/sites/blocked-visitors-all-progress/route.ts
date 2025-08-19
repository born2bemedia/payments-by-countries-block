export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import axios from "axios";

export async function POST(request: Request) {
  const encoder = new TextEncoder();
  
  try {
    const body = await request.json();

    console.log(
      "Received blocked visitors update for all sites (with progress):",
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

         // Create a readable stream for SSE
         const stream = new ReadableStream({
           async start(controller) {
             // Send initial progress
             controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start', totalSites: sites.length })}\n\n`));

             // First pass: collect all existing device IDs from all sites
             const allExistingDeviceIds = new Set<string>();
             for (const site of sites) {
               try {
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
                 existingData.forEach((visitor: any) => {
                   allExistingDeviceIds.add(visitor.deviceId);
                 });
               } catch (error: any) {
                 console.error(`Error fetching existing data from ${site.url}:`, error.message);
               }
             }

             // Find truly new device IDs (not existing on ANY site)
             const newDeviceIds = wordpressData.filter(
               (visitor: any) => !allExistingDeviceIds.has(visitor.deviceId)
             );

             // Prepare data for external endpoint (only new devices)
             newDeviceIds.forEach((visitor: any) => {
               allNewData.push({
                 utm: visitor.affiliate_utm,
                 deviceId: visitor.deviceId,
                 newDevice: true,
               });
             });

             console.log(`Found ${allNewData.length} truly new device IDs out of ${wordpressData.length} total`);

             // Process each site and update it immediately
             const updateResults = [];
             for (let i = 0; i < sites.length; i++) {
               const site = sites[i];
               try {
                 // Send progress update
                 controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                   type: 'progress', 
                   siteId: site.id, 
                   siteUrl: site.url, 
                   status: 'processing',
                   current: i + 1,
                   total: sites.length
                 })}\n\n`));

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

                 // Send success update
                 controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                   type: 'progress', 
                   siteId: site.id, 
                   siteUrl: site.url, 
                   status: 'saved',
                   current: i + 1,
                   total: sites.length
                 })}\n\n`));

               } catch (error: any) {
                 console.error(`Error processing site ${site.url}:`, error.message);
                 updateResults.push({ site: site.url, success: false, error: error.message });

                 // Send error update
                 controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                   type: 'progress', 
                   siteId: site.id, 
                   siteUrl: site.url, 
                   status: 'error',
                   error: error.message,
                   current: i + 1,
                   total: sites.length
                 })}\n\n`));
               }
             }

        // Send only one request to external endpoint with all new data
        if (allNewData.length > 0) {
          console.log("Sending all new data to external endpoint...");
          console.log(
            "External endpoint data (all new):",
            JSON.stringify(allNewData, null, 2)
          );

          console.log("allNewData", allNewData);

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
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'error', 
            error: "Some sites failed to update",
            failedSites: failedSites.map(f => f.site),
            results: updateResults
          })}\n\n`));
        } else {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'complete', 
            message: "Updated all sites successfully",
            totalSites: sites.length,
            newDevices: allNewData.length,
            results: updateResults
          })}\n\n`));
        }

        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error("Error updating blocked visitors for all sites:", error);
    return NextResponse.json(
      { error: "Failed to update blocked visitors" },
      { status: 500 }
    );
  }
}
