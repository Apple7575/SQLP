import { describe, it, expect } from 'vitest'
import { computeSyllabusProgress } from './syllabus'
import type { ExplanationRecord } from './types'

function rec(p: Partial<ExplanationRecord>): ExplanationRecord {
  return {
    sessionDate: '2026-06-01', book: 'A', problemNumber: 1, chapter: 0,
    syllabusArea: 'SQL 기본 및 활용', problemConcepts: [], speaker: '나',
    understanding: '잘함', conceptsCovered: [], conceptsMissed: [], errors: [],
    feedback: '', transcript: '', ...p,
  }
}

describe('computeSyllabusProgress', () => {
  it('counts latest understanding per speaker per area and computes mastered %', () => {
    const out = computeSyllabusProgress([
      rec({ speaker: '나', problemNumber: 1, understanding: '잘함' }),
      rec({ speaker: '나', problemNumber: 2, understanding: '모름' }),
    ])
    const area = out.find(a => a.area === 'SQL 기본 및 활용')!
    const me = area.bySpeaker.find(s => s.speaker === '나')!
    expect(me.total).toBe(2)
    expect(me.잘함).toBe(1)
    expect(me.masteredPct).toBe(50)
  })

  it('takes the latest session understanding for the same problem', () => {
    const out = computeSyllabusProgress([
      rec({ sessionDate: '2026-06-01', problemNumber: 1, understanding: '모름' }),
      rec({ sessionDate: '2026-06-05', problemNumber: 1, understanding: '잘함' }),
    ])
    const me = out[0].bySpeaker.find(s => s.speaker === '나')!
    expect(me.total).toBe(1)
    expect(me.잘함).toBe(1)
  })

  it('omits areas with no data', () => {
    const out = computeSyllabusProgress([rec({ syllabusArea: 'SQL 기본 및 활용' })])
    expect(out.some(a => a.area === '데이터 모델링의 이해')).toBe(false)
  })
})
