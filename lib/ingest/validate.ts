import { sessionSchema, problemSchema } from './schema'
import { SYLLABUS_AREAS, UNCLASSIFIED, type SessionInput, type ProblemInput } from '@/lib/types'

export interface ValidationWarning {
  problemIndex: number
  problemNumber?: number
  message: string
}

export interface ValidationResult {
  ok: boolean
  fatalError?: string
  session?: SessionInput
  problemCount: number
  explanationCount: number
  warnings: ValidationWarning[]
}

const KNOWN_AREAS: string[] = [...SYLLABUS_AREAS]

export function validate(raw: unknown): ValidationResult {
  const top = sessionSchema.safeParse(raw)
  if (!top.success) {
    return {
      ok: false,
      fatalError: top.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '),
      problemCount: 0,
      explanationCount: 0,
      warnings: [],
    }
  }

  const warnings: ValidationWarning[] = []
  const validProblems: ProblemInput[] = []
  let explanationCount = 0

  top.data.problems.forEach((p, idx) => {
    const parsed = problemSchema.safeParse(p)
    if (!parsed.success) {
      const pn = (p as { problem_number?: unknown })?.problem_number
      warnings.push({
        problemIndex: idx,
        problemNumber: typeof pn === 'number' ? pn : undefined,
        message: `문제 파싱 실패 (스킵됨): ${parsed.error.issues.map(i => `${i.path.join('.')} ${i.message}`).join(', ')}`,
      })
      return
    }
    const prob = parsed.data
    let area = prob.syllabus_area
    if (!KNOWN_AREAS.includes(area)) {
      warnings.push({
        problemIndex: idx,
        problemNumber: prob.problem_number,
        message: `알 수 없는 syllabus_area "${area}" → '${UNCLASSIFIED}'로 저장`,
      })
      area = UNCLASSIFIED
    }
    validProblems.push({
      problem_number: prob.problem_number,
      chapter: prob.chapter ?? 0,
      problem_text: prob.problem_text,
      solution_text: prob.solution_text,
      syllabus_area: area,
      concepts: prob.concepts,
      explanations: prob.explanations,
    })
    explanationCount += prob.explanations.length
  })

  return {
    ok: true,
    session: {
      session_date: top.data.session_date,
      book: top.data.book,
      speakers: top.data.speakers,
      problems: validProblems,
    },
    problemCount: validProblems.length,
    explanationCount,
    warnings,
  }
}
