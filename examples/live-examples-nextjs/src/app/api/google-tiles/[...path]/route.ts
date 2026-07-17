import { NextRequest, NextResponse } from 'next/server';

function getGoogleMapsApiKey(): string | undefined {
  return (
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    undefined
  );
}

/**
 * Proxy Google Map Tiles API so the browser never needs a referrer-restricted
 * (or public) API key. Map Tiles is a web service — use a server-side key with
 * no HTTP-referrer restriction (IP or unrestricted).
 *
 * Paths mirror Google:
 * - POST /api/google-tiles/v1/createSession
 * - GET  /api/google-tiles/v1/2dtiles/{z}/{x}/{y}?session=...
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const key = getGoogleMapsApiKey();
  if (!key) {
    return NextResponse.json(
      {
        error:
          'GOOGLE_MAPS_API_KEY (or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) is not configured',
      },
      { status: 500 }
    );
  }

  const resolved = await params;
  const path = resolved.path.join('/');
  if (path !== 'v1/createSession') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const upstream = await fetch(
    `https://tile.googleapis.com/v1/createSession?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const key = getGoogleMapsApiKey();
  if (!key) {
    return NextResponse.json(
      {
        error:
          'GOOGLE_MAPS_API_KEY (or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) is not configured',
      },
      { status: 500 }
    );
  }

  const resolved = await params;
  const path = resolved.path.join('/');
  const match = path.match(/^v1\/2dtiles\/(\d+)\/(\d+)\/(\d+)$/);
  if (!match) {
    return NextResponse.json({ error: 'Invalid tile path' }, { status: 400 });
  }

  const [, z, x, y] = match;
  const session = request.nextUrl.searchParams.get('session');
  if (!session) {
    return NextResponse.json({ error: 'Missing session' }, { status: 400 });
  }

  const upstreamUrl =
    `https://tile.googleapis.com/v1/2dtiles/${z}/${x}/${y}` +
    `?session=${encodeURIComponent(session)}` +
    `&key=${encodeURIComponent(key)}`;

  const upstream = await fetch(upstreamUrl);
  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => '');
    return NextResponse.json(
      {
        error: 'Google tile request failed',
        status: upstream.status,
        details: errText.slice(0, 300),
      },
      { status: upstream.status }
    );
  }

  const headers = new Headers();
  const contentType = upstream.headers.get('content-type');
  if (contentType) {
    headers.set('Content-Type', contentType);
  }
  headers.set('Cache-Control', 'public, max-age=3600');

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  });
}
