export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import axios from "axios";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const site = await prisma.site.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    try {
      // Fetch blocked visitors from WordPress site
      console.log(
        `Fetching blocked visitors from ${site.url}/wp-json/pagw/v1/blocked-visitors`
      );
      const response = await axios.get(
        `${site.url}/wp-json/pagw/v1/blocked-visitors`,
        {
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": site.apiKey,
          },
        }
      );

      console.log(
        "WordPress API response:",
        JSON.stringify(response.data, null, 2)
      );
      console.log("Response data type:", typeof response.data);
      console.log("Response is array:", Array.isArray(response.data));
      console.log(
        "Response length:",
        Array.isArray(response.data) ? response.data.length : "N/A"
      );

      // WordPress returns an array of objects with deviceId, affiliate_utm, affiliate_email
      const blockedVisitors = Array.isArray(response.data) ? response.data : [];

      return NextResponse.json(blockedVisitors);
    } catch (wordpressError: any) {
      console.error("WordPress API error:", {
        message: wordpressError.message,
        response: wordpressError.response?.data,
        status: wordpressError.response?.status,
      });

      // Return empty array if WordPress API fails
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error("Error fetching blocked visitors:", error);
    return NextResponse.json(
      { error: "Failed to fetch blocked visitors" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    console.log(
      "Received blocked visitors update:",
      JSON.stringify(body, null, 2)
    );

    const site = await prisma.site.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    try {
             // Transform data to WordPress format
       // body is array of objects with device_id, utm
       const wordpressData = body.map((device: any) => ({
         deviceId: device.device_id,
         affiliate_utm: device.utm || "",
         blocked_at: new Date().toISOString(),
       }));

      console.log(
        "Transformed data for WordPress:",
        JSON.stringify(wordpressData, null, 2)
      );
      console.log("Data type:", typeof wordpressData);
      console.log("Is array:", Array.isArray(wordpressData));
      console.log("Body length:", wordpressData.length);
      console.log(
        "First element:",
        wordpressData.length > 0 ? wordpressData[0] : "N/A"
      );

             // Get existing data BEFORE updating WordPress
       console.log("Getting existing data to compare...");
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

       // Find new data (deviceIds that don't exist in WordPress yet)
       const newData = wordpressData.filter(
         (visitor: any) => !existingDeviceIds.includes(visitor.deviceId)
       );

       console.log("Existing device IDs:", existingDeviceIds);
       console.log(
         "New device IDs:",
         newData.map((v: any) => v.deviceId)
       );

       // Update blocked visitors on WordPress site
       console.log(
         `Updating blocked visitors on ${site.url}/wp-json/pagw/v1/blocked-visitors`
       );

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

       console.log("WordPress API update response:", updateResponse.data);
       console.log("Response status:", updateResponse.status);
       console.log("Response success:", updateResponse.data.success);
       console.log("Response total_blocked:", updateResponse.data.total_blocked);
       console.log(
         "Full response data:",
         JSON.stringify(updateResponse.data, null, 2)
       );

       // Send only new data to external endpoint
       if (newData.length > 0) {
         console.log("Sending new data to external endpoint...");
         const externalData = newData.map((visitor: any) => ({
           utm: visitor.affiliate_utm,
           deviceId: visitor.deviceId,
           newDevice: true,
         }));

         console.log(
           "External endpoint data (new only):",
           JSON.stringify(externalData, null, 2)
         );

         try {
           const externalResponse = await axios.post(
             "https://eoukl1htzrpr4pw.m.pipedream.net",
             externalData,
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

       // Test GET request immediately after POST to verify data was saved
       console.log("Testing GET request to verify data was saved...");
       try {
         const verifyResponse = await axios.get(
           `${site.url}/wp-json/pagw/v1/blocked-visitors`,
           {
             headers: {
               "Content-Type": "application/json",
               "X-API-Key": site.apiKey,
             },
           }
         );
         console.log(
           "Verification GET response:",
           JSON.stringify(verifyResponse.data, null, 2)
         );
       } catch (verifyError: any) {
         console.error("Verification GET error:", verifyError.message);
       }

       if (!updateResponse.data.success) {
         console.error("WordPress returned success: false");
         throw new Error("Failed to update blocked visitors");
       }

       return NextResponse.json(updateResponse.data);
    } catch (wordpressError: any) {
      console.error("WordPress API error:", {
        message: wordpressError.message,
        response: wordpressError.response?.data,
        status: wordpressError.response?.status,
      });

      return NextResponse.json(
        { error: "Failed to update blocked visitors on WordPress site" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error updating blocked visitors:", error);
    return NextResponse.json(
      { error: "Failed to update blocked visitors" },
      { status: 500 }
    );
  }
}
