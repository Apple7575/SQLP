import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { PgliteDatabase } from 'drizzle-orm/pglite'
import * as schema from './schema'

export type DB = PostgresJsDatabase<typeof schema> | PgliteDatabase<typeof schema>

let _db: PostgresJsDatabase<typeof schema> | undefined

export function getDb(): PostgresJsDatabase<typeof schema> {
  if (!_db) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set')
    _db = drizzle(postgres(url), { schema })
  }
  return _db
}
