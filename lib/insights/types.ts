import type { Understanding } from '@/lib/types'

export interface ExplanationRecord {
  sessionDate: string // YYYY-MM-DD
  book: string
  problemNumber: number
  chapter: number // 0 = none
  syllabusArea: string
  problemConcepts: string[]
  speaker: string
  understanding: Understanding
  conceptsCovered: string[]
  conceptsMissed: string[]
  errors: string[]
  feedback: string
  isCorrect?: boolean | null
  transcript: string
}

export type Status = Understanding | '미학습'
