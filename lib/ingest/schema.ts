import { z } from 'zod'

export const explanationSchema = z.object({
  speaker: z.string().min(1),
  transcript: z.string(),
  understanding: z.enum(['잘함', '애매', '모름']),
  concepts_covered: z.array(z.string()).default([]),
  concepts_missed: z.array(z.string()).default([]),
  errors: z.array(z.string()).default([]),
  feedback: z.string().default(''),
})

export const problemSchema = z.object({
  problem_number: z.number().int(),
  chapter: z.number().int().nullable().optional(),
  problem_text: z.string(),
  solution_text: z.string(),
  syllabus_area: z.string(),
  concepts: z.array(z.string()).default([]),
  explanations: z.array(explanationSchema).min(1),
})

export const sessionSchema = z.object({
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  book: z.string().min(1),
  speakers: z.array(z.string()).default([]),
  problems: z.array(z.unknown()).default([]),
})
