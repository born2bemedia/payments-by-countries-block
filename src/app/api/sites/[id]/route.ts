export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import axios from 'axios';

interface PaymentGateway {
  id: string;
  name: string;
  allowed_countries: string[];
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
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
      // Fetch payment gateways from WordPress site
      console.log(`Fetching payment gateways from ${site.url}/wp-json/pagw/v1/payment-gateways`);
      const response = await axios.get(
        `${site.url}/wp-json/pagw/v1/payment-gateways`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': site.apiKey
          }
        }
      );

      console.log('WordPress API response:', JSON.stringify(response.data, null, 2));
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
        status: wordpressError.response?.status
      });

      // Return site data even if WordPress API fails
      return NextResponse.json({
        ...site,
        paymentGateways: [],
        error: 'Failed to fetch payment gateways from WordPress site'
      });
    }
  } catch (error) {
    console.error('Error fetching site:', error);
    return NextResponse.json(
      { error: 'Failed to fetch site data' },
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
        acc[gateway.id] = gateway.allowed_countries;
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