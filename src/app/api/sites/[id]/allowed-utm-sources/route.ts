import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import axios from 'axios';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
  try {
    const { id: siteId } = await params;

    // Get site from database
    const site = await prisma.site.findUnique({
      where: { id: siteId },
    });

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // Make request to WordPress allowed UTM sources endpoint
    const response = await axios.get(`${site.url}/wp-json/pagw/v1/allowed-utm-sources`, {
      headers: {
        'X-API-KEY': site.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching allowed UTM sources:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        return NextResponse.json(
          { error: `WordPress API error: ${error.response.status}` },
          { status: error.response.status }
        );
      } else if (error.request) {
        return NextResponse.json(
          { error: 'No response from WordPress site' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to fetch allowed UTM sources' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
  try {
    const { id: siteId } = await params;
    const body = await request.json();

    // Get site from database
    const site = await prisma.site.findUnique({
      where: { id: siteId },
    });

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // Make request to WordPress allowed UTM sources endpoint
    const response = await axios.post(`${site.url}/wp-json/pagw/v1/allowed-utm-sources`, body, {
      headers: {
        'X-API-KEY': site.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    return NextResponse.json(response.data || { success: true });
  } catch (error) {
    console.error('Error updating allowed UTM sources:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        return NextResponse.json(
          { error: `WordPress API error: ${error.response.status}` },
          { status: error.response.status }
        );
      } else if (error.request) {
        return NextResponse.json(
          { error: 'No response from WordPress site' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to update allowed UTM sources' },
      { status: 500 }
    );
  }
}
