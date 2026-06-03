import { describe, it, expect } from 'vitest'
import { validate } from './validate'

const good = {
  session_date: '2026-06-04',
  book: '문제집A',
  speakers: ['나', '민수'],
  problems: [
    {
      problem_number: 5,
      problem_text: 'p', solution_text: 's',
      syllabus_area: 'SQL 고급 활용 및 튜닝',
      concepts: ['인덱스'],
      explanations: [
        { speaker: '나', transcript: 't', understanding: '애매', concepts_covered: ['인덱스'], concepts_missed: [], errors: [], feedback: 'f' },
      ],
    },
  ],
}

describe('validate', () => {
  it('returns counts and no warnings for clean input', () => {
    const r = validate(good)
    expect(r.ok).toBe(true)
    expect(r.problemCount).toBe(1)
    expect(r.explanationCount).toBe(1)
    expect(r.warnings).toHaveLength(0)
    expect(r.session?.problems[0].chapter).toBe(0)
  })

  it('returns a fatalError for malformed top-level JSON', () => {
    const r = validate({ book: 'A' })
    expect(r.ok).toBe(false)
    expect(r.fatalError).toBeTruthy()
  })

  it('skips a broken problem but keeps the good ones (partial save)', () => {
    const mixed = { ...good, problems: [good.problems[0], { problem_number: 9 }] }
    const r = validate(mixed)
    expect(r.ok).toBe(true)
    expect(r.problemCount).toBe(1)
    expect(r.warnings).toHaveLength(1)
    expect(r.warnings[0].problemNumber).toBe(9)
  })

  it('normalizes an unknown syllabus_area to 미분류 with a warning', () => {
    const odd = { ...good, problems: [{ ...good.problems[0], syllabus_area: '옵티마이저' }] }
    const r = validate(odd)
    expect(r.session?.problems[0].syllabus_area).toBe('미분류')
    expect(r.warnings.some(w => w.message.includes('미분류'))).toBe(true)
  })
})
