'use client'
import { useMemo } from 'react'
import { useData } from '@/lib/client/useData'
import type { ExplanationRecord } from '@/lib/insights/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { STATUS_TEXT } from '@/lib/client/status'

interface SessionGroup {
  date: string
  book: string
  problemCount: number
  bySpeaker: { speaker: string; 잘함: number; 애매: number; 모름: number }[]
}

function groupSessions(records: ExplanationRecord[]): SessionGroup[] {
  const byDate = new Map<string, ExplanationRecord[]>()
  for (const r of records) {
    const key = `${r.sessionDate}__${r.book}`
    if (!byDate.has(key)) byDate.set(key, [])
    byDate.get(key)!.push(r)
  }
  return [...byDate.entries()]
    .map(([key, rs]) => {
      const [date, book] = key.split('__')
      const speakers = [...new Set(rs.map(r => r.speaker))].sort()
      const problemCount = new Set(rs.map(r => `${r.chapter}-${r.problemNumber}`)).size
      const bySpeaker = speakers.map(s => {
        const mine = rs.filter(r => r.speaker === s)
        return {
          speaker: s,
          잘함: mine.filter(r => r.understanding === '잘함').length,
          애매: mine.filter(r => r.understanding === '애매').length,
          모름: mine.filter(r => r.understanding === '모름').length,
        }
      })
      return { date, book, problemCount, bySpeaker }
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

export default function SessionsPage() {
  const { data, loading, error } = useData()
  const groups = useMemo(() => (data ? groupSessions(data.records) : []), [data])

  if (loading) return <p className="text-sm text-muted-foreground">불러오는 중…</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (groups.length === 0) return <p className="text-sm text-muted-foreground">아직 세션이 없습니다.</p>

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">세션 타임라인</h1>
      <div className="space-y-2">
        {groups.map(g => (
          <Card key={`${g.date}-${g.book}`} className="flex flex-wrap items-center gap-3 p-4">
            <Badge>{g.date}</Badge>
            <Badge variant="secondary">{g.book}</Badge>
            <span className="text-sm text-muted-foreground">문제 {g.problemCount}개</span>
            <div className="ml-auto flex flex-wrap gap-3 text-sm">
              {g.bySpeaker.map(s => (
                <span key={s.speaker}>
                  <span className="font-medium">{s.speaker}</span>{' '}
                  <span className={STATUS_TEXT.잘함}>{s.잘함}</span>/
                  <span className={STATUS_TEXT.애매}>{s.애매}</span>/
                  <span className={STATUS_TEXT.모름}>{s.모름}</span>
                </span>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
