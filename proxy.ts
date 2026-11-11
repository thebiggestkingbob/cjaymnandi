import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { shouldShowCountdown, launchLabel } from './lib/launch/schedule';

export function proxy(request: NextRequest) {
  // Vercel's preview domains keep the main experience available for review.
  if (!shouldShowCountdown(request.headers.get('host') || request.nextUrl.host)) return NextResponse.next();
  const path = request.nextUrl.pathname;
  if (['/confirm','/unsubscribe','/api/subscription/confirm','/api/subscription/unsubscribe','/api/email/events','/api/email/dispatch'].includes(path))return NextResponse.next();
  if (path === '/privacy' || path.startsWith('/media/') || path === '/sunflower-cursor.svg' || path.startsWith('/_next/') || path === '/favicon.ico') return NextResponse.next();
  if (path.startsWith('/api/')) {
    return NextResponse.json({ message: `The experience opens ${launchLabel}.` }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  const url = request.nextUrl.clone(); url.pathname = '/countdown'; url.search = '';
  const response = NextResponse.rewrite(url);
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image).*)'] };
