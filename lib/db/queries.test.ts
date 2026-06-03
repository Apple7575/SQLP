import { describe, it, expect } from 'vitest'
import { createTestDb } from '@/test/helpers/testDb'
import { ingestSession, getAllRecords } from './queries'
import { getProblemsWithExplanations } from './queries'
import { problems, explanations } from './schema'
import type { SessionInput } from '@/lib/types'

const session: SessionInput = {
  session_date: '2026-06-04', book: '문제집A', speakers: ['나', '민수'],
  problems: [{
    problem_number: 5, chapter: 0, problem_text: 'p', solution_text: 's',
    syllabus_area: 'SQL 고급 활용 및 튜닝', concepts: ['인덱스'],
    explanations: [
      { speaker: '나', transcript: 't1', understanding: '애매', concepts_covered: ['인덱스'], concepts_missed: [], errors: [], feedback: 'f1', is_correct: true },
      { speaker: '민수', transcript: 't2', understanding: '잘함', concepts_covered: ['인덱스'], concepts_missed: [], errors: [], feedback: 'f2', is_correct: false },
    ],
  }],
}

describe('ingestSession', () => {
  it('inserts session, problem, and explanations', async () => {
    const db = await createTestDb()
    await ingestSession(db, session)
    expect(await db.select().from(problems)).toHaveLength(1)
    expect(await db.select().from(explanations)).toHaveLength(2)
  })

  it('dedups the same problem across sessions and keeps both explanation rows', async () => {
    const db = await createTestDb()
    await ingestSession(db, session)
    await ingestSession(db, { ...session, session_date: '2026-06-06' })
    expect(await db.select().from(problems)).toHaveLength(1)
    expect(await db.select().from(explanations)).toHaveLength(4)
  })

  it('exposes rows via getAllRecords with problem concepts joined', async () => {
    const db = await createTestDb()
    await ingestSession(db, session)
    const records = await getAllRecords(db)
    expect(records).toHaveLength(2)
    expect(records[0].problemConcepts).toEqual(['인덱스'])
    expect(records[0].syllabusArea).toBe('SQL 고급 활용 및 튜닝')
    expect(typeof records[0].isCorrect).toBe('boolean')
  })
})

describe('getProblemsWithExplanations', () => {
  it('groups explanations under their problem with text and solution', async () => {
    const db = await createTestDb()
    await ingestSession(db, session)
    const out = await getProblemsWithExplanations(db)
    expect(out).toHaveLength(1)
    expect(out[0].problemText).toBe('p')
    expect(out[0].solutionText).toBe('s')
    expect(out[0].explanations).toHaveLength(2)
    expect(out[0].explanations[0].sessionDate).toBe('2026-06-04')
    expect(out[0].explanations[0]).toHaveProperty('isCorrect')
  })
})
