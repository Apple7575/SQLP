import { describe, it, expect } from 'vitest'
import { computeWeaknessMap } from './weakness'
import type { ExplanationRecord } from './types'

function rec(p: Partial<ExplanationRecord>): ExplanationRecord {
  return {
    sessionDate: '2026-06-01', book: 'A', problemNumber: 1, chapter: 0,
    syllabusArea: 'SQL 기본 및 활용', problemConcepts: [], speaker: '나',
    understanding: '애매', conceptsCovered: [], conceptsMissed: [], errors: [],
    feedback: '', transcript: '', ...p,
  }
}

describe('computeWeaknessMap', () => {
  it('produces a full speaker × concept grid with 미학습 fallback', () => {
    const r = computeWeaknessMap([
      rec({ speaker: '나', conceptsCovered: ['인덱스'], understanding: '잘함' }),
      rec({ speaker: '민수', problemConcepts: ['조인'] }),
    ])
    expect(r.speakers).toEqual(['나', '민수'])
    expect(r.concepts).toEqual(['인덱스', '조인'])
    const cell = (s: string, c: string) => r.cells.find(x => x.speaker === s && x.concept === c)!
    expect(cell('나', '인덱스').status).toBe('잘함')
    expect(cell('민수', '인덱스').status).toBe('미학습')
  })

  it('uses the latest session status for a concept', () => {
    const r = computeWeaknessMap([
      rec({ sessionDate: '2026-06-01', conceptsMissed: ['인덱스'] }),
      rec({ sessionDate: '2026-06-05', conceptsCovered: ['인덱스'], understanding: '잘함' }),
    ])
    expect(r.cells.find(x => x.concept === '인덱스')!.status).toBe('잘함')
  })

  it('marks a missed concept as 모름', () => {
    const r = computeWeaknessMap([rec({ conceptsMissed: ['통계'] })])
    expect(r.cells.find(x => x.concept === '통계')!.status).toBe('모름')
  })
})
