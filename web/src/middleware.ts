import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

/**
 * Guard rute (Nicho-Brain D7). Pengecekan OPTIMISTIC berbasis keberadaan cookie session
 * (cepat, tanpa hit DB di edge). Validasi sebenarnya tetap di server (requireAuth) tiap
 * Route Handler / Server Component — render-gating ≠ keamanan.
 */
export function middleware(req: NextRequest) {
  const sessionCookie = getSessionCookie(req);
  const isLoginPage = req.nextUrl.pathname === '/login';

  // Belum login & bukan halaman login → tendang ke /login.
  if (!sessionCookie && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  // Sudah login tapi buka /login → arahkan ke beranda.
  if (sessionCookie && isLoginPage) {
    return NextResponse.redirect(new URL('/', req.url));
  }
  return NextResponse.next();
}

// Lindungi semua rute kecuali API, aset Next, dan file statis.
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

