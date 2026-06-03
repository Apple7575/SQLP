import type { ExplanationRecord } from './types'
import { byDateAsc, problemKey } from './helpers'
import { SYLLABUS_AREAS, UNCLASSIFIED, type Understanding } from '@/lib/types'

export interface SpeakerCounts {
  speaker: string
  잘함: number
  애매: number
  모름: number
  total: number
  masteredPct: number
}

export interface AreaProgress {
  area: string
  bySpeaker: SpeakerCounts[]
}

export function computeSyllabusProgress(records: ExplanationRecord[]): AreaProgress[] {
  const latest = new Map<string, { area: string; understanding: Understanding }>()
  for (const r of byDateAsc(records)) {
    latest.set(`${r.speaker}::${problemKey(r)}`, { area: r.syllabusArea, understanding: r.understanding })
  }

  const speakers = [...new Set(records.map(r => r.speaker))].sort()
  const areas = [...SYLLABUS_AREAS, UNCLASSIFIED]

  return areas
    .map(area => {
      const bySpeaker: SpeakerCounts[] = speakers.map(speaker => {
        const counts: Record<Understanding, number> = { 잘함: 0, 애매: 0, 모름: 0 }
        for (const [key, v] of latest) {
          if (!key.startsWith(`${speaker}::`)) continue
          if (v.area !== area) continue
          counts[v.understanding]++
        }
        const total = counts.잘함 + counts.애매 + counts.모름
        return {
          speaker,
          잘함: counts.잘함,
          애매: counts.애매,
          모름: counts.모름,
          total,
          masteredPct: total === 0 ? 0 : Math.round((counts.잘함 / total) * 100),
        }
      })
      return { area, bySpeaker }
    })
    .filter(a => a.bySpeaker.some(s => s.total > 0))
}
