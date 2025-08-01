export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import axios from 'axios';

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
      // Fetch UTM sources from WordPress site
      console.log(`Fetching UTM sources from ${site.url}/wp-json/pagw/v1/blocked-countries`);
      const response = await axios.get(
        `${site.url}/wp-json/pagw/v1/blocked-countries`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': site.apiKey
          }
        }
      );

      console.log('WordPress API response:', JSON.stringify(response.data, null, 2));

      return NextResponse.json(response.data);
    } catch (wordpressError: any) {
      console.error('WordPress API error:', {
        message: wordpressError.message,
        response: wordpressError.response?.data,
        status: wordpressError.response?.status
      });

      // Return empty object if WordPress API fails
      return NextResponse.json({});
    }
  } catch (error) {
    console.error('Error fetching UTM sources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch UTM sources' },
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
    console.log('Received UTM sources update:', JSON.stringify(body, null, 2));

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
      // Update UTM sources on WordPress site
      console.log(`Updating UTM sources on ${site.url}/wp-json/pagw/v1/blocked-countries`);
      
      const updateResponse = await axios.post(
        `${site.url}/wp-json/pagw/v1/blocked-countries`,
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': site.apiKey
          }
        }
      );

      console.log('WordPress API update response:', updateResponse.data);

      if (!updateResponse.data.success) {
        throw new Error('Failed to update UTM sources');
      }

      return NextResponse.json({
        success: true,
        data: body
      });
    } catch (wordpressError: any) {
      console.error('WordPress API error:', {
        message: wordpressError.message,
        response: wordpressError.response?.data,
        status: wordpressError.response?.status
      });

      return NextResponse.json(
        { error: 'Failed to update UTM sources on WordPress site' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating UTM sources:', error);
    return NextResponse.json(
      { error: 'Failed to update UTM sources' },
      { status: 500 }
    );
  }
} 