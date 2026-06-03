import { describe, it, expect } from 'vitest'
import { createTestDb } from './testDb'
import { sessions } from '@/lib/db/schema'

describe('test db', () => {
  it('migrates and accepts an insert', async () => {
    const db = await createTestDb()
    await db.insert(sessions).values({ sessionDate: '2026-06-04', book: 'A', speakers: ['나'] })
    const rows = await db.select().from(sessions)
    expect(rows).toHaveLength(1)
  })
})
