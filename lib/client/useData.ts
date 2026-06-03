'use client'
import { useEffect, useState } from 'react'
import type { ExplanationRecord } from '@/lib/insights/types'
import type { ProblemDetail } from '@/lib/db/queries'

export interface AppData {
  records: ExplanationRecord[]
  problems: ProblemDetail[]
}

export function useData() {
  const [data, setData] = useState<AppData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/data')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('데이터 로드 실패'))))
      .then(setData)
      .catch(e => setError(e.message))
  }, [])

  return { data, error, loading: !data && !error }
}
