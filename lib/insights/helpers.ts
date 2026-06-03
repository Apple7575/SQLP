import type { ExplanationRecord } from './types'

export function uniqueSpeakers(records: ExplanationRecord[]): string[] {
  return [...new Set(records.map(r => r.speaker))].sort()
}

export function uniqueConcepts(records: ExplanationRecord[]): string[] {
  const s = new Set<string>()
  for (const r of records) {
    r.problemConcepts.forEach(c => s.add(c))
    r.conceptsCovered.forEach(c => s.add(c))
    r.conceptsMissed.forEach(c => s.add(c))
  }
  return [...s].sort()
}

export function problemKey(r: { book: string; chapter: number; problemNumber: number }): string {
  return `${r.book}__${r.chapter}__${r.problemNumber}`
}

export function byDateAsc(records: ExplanationRecord[]): ExplanationRecord[] {
  return [...records].sort((a, b) =>
    a.sessionDate < b.sessionDate ? -1 : a.sessionDate > b.sessionDate ? 1 : 0,
  )
}
