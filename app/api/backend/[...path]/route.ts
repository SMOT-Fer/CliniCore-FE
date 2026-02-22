import { NextRequest } from 'next/server';

const BACKEND_BASE_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production' ? '' : 'https://saas-be-t4rh.onrender.com');

function adaptSetCookie(cookieValue: string) {
  if (process.env.NODE_ENV === 'production') {
    return cookieValue;
  }

  return cookieValue.replace(/;\s*Secure/gi, '');
}

async function proxyRequest(request: NextRequest, path: string[]) {
  if (!BACKEND_BASE_URL) {
    return new Response(
      JSON.stringify({
        error: 'Missing backend URL. Set BACKEND_API_URL (recommended) or NEXT_PUBLIC_API_URL.'
      }),
      {
        status: 500,
        headers: { 'content-type': 'application/json' }
      }
    );
  }

  const targetUrl = `${BACKEND_BASE_URL}/api/${path.join('/')}${request.nextUrl.search}`;
  const requestHeaders = new Headers();

  const contentType = request.headers.get('content-type');
  const cookie = request.headers.get('cookie');
  const csrfHeader = request.headers.get('x-csrf-token');
  const authorization = request.headers.get('authorization');

  if (contentType) requestHeaders.set('content-type', contentType);
  if (cookie) requestHeaders.set('cookie', cookie);
  if (csrfHeader) requestHeaders.set('x-csrf-token', csrfHeader);
  if (authorization) requestHeaders.set('authorization', authorization);

  const method = request.method.toUpperCase();
  const hasBody = !['GET', 'HEAD'].includes(method);
  const body = hasBody ? await request.text() : undefined;

  const upstreamResponse = await fetch(targetUrl, {
    method,
    headers: requestHeaders,
    body: hasBody ? body : undefined,
    cache: 'no-store'
  });

  const responseHeaders = new Headers();
  const responseContentType = upstreamResponse.headers.get('content-type');
  if (responseContentType) {
    responseHeaders.set('content-type', responseContentType);
  }

  const setCookieValues = (upstreamResponse.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() || [];
  for (const setCookie of setCookieValues) {
    responseHeaders.append('set-cookie', adaptSetCookie(setCookie));
  }

  const responseBody = await upstreamResponse.arrayBuffer();

  return new Response(responseBody, {
    status: upstreamResponse.status,
    headers: responseHeaders
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}
