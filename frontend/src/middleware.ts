import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Obsługa starych URL-i ofert (tylko ID)
  // Przykład: /offers/123 -> przekieruj na /offers/123/[nazwa]
  // Ale nie przekierowuj jeśli URL już zawiera nazwę
  if (pathname.match(/^\/offers\/[^\/]+$/) && !pathname.includes('/edit')) {
    // To jest stary format URL - pozwól mu działać, przekierowanie nastąpi w komponencie
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
