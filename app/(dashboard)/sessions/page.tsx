'use client'
import { useMemo, useState } from 'react'
import { useData } from '@/lib/client/useData'
import type { ExplanationRecord } from '@/lib/insights/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { STATUS_TEXT } from '@/lib/client/status'

interface PerSpeaker { speaker: string; understanding: string; isCorrect: boolean | null }
interface ProblemRow { key: string; label: string; area: string; perSpeaker: PerSpeaker[] }
interface SessionGroup {
  id: string
  date: string
  book: string
  problems: ProblemRow[]
  bySpeaker: { speaker: string; 잘함: number; 애매: number; 모름: number }[]
}

function groupSessions(records: ExplanationRecord[]): SessionGroup[] {
  const byKey = new Map<string, ExplanationRecord[]>()
  for (const r of records) {
    const k = `${r.sessionDate}__${r.book}`
    if (!byKey.has(k)) byKey.set(k, [])
    byKey.get(k)!.push(r)
  }
  return [...byKey.entries()]
    .map(([k, rs]) => {
      const [date, book] = k.split('__')
      const speakers = [...new Set(rs.map(r => r.speaker))].sort()
      const probMap = new Map<string, ProblemRow>()
      for (const r of rs) {
        const pk = `${r.chapter}-${r.problemNumber}`
        if (!probMap.has(pk)) {
          probMap.set(pk, {
            key: pk,
            label: `${r.chapter > 0 ? `${r.chapter}장 ` : ''}${r.problemNumber}번`,
            area: r.syllabusArea,
            perSpeaker: [],
          })
        }
        probMap.get(pk)!.perSpeaker.push({ speaker: r.speaker, understanding: r.understanding, isCorrect: r.isCorrect ?? null })
      }
      const bySpeaker = speakers.map(s => {
        const m = rs.filter(r => r.speaker === s)
        return {
          speaker: s,
          잘함: m.filter(r => r.understanding === '잘함').length,
          애매: m.filter(r => r.understanding === '애매').length,
          모름: m.filter(r => r.understanding === '모름').length,
        }
      })
      return { id: k, date, book, problems: [...probMap.values()], bySpeaker }
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

function Mark({ v }: { v: boolean | null }) {
  if (v === true) return <span className="text-emerald-700">정답</span>
  if (v === false) return <span className="text-red-700">오답</span>
  return null
}

export default function SessionsPage() {
  const { data, loading, error } = useData()
  const [open, setOpen] = useState<string | null>(null)
  const groups = useMemo(() => (data ? groupSessions(data.records) : []), [data])

  if (loading) return <p className="text-sm text-muted-foreground">불러오는 중…</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (groups.length === 0) return <p className="text-sm text-muted-foreground">아직 세션이 없습니다.</p>

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">세션 타임라인</h1>
      <p className="text-xs text-muted-foreground">세션을 클릭하면 그날 푼 문제와 사람별 이해도·정답 여부가 펼쳐집니다.</p>
      <div className="space-y-2">
        {groups.map(g => {
          const isOpen = open === g.id
          return (
            <Card key={g.id} className="overflow-hidden">
              <button onClick={() => setOpen(isOpen ? null : g.id)} className="flex w-full flex-wrap items-center gap-3 p-4 text-left hover:bg-muted/30">
                <span className="text-xs text-muted-foreground">{isOpen ? '▼' : '▶'}</span>
                <Badge>{g.date}</Badge>
                <Badge variant="secondary">{g.book}</Badge>
                <span className="text-sm text-muted-foreground">문제 {g.problems.length}개</span>
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
              </button>
              {isOpen && (
                <div className="border-t px-4 pb-3">
                  <div className="divide-y">
                    {g.problems.map(p => (
                      <div key={p.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                        <span className="w-14 shrink-0 font-medium">{p.label}</span>
                        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{p.area}</span>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          {p.perSpeaker.map((s, i) => (
                            <span key={i} className="flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-xs">
                              <span className="font-medium">{s.speaker}</span>
                              <span className={STATUS_TEXT[s.understanding as keyof typeof STATUS_TEXT]}>{s.understanding}</span>
                              <Mark v={s.isCorrect} />
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
