import { NextResponse } from 'next/server';
import { COOKIE_SESSIO } from '@/lib/constants';

// Només comprova que hi hagi sessió; que l'usuari sigui admin ho validen la pàgina i cada acció
export function proxy(req) {
  if (!req.cookies.has(COOKIE_SESSIO)) {
    return NextResponse.redirect(new URL('/', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
