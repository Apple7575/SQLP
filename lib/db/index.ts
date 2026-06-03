import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { PgliteDatabase } from 'drizzle-orm/pglite'
import type { PgDatabase } from 'drizzle-orm/pg-core'
import type { PgQueryResultHKT } from 'drizzle-orm/pg-core'
import * as schema from './schema'

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>

// Keep specific types available for callers that need them
export type { PostgresJsDatabase, PgliteDatabase }

let _db: PostgresJsDatabase<typeof schema> | undefined

export function getDb(): PostgresJsDatabase<typeof schema> {
  if (!_db) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set')
    _db = drizzle(postgres(url), { schema })
  }
  return _db
}
