import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { AUTH_COOKIE, computeToken } from '@/lib/auth'

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value
  const expected = await computeToken(process.env.AUTH_SECRET ?? '')
  if (token !== expected) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!login|api/login|_next/static|_next/image|favicon.ico).*)'],
}
