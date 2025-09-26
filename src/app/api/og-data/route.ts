import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const runtime = 'nodejs';

interface OGData {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  siteName?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    try {
      // Fetch the webpage using fetch
      const response = await fetch(formattedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const ogData: OGData = {};

      // Extract OG tags
      ogData.title = $('meta[property="og:title"]').attr('content') || 
                     $('meta[name="twitter:title"]').attr('content') || 
                     $('title').text() || 
                     '';

      ogData.description = $('meta[property="og:description"]').attr('content') || 
                          $('meta[name="twitter:description"]').attr('content') || 
                          $('meta[name="description"]').attr('content') || 
                          '';

      ogData.image = $('meta[property="og:image"]').attr('content') || 
                    $('meta[name="twitter:image"]').attr('content') || 
                    '';

      ogData.url = $('meta[property="og:url"]').attr('content') || formattedUrl;

      ogData.siteName = $('meta[property="og:site_name"]').attr('content') || 
                       $('meta[name="application-name"]').attr('content') || 
                       '';

      // Convert relative URLs to absolute URLs for images
      if (ogData.image && !ogData.image.startsWith('http')) {
        const baseUrl = new URL(formattedUrl);
        if (ogData.image.startsWith('//')) {
          ogData.image = baseUrl.protocol + ogData.image;
        } else if (ogData.image.startsWith('/')) {
          ogData.image = baseUrl.origin + ogData.image;
        } else {
          ogData.image = baseUrl.origin + '/' + ogData.image;
        }
      }

      return NextResponse.json({
        success: true,
        data: ogData
      });

    } catch (fetchError: any) {
      console.error('Error fetching URL:', fetchError.message);
      return NextResponse.json(
        { 
          error: 'Failed to fetch website data',
          details: fetchError.message 
        },
        { status: 400 }
      );
    }

  } catch (error: any) {
    console.error('Error in OG data endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
