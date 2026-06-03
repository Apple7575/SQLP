import { NextResponse } from 'next/server'
import { validate } from '@/lib/ingest/validate'
import { getDb } from '@/lib/db'
import { ingestSession } from '@/lib/db/queries'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON 파싱 실패: 올바른 JSON이 아닙니다.' }, { status: 400 })
  }

  const result = validate(raw)
  if (!result.ok || !result.session) {
    return NextResponse.json({ error: result.fatalError ?? '검증 실패' }, { status: 400 })
  }
  if (result.session.problems.length === 0) {
    return NextResponse.json({ error: '저장할 수 있는 문제가 없습니다.', warnings: result.warnings }, { status: 400 })
  }

  await ingestSession(getDb(), result.session)
  return NextResponse.json({
    ok: true,
    problemCount: result.problemCount,
    explanationCount: result.explanationCount,
    warnings: result.warnings,
  })
}
