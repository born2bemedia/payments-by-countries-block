export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import axios from 'axios';

interface PaymentGateway {
  id: string;
  name: string;
  allowed_countries: string[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const site = await prisma.site.findUnique({
      where: { id: params.id },
    });

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    return NextResponse.json(site);
  } catch (error) {
    console.error("Error fetching site:", error);
    return NextResponse.json(
      { error: "Failed to fetch site" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const site = await prisma.site.findUnique({
      where: { id: params.id },
    });

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    // Delete the site
    await prisma.site.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: "Site deleted successfully",
      deletedSite: site,
    });
  } catch (error) {
    console.error("Error deleting site:", error);
    return NextResponse.json(
      { error: "Failed to delete site" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { paymentGateways } = body;

    console.log('Received payment gateways update:', JSON.stringify(paymentGateways, null, 2));

    const site = await prisma.site.findUnique({
      where: {
        id: params.id
      }
    });

    if (!site) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      );
    }

    try {
      // Update payment gateways on WordPress site
      console.log(`Updating payment gateways on ${site.url}/wp-json/pagw/v1/payment-gateways`);
      
      // Transform data to match WordPress plugin format
      // WordPress expects a simple object where keys are gateway IDs and values are arrays of allowed countries
      const updateData = paymentGateways.reduce((acc: Record<string, string[]>, gateway: PaymentGateway) => {
        acc[gateway.id] = gateway.allowed_countries.length === 0 ? ['all'] : gateway.allowed_countries;
        return acc;
      }, {});

      console.log('Sending update data:', JSON.stringify(updateData, null, 2));

      const updateResponse = await axios.post(
        `${site.url}/wp-json/pagw/v1/payment-gateways`,
        updateData,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': site.apiKey
          }
        }
      );

      console.log('WordPress API update response:', updateResponse.data);

      if (!updateResponse.data.success) {
        throw new Error('Failed to update payment gateways');
      }

      // Fetch fresh data after successful update
      console.log('Fetching updated payment gateways...');
      const fetchResponse = await axios.get(
        `${site.url}/wp-json/pagw/v1/payment-gateways`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': site.apiKey
          }
        }
      );

      console.log('WordPress API fetch response:', fetchResponse.data);

      // WordPress returns an array directly
      const updatedGateways = Array.isArray(fetchResponse.data) ? fetchResponse.data : paymentGateways;

      return NextResponse.json({
        ...site,
        paymentGateways: updatedGateways
      });
    } catch (wordpressError: any) {
      console.error('WordPress API error:', {
        message: wordpressError.message,
        response: wordpressError.response?.data,
        status: wordpressError.response?.status
      });

      return NextResponse.json(
        { error: 'Failed to update payment gateways on WordPress site' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating payment gateways:', error);
    return NextResponse.json(
      { error: 'Failed to update payment gateways' },
      { status: 500 }
    );
  }
} 