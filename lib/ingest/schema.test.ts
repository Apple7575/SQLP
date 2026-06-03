import { describe, it, expect } from 'vitest'
import { explanationSchema, problemSchema, sessionSchema } from './schema'

describe('ingest schemas', () => {
  it('accepts a valid explanation and fills array defaults', () => {
    const parsed = explanationSchema.parse({
      speaker: '나',
      transcript: 'x',
      understanding: '애매',
    })
    expect(parsed.concepts_covered).toEqual([])
    expect(parsed.errors).toEqual([])
    expect(parsed.feedback).toBe('')
  })

  it('rejects an invalid understanding value', () => {
    const r = explanationSchema.safeParse({ speaker: '나', transcript: 'x', understanding: '잘 함' })
    expect(r.success).toBe(false)
  })

  it('rejects a problem with zero explanations', () => {
    const r = problemSchema.safeParse({
      problem_number: 5, problem_text: 'p', solution_text: 's',
      syllabus_area: 'SQL 기본 및 활용', explanations: [],
    })
    expect(r.success).toBe(false)
  })

  it('rejects a session with a bad date format', () => {
    const r = sessionSchema.safeParse({ session_date: '2026/06/04', book: 'A' })
    expect(r.success).toBe(false)
  })
})
