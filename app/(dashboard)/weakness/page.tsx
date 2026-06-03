'use client'
import { useMemo, useState } from 'react'
import { useData } from '@/lib/client/useData'
import { computeWeaknessMap } from '@/lib/insights/weakness'
import { STATUS_BG } from '@/lib/client/status'
import { SYLLABUS_AREAS, UNCLASSIFIED } from '@/lib/types'
import { Badge } from '@/components/ui/badge'

const AREAS = ['전체', ...SYLLABUS_AREAS, UNCLASSIFIED]

export default function WeaknessPage() {
  const { data, loading, error } = useData()
  const [area, setArea] = useState('전체')

  const map = useMemo(() => (data ? computeWeaknessMap(data.records) : null), [data])

  if (loading) return <p className="text-sm text-muted-foreground">불러오는 중…</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!map || map.concepts.length === 0) return <p className="text-sm text-muted-foreground">아직 데이터가 없습니다. 세션을 업로드하세요.</p>

  const concepts = area === '전체'
    ? map.concepts
    : map.concepts.filter(c => map.cells.some(x => x.concept === c && x.syllabusArea === area))

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">약점 히트맵</h1>
      <div className="flex flex-wrap gap-1">
        {AREAS.map(a => (
          <Badge key={a} variant={a === area ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setArea(a)}>{a}</Badge>
        ))}
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
              {map.speakers.map(s => <th key={s} className="px-2 text-sm font-medium">{s}</th>)}
            </tr>
          </thead>
          <tbody>
            {concepts.map(concept => (
              <tr key={concept}>
                <td className="pr-2 text-right text-sm text-muted-foreground">{concept}</td>
                {map.speakers.map(s => {
                  const cell = map.cells.find(x => x.speaker === s && x.concept === concept)!
                  return <td key={s} title={`${s} · ${concept}: ${cell.status}`} className={`h-7 w-16 rounded ${STATUS_BG[cell.status]}`} />
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
