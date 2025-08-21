import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ params: string[] }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const resolvedParams = await params;
    const path = resolvedParams.params.join('/');
    
    // Check if the environment variable is set
    if (!process.env.GEOBASE_TITILER) {
      console.error('GEOBASE_TITILER environment variable is not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    // Validate the path to ensure it's a valid tile request
    if (!path.match(/^WebMercatorQuad\/\d+\/\d+\/\d+$/)) {
      console.error(`Invalid tile path: ${path}`);
      return NextResponse.json({ error: 'Invalid tile path' }, { status: 400 });
    }
    
    // Construct the actual titiler URL using the server-side environment variable
    const titilerUrl = `${process.env.GEOBASE_TITILER}/cog/tiles/${path}`;
    const url = new URL(titilerUrl);
    
    // Forward all query parameters from the original request
    searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
    
    // Make the request to the actual titiler service
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': request.headers.get('user-agent') || '',
        // Forward any other necessary headers if needed
      },
    });
    
    if (!response.ok) {
      console.error(`Tile request failed: ${response.status} ${response.statusText}`);
      
      // Try to get error details from the response
      let errorDetails = '';
      try {
        const errorText = await response.text();
        // Sanitize error details to remove any potential sensitive URLs
        const sanitizedError = errorText
          .replace(/https?:\/\/[^\s"']+/g, '[REDACTED_URL]')
          .replace(/GEOBASE_TITILER[^\s"']*/g, '[REDACTED_ENV_VAR]');
        errorDetails = sanitizedError.substring(0, 200); // Limit error message length
      } catch (e) {
        errorDetails = 'Could not read error response';
      }
      
      return NextResponse.json(
        { 
          error: 'Tile not found',
          details: errorDetails,
          status: response.status,
          statusText: response.statusText,
          cogUrl: searchParams.get('url')
        }, 
        { status: response.status }
      );
    }
    
    // Get the content type from the response
    const contentType = response.headers.get('content-type');
    const headers = new Headers();
    
    if (contentType) {
      headers.set('content-type', contentType);
    }
    
    // Set appropriate caching headers for tiles
    headers.set('cache-control', 'public, max-age=3600, s-maxage=86400');
    headers.set('access-control-allow-origin', '*');
    
    // Return the tile data with appropriate headers
    return new NextResponse(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    // Log the error for debugging but don't expose sensitive details
    console.error('Tile proxy error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
