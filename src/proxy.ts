import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Reads "Basic <base64 of username:password>". Anything else (another scheme,
// bad base64, no colon) returns null, so a malformed header gets the login
// prompt (401) instead of a crash (500). The password may contain colons.
function parseBasicAuth(header: string | null) {
  const match = header?.match(/^Basic +([A-Za-z0-9+/]+={0,2}) *$/i);
  if (!match) return null;
  let decoded: string;
  try {
    const bytes = Uint8Array.from(atob(match[1]), (c) => c.charCodeAt(0));
    decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
  const colon = decoded.indexOf(':');
  if (colon === -1) return null;
  return { username: decoded.slice(0, colon), password: decoded.slice(colon + 1) };
}

// Compares two strings in a time that doesn't depend on where they first
// differ, so response times can't be used to guess the password a character
// at a time. Hashing both first makes them the same length.
async function constantTimeEqual(a: string, b: string) {
  const encoder = new TextEncoder();
  const [hashA, hashB] = await Promise.all(
    [a, b].map((s) => crypto.subtle.digest('SHA-256', encoder.encode(s))),
  );
  const bytesA = new Uint8Array(hashA);
  const bytesB = new Uint8Array(hashB);
  let difference = 0;
  for (let i = 0; i < bytesA.length; i++) difference |= bytesA[i] ^ bytesB[i];
  return difference === 0;
}

export async function proxy(request: NextRequest) {
  // Bypass authentication in development mode
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  // Fail closed: with no login configured, nobody gets in. 503, not 401, so
  // the browser doesn't ask for a login that can never succeed.
  const expectedUser = process.env.BASIC_AUTH_USER;
  const expectedPassword = process.env.BASIC_AUTH_PASSWORD;
  if (!expectedUser || !expectedPassword) {
    console.error(
      '[proxy] BASIC_AUTH_USER and BASIC_AUTH_PASSWORD must both be set in production; refusing every request.',
    );
    return new NextResponse('Login is not set up on this server.', { status: 503 });
  }

  // Decodes the browser's credentials (username:password)
  const credentials = parseBasicAuth(request.headers.get('authorization'));

  if (credentials) {
    // Pulling credentials safely from environment variables. Both checks
    // always run, so a wrong username takes as long as a wrong password.
    const usernameMatches = await constantTimeEqual(credentials.username, expectedUser);
    const passwordMatches = await constantTimeEqual(credentials.password, expectedPassword);
    if (usernameMatches && passwordMatches) {
      return NextResponse.next();
    }
  }
    // If credentials are missing or wrong, prompt the browser for a login
  return new NextResponse('Authentication Required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  });
}

// Config ensures page routes and the /api routes stay behind the login while
// static files, images, and internal Next.js assets bypass it. The browser
// sends the same Basic credentials with the app's own fetch() calls, so the
// pages' /api requests keep working once someone has logged in. The image
// optimizer (_next/image) internally fetches the source file from public/, so
// public assets must be excluded here or that fetch gets 401'd and the
// optimized image fails with "internal response is invalid".
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:webp|svg|png|jpe?g|gif|avif|ico)$).*)',
  ],
};