import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const siteId = params.id;
    
    // Get site from database
    const { prisma } = await import('@/lib/prisma');
    
    const site = await prisma.site.findUnique({
      where: { id: siteId }
    });
    
    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }
    
    // Fetch blocked countries from WordPress
    const response = await axios.get(`${site.url}/wp-json/pagw/v1/block-all-countries`, {
      headers: {
        'X-API-KEY': site.apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    return NextResponse.json(response.data);
    
  } catch (error) {
    console.error('Error fetching blocked countries:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        return NextResponse.json({ error: 'WordPress plugin not found or not activated' }, { status: 404 });
      }
      if (error.response?.status === 401) {
        return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
      }
      if (error.response?.status === 403) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      return NextResponse.json({ 
        error: `WordPress API error: ${error.response?.status} ${error.response?.statusText}` 
      }, { status: error.response?.status || 500 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const siteId = params.id;
    const body = await request.json();
    
    // Get site from database
    const { prisma } = await import('@/lib/prisma');
    
    const site = await prisma.site.findUnique({
      where: { id: siteId }
    });
    
    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }
    
    // Update blocked countries in WordPress
    const response = await axios.post(`${site.url}/wp-json/pagw/v1/block-all-countries`, body, {
      headers: {
        'X-API-KEY': site.apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    return NextResponse.json(response.data);
    
  } catch (error) {
    console.error('Error updating blocked countries:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        return NextResponse.json({ error: 'WordPress plugin not found or not activated' }, { status: 404 });
      }
      if (error.response?.status === 401) {
        return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
      }
      if (error.response?.status === 403) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      return NextResponse.json({ 
        error: `WordPress API error: ${error.response?.status} ${error.response?.statusText}` 
      }, { status: error.response?.status || 500 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
