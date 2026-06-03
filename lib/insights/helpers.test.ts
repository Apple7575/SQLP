import { describe, it, expect } from 'vitest'
import { uniqueSpeakers, uniqueConcepts, problemKey, byDateAsc } from './helpers'
import type { ExplanationRecord } from './types'

function rec(p: Partial<ExplanationRecord>): ExplanationRecord {
  return {
    sessionDate: '2026-06-01', book: 'A', problemNumber: 1, chapter: 0,
    syllabusArea: 'SQL 기본 및 활용', problemConcepts: [], speaker: '나',
    understanding: '애매', conceptsCovered: [], conceptsMissed: [], errors: [],
    feedback: '', transcript: '', ...p,
  }
}

describe('insight helpers', () => {
  it('lists unique sorted speakers', () => {
    expect(uniqueSpeakers([rec({ speaker: '민수' }), rec({ speaker: '나' }), rec({ speaker: '나' })]))
      .toEqual(['나', '민수'])
  })

  it('collects concepts from problem/covered/missed', () => {
    expect(uniqueConcepts([rec({ problemConcepts: ['a'], conceptsCovered: ['b'], conceptsMissed: ['c'] })]))
      .toEqual(['a', 'b', 'c'])
  })

  it('builds a stable problem key including book and chapter', () => {
    expect(problemKey({ book: 'A', chapter: 2, problemNumber: 5 })).toBe('A__2__5')
  })

  it('sorts records ascending by date', () => {
    const out = byDateAsc([rec({ sessionDate: '2026-06-05' }), rec({ sessionDate: '2026-06-01' })])
    expect(out[0].sessionDate).toBe('2026-06-01')
  })
})
