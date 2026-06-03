'use client'
import { useMemo } from 'react'
import { useData } from '@/lib/client/useData'
import { computePairQueue, type PairQueueItem } from '@/lib/insights/pairQueue'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

function problemLabel(p: { book: string; chapter: number; problemNumber: number }) {
  return `${p.book} ${p.chapter > 0 ? `${p.chapter}장 ` : ''}${p.problemNumber}번`
}

function Section({ title, hint, items }: { title: string; hint: string; items: PairQueueItem[] }) {
  return (
    <Card className="space-y-3 p-4">
      <div>
        <h2 className="font-medium">{title}</h2>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">없음 🎉</p> : (
        <ul className="space-y-2">
          {items.map(i => (
            <li key={i.concept} className="rounded-md border p-2 text-sm">
              <div className="font-medium">{i.concept}</div>
              {i.kind === 'teach' && <div className="text-xs text-muted-foreground">{i.teacher} → {i.learner} 가르치기</div>}
              <div className="mt-1 flex flex-wrap gap-1">
                {i.relatedProblems.map((p, idx) => <Badge key={idx} variant="outline">{problemLabel(p)}</Badge>)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export default function PairQueuePage() {
  const { data, loading, error } = useData()
  const queue = useMemo(() => (data ? computePairQueue(data.records) : []), [data])

  if (loading) return <p className="text-sm text-muted-foreground">불러오는 중…</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>

  const teach = queue.filter(i => i.kind === 'teach')
  const both = queue.filter(i => i.kind === 'both_unknown')
  const speakers = [...new Set(data!.records.map(r => r.speaker))]

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">페어 학습 큐</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {speakers.map(s => (
          <Section key={s} title={`${s}가 가르치기`} hint={`${s}는 잘함, 상대는 모름`} items={teach.filter(i => i.teacher === s)} />
        ))}
        <Section title="🔴 둘 다 모름" hint="PDF 다시 읽어야 할 개념" items={both} />
      </div>
    </div>
  )
}
