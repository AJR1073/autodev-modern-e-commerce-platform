import { NextRequest, NextResponse } from 'next/server';

const ADMIN_PREFIX = '/admin';
const ADMIN_LOGIN_PATH = '/account';
const AUTH_COOKIE_NAMES = ['session', 'auth-token', 'token', 'admin-session'];

function isProtectedAdminPath(pathname: string) {
  return pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`);
}

function hasAuthCookie(request: NextRequest) {
  return AUTH_COOKIE_NAMES.some((name) => {
    const value = request.cookies.get(name)?.value;
    return Boolean(value && value.trim());
  });
}

function isApiRequest(pathname: string) {
  return pathname.startsWith('/api/');
}

function isPublicAsset(pathname: string) {
  return (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/icons/') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  );
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublicAsset(pathname) || isApiRequest(pathname)) {
    return NextResponse.next();
  }

  if (isProtectedAdminPath(pathname) && !hasAuthCookie(request)) {
    const loginUrl = new URL(ADMIN_LOGIN_PATH, request.url);
    const redirectTo = `${pathname}${search || ''}`;

    loginUrl.searchParams.set('redirect', redirectTo);
    loginUrl.searchParams.set('reason', 'auth_required');

    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();

  response.headers.set('x-pathname', pathname);
  response.headers.set('x-middleware-cache', 'no-cache');

  return response;
}

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)'],
};