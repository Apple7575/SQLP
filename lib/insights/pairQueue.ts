import type { ExplanationRecord } from './types'
import type { Understanding } from '@/lib/types'
import { byDateAsc, problemKey, uniqueConcepts } from './helpers'

export interface RelatedProblem {
  book: string
  chapter: number
  problemNumber: number
}

export interface PairQueueItem {
  concept: string
  kind: 'teach' | 'both_unknown'
  teacher: string | null
  learner: string | null
  relatedProblems: RelatedProblem[]
}

export function computePairQueue(records: ExplanationRecord[]): PairQueueItem[] {
  const concepts = uniqueConcepts(records)
  const speakers = [...new Set(records.map(r => r.speaker))].sort()

  const latest = new Map<string, Understanding>()
  for (const r of byDateAsc(records)) {
    for (const c of r.conceptsCovered) latest.set(`${r.speaker}::${c}`, r.understanding)
    for (const c of r.conceptsMissed) latest.set(`${r.speaker}::${c}`, '모름')
  }

  const related = new Map<string, Map<string, RelatedProblem>>()
  for (const r of records) {
    const cs = new Set([...r.problemConcepts, ...r.conceptsCovered, ...r.conceptsMissed])
    for (const c of cs) {
      if (!related.has(c)) related.set(c, new Map())
      related.get(c)!.set(problemKey(r), { book: r.book, chapter: r.chapter, problemNumber: r.problemNumber })
    }
  }

  const items: PairQueueItem[] = []
  for (const concept of concepts) {
    const statuses = speakers
      .map(s => ({ speaker: s, status: latest.get(`${s}::${concept}`) }))
      .filter((x): x is { speaker: string; status: Understanding } => x.status !== undefined)
    if (statuses.length === 0) continue

    const teachers = statuses.filter(s => s.status === '잘함')
    const learners = statuses.filter(s => s.status === '모름')
    const relatedProblems = [...(related.get(concept)?.values() ?? [])]

    if (teachers.length > 0 && learners.length > 0) {
      items.push({ concept, kind: 'teach', teacher: teachers[0].speaker, learner: learners[0].speaker, relatedProblems })
    } else if (teachers.length === 0 && learners.length > 0) {
      items.push({ concept, kind: 'both_unknown', teacher: null, learner: null, relatedProblems })
    }
  }
  return items
}
