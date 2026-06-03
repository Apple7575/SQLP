import { and, eq } from 'drizzle-orm'
import type { DB } from './index'
import { problems, sessions, explanations } from './schema'
import type { SessionInput, Understanding } from '@/lib/types'
import type { ExplanationRecord } from '@/lib/insights/types'

export async function ingestSession(db: DB, input: SessionInput): Promise<{ sessionId: string }> {
  return await db.transaction(async tx => {
    const [session] = await tx
      .insert(sessions)
      .values({ sessionDate: input.session_date, book: input.book, speakers: input.speakers })
      .returning({ id: sessions.id })

    for (const p of input.problems) {
      const existing = await tx
        .select({ id: problems.id })
        .from(problems)
        .where(and(eq(problems.book, input.book), eq(problems.chapter, p.chapter), eq(problems.problemNumber, p.problem_number)))
        .limit(1)

      let problemId: string
      if (existing.length > 0) {
        problemId = existing[0].id
        await tx
          .update(problems)
          .set({ problemText: p.problem_text, solutionText: p.solution_text, syllabusArea: p.syllabus_area, concepts: p.concepts })
          .where(eq(problems.id, problemId))
      } else {
        const [created] = await tx
          .insert(problems)
          .values({
            book: input.book, chapter: p.chapter, problemNumber: p.problem_number,
            problemText: p.problem_text, solutionText: p.solution_text,
            syllabusArea: p.syllabus_area, concepts: p.concepts,
          })
          .returning({ id: problems.id })
        problemId = created.id
      }

      for (const e of p.explanations) {
        await tx.insert(explanations).values({
          sessionId: session.id, problemId, speaker: e.speaker, transcript: e.transcript,
          understanding: e.understanding, conceptsCovered: e.concepts_covered,
          conceptsMissed: e.concepts_missed, errors: e.errors, feedback: e.feedback,
        })
      }
    }
    return { sessionId: session.id }
  })
}

export async function getAllRecords(db: DB): Promise<ExplanationRecord[]> {
  const rows = await db
    .select({
      sessionDate: sessions.sessionDate,
      book: problems.book,
      problemNumber: problems.problemNumber,
      chapter: problems.chapter,
      syllabusArea: problems.syllabusArea,
      problemConcepts: problems.concepts,
      speaker: explanations.speaker,
      understanding: explanations.understanding,
      conceptsCovered: explanations.conceptsCovered,
      conceptsMissed: explanations.conceptsMissed,
      errors: explanations.errors,
      feedback: explanations.feedback,
      transcript: explanations.transcript,
    })
    .from(explanations)
    .innerJoin(sessions, eq(explanations.sessionId, sessions.id))
    .innerJoin(problems, eq(explanations.problemId, problems.id))

  return rows.map(r => ({ ...r, understanding: r.understanding as Understanding }))
}
