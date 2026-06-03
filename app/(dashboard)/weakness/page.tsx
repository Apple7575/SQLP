'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useData } from '@/lib/client/useData'
import { computeWeaknessMap } from '@/lib/insights/weakness'
import { STATUS_BG, STATUS_TEXT } from '@/lib/client/status'
import { SYLLABUS_AREAS, UNCLASSIFIED } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

const AREAS = ['전체', ...SYLLABUS_AREAS, UNCLASSIFIED]

export default function WeaknessPage() {
  const { data, loading, error } = useData()
  const [area, setArea] = useState('전체')
  const [speaker, setSpeaker] = useState('전체')
  const [selected, setSelected] = useState<{ speaker: string; concept: string } | null>(null)

  const map = useMemo(() => (data ? computeWeaknessMap(data.records) : null), [data])

  if (loading) return <p className="text-sm text-muted-foreground">불러오는 중…</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!map || map.concepts.length === 0)
    return <p className="text-sm text-muted-foreground">아직 데이터가 없습니다. 세션을 업로드하세요.</p>

  const speakerOptions = ['전체', ...map.speakers]
  const shownSpeakers = speaker === '전체' ? map.speakers : map.speakers.filter(s => s === speaker)
  const concepts =
    area === '전체'
      ? map.concepts
      : map.concepts.filter(c => map.cells.some(x => x.concept === c && x.syllabusArea === area))

  const drill =
    selected && data
      ? data.records.filter(
          r =>
            r.speaker === selected.speaker &&
            (r.problemConcepts.includes(selected.concept) ||
              r.conceptsCovered.includes(selected.concept) ||
              r.conceptsMissed.includes(selected.concept)),
        )
      : []

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">약점 히트맵</h1>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 w-8 text-xs text-muted-foreground">과목</span>
          {AREAS.map(a => (
            <Badge key={a} variant={a === area ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setArea(a)}>
              {a}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 w-8 text-xs text-muted-foreground">사람</span>
          {speakerOptions.map(s => (
            <Badge key={s} variant={s === speaker ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setSpeaker(s)}>
              {s}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-emerald-500" />잘함</span>
        <span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-amber-400" />애매</span>
        <span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-red-500" />모름</span>
        <span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-muted" />미학습</span>
      </div>

      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="w-40" />
              {shownSpeakers.map(s => (
                <th key={s} className="px-2 text-sm font-medium">{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {concepts.map(concept => (
              <tr key={concept}>
                <td className="pr-2 text-right text-sm text-muted-foreground">{concept}</td>
                {shownSpeakers.map(s => {
                  const cell = map.cells.find(x => x.speaker === s && x.concept === concept)!
                  const isSel = selected?.speaker === s && selected?.concept === concept
                  return (
                    <td key={s}>
                      <button
                        title={`${s} · ${concept}: ${cell.status} (클릭: 관련 문제 보기)`}
                        onClick={() => setSelected(isSel ? null : { speaker: s, concept })}
                        className={`h-7 w-16 rounded ${STATUS_BG[cell.status]} ${isSel ? 'ring-2 ring-foreground ring-offset-1' : ''}`}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <Card className="space-y-2 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">
              {selected.speaker} · {selected.concept} — 관련 문제 {drill.length}개
            </h2>
            <button className="text-xs text-muted-foreground underline" onClick={() => setSelected(null)}>닫기</button>
          </div>
          {drill.length === 0 ? (
            <p className="text-sm text-muted-foreground">이 개념이 나온 문제가 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {drill.map((r, i) => (
                <li key={i} className="rounded-md border p-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {r.book} {r.chapter > 0 ? `${r.chapter}장 ` : ''}{r.problemNumber}번
                    </span>
                    <span className={STATUS_TEXT[r.understanding]}>{r.understanding}</span>
                    <span className="text-xs text-muted-foreground">{r.sessionDate}</span>
                  </div>
                  {r.feedback && <p className="mt-1 text-xs text-muted-foreground">{r.feedback}</p>}
                </li>
              ))}
            </ul>
          )}
          <Link href="/review" className="text-xs underline">문제 복습에서 보기 →</Link>
        </Card>
      )}
    </div>
  )
}
