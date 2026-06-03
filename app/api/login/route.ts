import { NextResponse } from 'next/server'
import { AUTH_COOKIE, computeToken } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    return NextResponse.json({ error: '서버 설정 오류: AUTH_SECRET 미설정' }, { status: 500 })
  }
  const { password } = (await req.json().catch(() => ({}))) as { password?: string }
  if (!password || password !== process.env.SHARED_PASSWORD) {
    return NextResponse.json({ error: '비밀번호가 틀렸습니다.' }, { status: 401 })
  }
  const token = await computeToken(secret)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === 'production',
  })
  return res
}
