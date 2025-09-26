export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import axios from "axios";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const site = await prisma.site.findUnique({ where: { id } });

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    try {
      const response = await axios.get(
        `${site.url}/wp-json/pagw/v1/allowed-currencies`,
        {
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": site.apiKey,
          },
        }
      );

      const data = response.data || {};
      return NextResponse.json(data);
    } catch (wordpressError: any) {
      console.error("WordPress API error (allowed-currencies GET):", {
        message: wordpressError.message,
        response: wordpressError.response?.data,
        status: wordpressError.response?.status,
      });
      return NextResponse.json({}, { status: 200 });
    }
  } catch (error) {
    console.error("Error fetching allowed currencies:", error);
    return NextResponse.json(
      { error: "Failed to fetch allowed currencies" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { id } = await params;
    const site = await prisma.site.findUnique({ where: { id } });

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    try {
      const response = await axios.post(
        `${site.url}/wp-json/pagw/v1/allowed-currencies`,
        body,
        {
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": site.apiKey,
          },
        }
      );

      return NextResponse.json(response.data || { success: true });
    } catch (wordpressError: any) {
      console.error("WordPress API error (allowed-currencies POST):", {
        message: wordpressError.message,
        response: wordpressError.response?.data,
        status: wordpressError.response?.status,
      });
      return NextResponse.json(
        { error: "Failed to update allowed currencies" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error updating allowed currencies:", error);
    return NextResponse.json(
      { error: "Failed to update allowed currencies" },
      { status: 500 }
    );
  }
}


