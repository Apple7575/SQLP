'use client'
import { useMemo, useState } from 'react'
import { useData } from '@/lib/client/useData'
import { computeWeaknessMap } from '@/lib/insights/weakness'
import { STATUS_BG, STATUS_TEXT } from '@/lib/client/status'
import { SYLLABUS_AREAS, UNCLASSIFIED } from '@/lib/types'
import type { ExplanationRecord, Status } from '@/lib/insights/types'
import type { ProblemDetail } from '@/lib/db/queries'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

const AREA_ORDER = [...SYLLABUS_AREAS, UNCLASSIFIED]
const STATUS_RANK: Record<Status, number> = { 모름: 3, 애매: 2, 잘함: 1, 미학습: 0 }

function CorrectMark({ v }: { v: boolean | null | undefined }) {
  if (v === true) return <span className="text-emerald-700">정답</span>
  if (v === false) return <span className="text-red-700">오답</span>
  return null
}

export default function WeaknessPage() {
  const { data, loading, error } = useData()
  if (loading) return <p className="text-sm text-muted-foreground">불러오는 중…</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!data || data.problems.length === 0)
    return <p className="text-sm text-muted-foreground">아직 데이터가 없습니다. 세션을 업로드하세요.</p>

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">약점 분석</h1>
      <Tabs defaultValue="subject">
        <TabsList>
          <TabsTrigger value="subject">과목별 문제</TabsTrigger>
          <TabsTrigger value="concept">개념 히트맵</TabsTrigger>
        </TabsList>
        <TabsContent value="subject">
          <SubjectView problems={data.problems} />
        </TabsContent>
        <TabsContent value="concept">
          <ConceptHeatmap records={data.records} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SubjectView({ problems }: { problems: ProblemDetail[] }) {
  const byArea = AREA_ORDER
    .map(area => ({
      area,
      list: problems
        .filter(p => p.syllabusArea === area)
        .sort((a, b) => a.chapter - b.chapter || a.problemNumber - b.problemNumber),
    }))
    .filter(g => g.list.length > 0)

  return (
    <div className="space-y-4 pt-3">
      {byArea.map(({ area, list }) => {
        const answered = list.flatMap(p => p.explanations).filter(e => e.isCorrect != null)
        const correct = answered.filter(e => e.isCorrect === true).length
        return (
          <Card key={area} className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <h2 className="font-medium">{area}</h2>
              <span className="text-xs text-muted-foreground">
                {list.length}문제
                {answered.length > 0 ? ` · 정답률 ${Math.round((correct / answered.length) * 100)}% (${correct}/${answered.length})` : ''}
              </span>
            </div>
            <div className="divide-y">
              {list.map(p => (
                <div key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                  <span className="w-14 shrink-0 font-medium">
                    {p.chapter > 0 ? `${p.chapter}장 ` : ''}{p.problemNumber}번
                  </span>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{p.problemText}</span>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {p.explanations.map((e, i) => (
                      <span key={i} className="flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-xs">
                        <span className="font-medium">{e.speaker}</span>
                        <span className={STATUS_TEXT[e.understanding]}>{e.understanding}</span>
                        <CorrectMark v={e.isCorrect} />
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

function ConceptHeatmap({ records }: { records: ExplanationRecord[] }) {
  const [area, setArea] = useState('전체')
  const [speaker, setSpeaker] = useState('전체')
  const [selected, setSelected] = useState<{ speaker: string; concept: string } | null>(null)
  const map = useMemo(() => computeWeaknessMap(records), [records])

  const speakerOptions = ['전체', ...map.speakers]
  const shownSpeakers = speaker === '전체' ? map.speakers : map.speakers.filter(s => s === speaker)
  const AREAS = ['전체', ...SYLLABUS_AREAS, UNCLASSIFIED]

  const statusOf = (s: string, c: string): Status =>
    map.cells.find(x => x.speaker === s && x.concept === c)!.status

  const concepts = useMemo(() => {
    let cs = map.concepts
    if (area !== '전체') cs = cs.filter(c => map.cells.some(x => x.concept === c && x.syllabusArea === area))
    cs = cs.filter(c => shownSpeakers.some(s => statusOf(s, c) !== '미학습'))
    const score = (c: string) => shownSpeakers.reduce((acc, s) => acc + STATUS_RANK[statusOf(s, c)], 0)
    return [...cs].sort((a, b) => score(b) - score(a) || (a < b ? -1 : 1))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, area, speaker])

  const drill = selected
    ? records.filter(
        r =>
          r.speaker === selected.speaker &&
          (r.problemConcepts.includes(selected.concept) ||
            r.conceptsCovered.includes(selected.concept) ||
            r.conceptsMissed.includes(selected.concept)),
      )
    : []

  if (map.concepts.length === 0) return <p className="pt-3 text-sm text-muted-foreground">개념 데이터가 없습니다.</p>

  return (
    <div className="space-y-3 pt-3">
      <p className="text-xs text-muted-foreground">
        모름이 많은 개념부터 정렬했고, 아무도 안 다룬 개념은 숨겼어요. 개념 줄이 너무 많으면 데이터 준비 시 개념을 짧은 태그로 뽑아주세요.
      </p>
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 w-8 text-xs text-muted-foreground">과목</span>
          {AREAS.map(a => (
            <Badge key={a} variant={a === area ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setArea(a)}>{a}</Badge>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 w-8 text-xs text-muted-foreground">사람</span>
          {speakerOptions.map(s => (
            <Badge key={s} variant={s === speaker ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setSpeaker(s)}>{s}</Badge>
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
              <th className="w-48" />
              {shownSpeakers.map(s => <th key={s} className="px-2 text-sm font-medium">{s}</th>)}
            </tr>
          </thead>
          <tbody>
            {concepts.map(concept => (
              <tr key={concept}>
                <td className="max-w-[12rem] truncate pr-2 text-right text-sm text-muted-foreground" title={concept}>{concept}</td>
                {shownSpeakers.map(s => {
                  const status = statusOf(s, concept)
                  const isSel = selected?.speaker === s && selected?.concept === concept
                  return (
                    <td key={s}>
                      <button
                        title={`${s} · ${concept}: ${status}`}
                        onClick={() => setSelected(isSel ? null : { speaker: s, concept })}
                        className={`h-7 w-16 rounded ${STATUS_BG[status]} ${isSel ? 'ring-2 ring-foreground ring-offset-1' : ''}`}
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
            <h3 className="text-sm font-medium">{selected.speaker} · {selected.concept} — 관련 문제 {drill.length}개</h3>
            <button className="text-xs text-muted-foreground underline" onClick={() => setSelected(null)}>닫기</button>
          </div>
          <ul className="space-y-1">
            {drill.map((r, i) => (
              <li key={i} className="text-sm">
                {r.chapter > 0 ? `${r.chapter}장 ` : ''}{r.problemNumber}번 · <span className={STATUS_TEXT[r.understanding]}>{r.understanding}</span> · {r.sessionDate}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
