import { describe, it, expect } from 'vitest'
import { computePairQueue } from './pairQueue'
import type { ExplanationRecord } from './types'

function rec(p: Partial<ExplanationRecord>): ExplanationRecord {
  return {
    sessionDate: '2026-06-01', book: 'A', problemNumber: 1, chapter: 0,
    syllabusArea: 'SQL 기본 및 활용', problemConcepts: [], speaker: '나',
    understanding: '애매', conceptsCovered: [], conceptsMissed: [], errors: [],
    feedback: '', transcript: '', ...p,
  }
}

describe('computePairQueue', () => {
  it('creates a teach item when one knows and the other does not', () => {
    const q = computePairQueue([
      rec({ speaker: '민수', conceptsCovered: ['인덱스'], understanding: '잘함', problemConcepts: ['인덱스'], problemNumber: 5 }),
      rec({ speaker: '나', conceptsMissed: ['인덱스'], problemConcepts: ['인덱스'], problemNumber: 5 }),
    ])
    const item = q.find(i => i.concept === '인덱스')!
    expect(item.kind).toBe('teach')
    expect(item.teacher).toBe('민수')
    expect(item.learner).toBe('나')
    expect(item.relatedProblems).toEqual([{ book: 'A', chapter: 0, problemNumber: 5 }])
  })

  it('creates a both_unknown item when nobody knows it', () => {
    const q = computePairQueue([
      rec({ speaker: '민수', conceptsMissed: ['통계'] }),
      rec({ speaker: '나', conceptsMissed: ['통계'] }),
    ])
    const item = q.find(i => i.concept === '통계')!
    expect(item.kind).toBe('both_unknown')
    expect(item.teacher).toBeNull()
  })

  it('omits concepts everyone already knows', () => {
    const q = computePairQueue([
      rec({ speaker: '민수', conceptsCovered: ['조인'], understanding: '잘함' }),
      rec({ speaker: '나', conceptsCovered: ['조인'], understanding: '잘함' }),
    ])
    expect(q.find(i => i.concept === '조인')).toBeUndefined()
  })
})
