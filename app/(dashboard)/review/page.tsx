'use client'
import { useMemo, useState } from 'react'
import { useData } from '@/lib/client/useData'
import type { ProblemDetail } from '@/lib/db/queries'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { STATUS_TEXT } from '@/lib/client/status'
import { formatChoices } from '@/lib/client/format'

function label(p: ProblemDetail) {
  return `${p.book} ${p.chapter > 0 ? `${p.chapter}장 ` : ''}${p.problemNumber}번`
}

export default function ReviewPage() {
  const { data, loading, error } = useData()
  const [onlyUnknown, setOnlyUnknown] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const problems = useMemo(() => {
    if (!data) return []
    return onlyUnknown
      ? data.problems.filter(p => p.explanations.some(e => e.understanding === '모름'))
      : data.problems
  }, [data, onlyUnknown])

  if (loading) return <p className="text-sm text-muted-foreground">불러오는 중…</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>

  const selected = problems.find(p => p.id === selectedId) ?? problems[0]

  return (
    <div className="flex gap-4">
      <div className="w-56 shrink-0 space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyUnknown} onChange={e => setOnlyUnknown(e.target.checked)} />
          모름만 보기
        </label>
        <div className="space-y-1">
          {problems.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className={`block w-full rounded-md px-2 py-1 text-left text-sm ${selected?.id === p.id ? 'bg-muted font-medium' : 'hover:bg-muted/50'}`}
            >
              {label(p)}
            </button>
          ))}
          {problems.length === 0 && <p className="px-2 text-sm text-muted-foreground">해당하는 문제가 없습니다.</p>}
        </div>
      </div>

      {selected && (
        <div className="grid flex-1 gap-4 lg:grid-cols-2">
          <Card className="space-y-3 p-4">
            <div className="flex items-center gap-2">
              <Badge>{label(selected)}</Badge>
              <Badge variant="secondary">{selected.syllabusArea}</Badge>
            </div>
            <div>
              <h3 className="text-sm font-medium">문제</h3>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{formatChoices(selected.problemText)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium">해설</h3>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{selected.solutionText}</p>
            </div>
          </Card>

          <div className="space-y-3">
            {selected.explanations.map((e, i) => (
              <Card key={i} className="space-y-2 p-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{e.speaker}</span>
                  <span className={STATUS_TEXT[e.understanding]}>{e.understanding}</span>
                  {e.isCorrect === true && <span className="text-xs text-emerald-700">정답</span>}
                  {e.isCorrect === false && <span className="text-xs text-red-700">오답</span>}
                  <span className="ml-auto text-xs text-muted-foreground">{e.sessionDate}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{e.transcript}</p>
                {e.conceptsMissed.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {e.conceptsMissed.map((c, j) => (
                      <Badge key={j} variant="outline" className="text-red-600">놓침: {c}</Badge>
                    ))}
                  </div>
                )}
                {e.feedback && <p className="rounded bg-muted/50 p-2 text-xs">{e.feedback}</p>}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
