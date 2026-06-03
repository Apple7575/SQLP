'use client'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { validate, type ValidationResult } from '@/lib/ingest/validate'

export default function UploadPage() {
  const [raw, setRaw] = useState<unknown>(null)
  const [fileName, setFileName] = useState('')
  const [preview, setPreview] = useState<ValidationResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onFile(file: File) {
    setSaved(null); setError(null)
    try {
      const json = JSON.parse(await file.text())
      setRaw(json); setFileName(file.name); setPreview(validate(json))
    } catch {
      setPreview(null); setError('JSON 파싱 실패: 올바른 JSON 파일이 아닙니다.')
    }
  }

  async function confirm() {
    if (!raw) return
    setSaving(true); setError(null)
    const res = await fetch('/api/sessions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(raw),
    })
    setSaving(false)
    const body = await res.json()
    if (res.ok) { setSaved(`저장 완료: 문제 ${body.problemCount}개 / 발화 ${body.explanationCount}개`); setPreview(null); setRaw(null) }
    else setError(body.error ?? '저장 실패')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">세션 업로드</h1>
      <Card
        className="flex h-32 cursor-pointer items-center justify-center border-dashed text-sm text-muted-foreground"
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        {fileName || 'JSON 파일을 드롭하거나 클릭해서 선택'}
        <input id="file-input" type="file" accept="application/json,.json" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-emerald-700">{saved}</p>}

      {preview?.fatalError && <Card className="p-4 text-sm text-red-600">형식 오류: {preview.fatalError}</Card>}

      {preview?.ok && preview.session && (
        <Card className="space-y-3 p-4">
          <div className="flex items-center gap-2 text-sm">
            <Badge>{preview.session.session_date}</Badge>
            <Badge variant="secondary">{preview.session.book}</Badge>
            <span className="text-muted-foreground">문제 {preview.problemCount} · 발화 {preview.explanationCount}</span>
          </div>
          {preview.warnings.length > 0 && (
            <ul className="space-y-1 rounded-md bg-amber-50 p-3 text-xs text-amber-800">
              {preview.warnings.map((w, i) => (
                <li key={i}>⚠️ {w.problemNumber != null ? `${w.problemNumber}번: ` : ''}{w.message}</li>
              ))}
            </ul>
          )}
          <Button onClick={confirm} disabled={saving || preview.problemCount === 0}>
            {saving ? '저장 중…' : '확정 저장'}
          </Button>
        </Card>
      )}
    </div>
  )
}
