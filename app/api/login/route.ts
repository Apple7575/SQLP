import { NextResponse } from 'next/server'
import { AUTH_COOKIE, computeToken } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string }
  if (!password || password !== process.env.SHARED_PASSWORD) {
    return NextResponse.json({ error: '비밀번호가 틀렸습니다.' }, { status: 401 })
  }
  const token = await computeToken(process.env.AUTH_SECRET ?? '')
  const res = NextResponse.json({ ok: true })
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
