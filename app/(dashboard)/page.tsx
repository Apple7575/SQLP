'use client'
import Link from 'next/link'
import { useMemo } from 'react'
import { useData } from '@/lib/client/useData'
import { computeSyllabusProgress } from '@/lib/insights/syllabus'
import { computePairQueue } from '@/lib/insights/pairQueue'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function HomePage() {
  const { data, loading, error } = useData()
  const progress = useMemo(() => (data ? computeSyllabusProgress(data.records) : []), [data])
  const queueCount = useMemo(() => (data ? computePairQueue(data.records).length : 0), [data])

  if (loading) return <p className="text-sm text-muted-foreground">불러오는 중…</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!data || data.records.length === 0) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">홈</h1>
        <p className="text-sm text-muted-foreground">아직 데이터가 없습니다. <Link href="/upload" className="underline">세션 업로드</Link>로 시작하세요.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">홈</h1>

      <Link href="/pair-queue">
        <Card className="flex items-center justify-between p-4 hover:bg-muted/40">
          <span className="text-sm">오늘의 페어 학습 큐</span>
          <Badge>{queueCount}개</Badge>
        </Card>
      </Link>

      <div className="grid gap-4 md:grid-cols-3">
        {progress.map(area => (
          <Card key={area.area} className="space-y-3 p-4">
            <h2 className="text-sm font-medium">{area.area}</h2>
            {area.bySpeaker.map(s => (
              <div key={s.speaker} className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{s.speaker}</span><span>{s.masteredPct}% ({s.잘함}/{s.total})</span>
                </div>
                <div className="h-2 w-full rounded bg-muted">
                  <div className="h-2 rounded bg-emerald-500" style={{ width: `${s.masteredPct}%` }} />
                </div>
              </div>
            ))}
          </Card>
        ))}
      </div>
    </div>
  )
}
