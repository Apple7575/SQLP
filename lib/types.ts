export const UNDERSTANDING = ['잘함', '애매', '모름'] as const
export type Understanding = (typeof UNDERSTANDING)[number]

export const SYLLABUS_AREAS = [
  '데이터 모델링의 이해',
  'SQL 기본 및 활용',
  'SQL 고급 활용 및 튜닝',
] as const
export type SyllabusArea = (typeof SYLLABUS_AREAS)[number]

export const UNCLASSIFIED = '미분류'

export interface Explanation {
  speaker: string
  transcript: string
  understanding: Understanding
  concepts_covered: string[]
  concepts_missed: string[]
  errors: string[]
  feedback: string
}

export interface ProblemInput {
  problem_number: number
  chapter: number // 0 = no chapter
  problem_text: string
  solution_text: string
  syllabus_area: string // normalized to a SyllabusArea or UNCLASSIFIED
  concepts: string[]
  explanations: Explanation[]
}

export interface SessionInput {
  session_date: string // YYYY-MM-DD
  book: string
  speakers: string[]
  problems: ProblemInput[]
}
