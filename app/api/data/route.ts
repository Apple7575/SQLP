import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getAllRecords, getProblemsWithExplanations } from '@/lib/db/queries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const db = getDb()
  const [records, problems] = await Promise.all([getAllRecords(db), getProblemsWithExplanations(db)])
  return NextResponse.json({ records, problems })
}
