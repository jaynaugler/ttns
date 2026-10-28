import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Bypass authentication in development mode
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  const authorization = request.headers.get('authorization');

  if (authorization) {
    const [, token] = authorization.split(' ');
    // Decodes the browser's credentials (username:password)
    const [username, password] = atob(token).split(':');

    // Pulling credentials safely from environment variables
    if (
      username === process.env.BASIC_AUTH_USER && 
      password === process.env.BASIC_AUTH_PASSWORD
    ) {
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

// Config ensures static files, images, and internal Next.js assets bypass the login
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};