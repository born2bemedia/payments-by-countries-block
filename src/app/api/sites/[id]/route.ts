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

    try {
      // Test if WordPress API is accessible
      console.log(`Testing WordPress API accessibility...`);
      try {
        const testResponse = await axios.get(`${site.url}/wp-json/`);
        console.log('WordPress REST API is accessible:', testResponse.status);
      } catch (testError: any) {
        console.error('WordPress REST API test failed:', testError.message);
      }

      // Test if WooCommerce is available
      console.log(`Testing WooCommerce availability...`);
      try {
        const wcResponse = await axios.get(`${site.url}/wp-json/wc/v3/`);
        console.log('WooCommerce REST API is accessible:', wcResponse.status);
      } catch (wcError: any) {
        console.error('WooCommerce REST API test failed:', wcError.message);
      }

      // Test without API key first
      console.log(`Testing payment gateways endpoint without API key...`);
      try {
        const noKeyResponse = await axios.get(`${site.url}/wp-json/pagw/v1/payment-gateways`);
        console.log('Response without API key:', noKeyResponse.status, noKeyResponse.data);
      } catch (noKeyError: any) {
        console.log('Expected error without API key:', noKeyError.response?.status, noKeyError.response?.data);
      }

      // Fetch payment gateways from WordPress site
      console.log(`Fetching payment gateways from ${site.url}/wp-json/pagw/v1/payment-gateways`);
      console.log(`Using API Key: ${site.apiKey.substring(0, 8)}...`);
      
      const response = await axios.get(
        `${site.url}/wp-json/pagw/v1/payment-gateways`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': site.apiKey
          }
        }
      );

      console.log('WordPress API response status:', response.status);
      console.log('WordPress API response headers:', response.headers);
      console.log('WordPress API response data:', JSON.stringify(response.data, null, 2));
      console.log('Response data type:', typeof response.data);
      console.log('Is array:', Array.isArray(response.data));
      console.log('Number of payment gateways received:', Array.isArray(response.data) ? response.data.length : 0);

      // WordPress returns an array directly
      const paymentGateways = Array.isArray(response.data) ? response.data : [];
      
      // Log each gateway for debugging
      paymentGateways.forEach((gateway, index) => {
        console.log(`Gateway ${index + 1}:`, {
          id: gateway.id,
          name: gateway.name,
          allowed_countries_count: gateway.allowed_countries?.length || 0
        });
      });

      return NextResponse.json({
        ...site,
        paymentGateways
      });
    } catch (wordpressError: any) {
      console.error('WordPress API error:', {
        message: wordpressError.message,
        response: wordpressError.response?.data,
        status: wordpressError.response?.status,
        headers: wordpressError.response?.headers
      });

      // Check if it's a WordPress error response
      if (wordpressError.response?.data?.code) {
        console.error('WordPress error code:', wordpressError.response.data.code);
        console.error('WordPress error message:', wordpressError.response.data.message);
      }

      // Return site data even if WordPress API fails
      return NextResponse.json({
        ...site,
        paymentGateways: [],
        error: `Failed to fetch payment gateways from WordPress site: ${wordpressError.response?.data?.message || wordpressError.message}`
      });
    }
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