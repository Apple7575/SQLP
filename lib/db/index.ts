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
    // Vercel's Neon/Postgres integration sets POSTGRES_URL (pooled), not DATABASE_URL.
    // Prefer DATABASE_URL when present (local/.env), otherwise fall back to POSTGRES_URL.
    const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL
    if (!url) throw new Error('DATABASE_URL (or POSTGRES_URL) is not set')
    // prepare:false keeps it compatible with serverless connection poolers
    // (Vercel Postgres / Neon / Supabase pgbouncer). Harmless for local Postgres.
    _db = drizzle(postgres(url, { prepare: false }), { schema })
  }
  return _db
}
