import type { ExplanationRecord, Status } from './types'
import { byDateAsc, uniqueConcepts, uniqueSpeakers } from './helpers'

export interface WeaknessCell {
  speaker: string
  concept: string
  status: Status
  syllabusArea: string | null
}

export interface WeaknessMap {
  speakers: string[]
  concepts: string[]
  cells: WeaknessCell[]
}

export function computeWeaknessMap(records: ExplanationRecord[]): WeaknessMap {
  const speakers = uniqueSpeakers(records)
  const concepts = uniqueConcepts(records)

  const latest = new Map<string, { status: Status; area: string }>()
  for (const r of byDateAsc(records)) {
    for (const c of r.conceptsCovered) {
      latest.set(`${r.speaker}::${c}`, { status: r.understanding, area: r.syllabusArea })
    }
    for (const c of r.conceptsMissed) {
      latest.set(`${r.speaker}::${c}`, { status: '모름', area: r.syllabusArea })
    }
  }

  const cells: WeaknessCell[] = []
  for (const speaker of speakers) {
    for (const concept of concepts) {
      const hit = latest.get(`${speaker}::${concept}`)
      cells.push({
        speaker,
        concept,
        status: hit?.status ?? '미학습',
        syllabusArea: hit?.area ?? null,
      })
    }
  }
  return { speakers, concepts, cells }
}
