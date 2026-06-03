import { pgTable, uuid, text, integer, date, timestamp, jsonb, unique } from 'drizzle-orm/pg-core'

export const problems = pgTable(
  'problems',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    book: text('book').notNull(),
    chapter: integer('chapter').notNull().default(0),
    problemNumber: integer('problem_number').notNull(),
    problemText: text('problem_text').notNull(),
    solutionText: text('solution_text').notNull(),
    syllabusArea: text('syllabus_area').notNull(),
    concepts: jsonb('concepts').$type<string[]>().notNull().default([]),
  },
  t => ({ uq: unique('problems_book_chapter_number').on(t.book, t.chapter, t.problemNumber) }),
)

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionDate: date('session_date').notNull(),
  book: text('book').notNull(),
  speakers: jsonb('speakers').$type<string[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const explanations = pgTable('explanations', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  problemId: uuid('problem_id').notNull().references(() => problems.id, { onDelete: 'cascade' }),
  speaker: text('speaker').notNull(),
  transcript: text('transcript').notNull(),
  understanding: text('understanding').notNull(),
  conceptsCovered: jsonb('concepts_covered').$type<string[]>().notNull().default([]),
  conceptsMissed: jsonb('concepts_missed').$type<string[]>().notNull().default([]),
  errors: jsonb('errors').$type<string[]>().notNull().default([]),
  feedback: text('feedback').notNull().default(''),
})
