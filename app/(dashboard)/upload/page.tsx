'use client'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { validate, type ValidationResult } from '@/lib/ingest/validate'

export default function UploadPage() {
  const [raw, setRaw] = useState<unknown>(null)
  const [source, setSource] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [preview, setPreview] = useState<ValidationResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function loadRaw(json: unknown, label: string) {
    setSaved(null)
    setError(null)
    setRaw(json)
    setSource(label)
    setPreview(validate(json))
  }

  async function onFile(file: File) {
    setSaved(null); setError(null)
    try {
      loadRaw(JSON.parse(await file.text()), file.name)
    } catch {
      setPreview(null); setRaw(null); setError('JSON 파싱 실패: 올바른 JSON 파일이 아닙니다.')
    }
  }

  function onPaste() {
    setSaved(null); setError(null)
    if (!pasteText.trim()) { setError('붙여넣은 내용이 없습니다.'); return }
    try {
      loadRaw(JSON.parse(pasteText), '붙여넣기')
    } catch {
      setPreview(null); setRaw(null); setError('JSON 파싱 실패: 붙여넣은 텍스트가 올바른 JSON이 아닙니다.')
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
    if (res.ok) {
      setSaved(`저장 완료: 문제 ${body.problemCount}개 / 발화 ${body.explanationCount}개`)
      setPreview(null); setRaw(null); setPasteText('')
    } else {
      setError(body.error ?? '저장 실패')
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">세션 업로드</h1>

      <Card
        className="flex h-28 cursor-pointer items-center justify-center border-dashed text-sm text-muted-foreground"
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        {source && source !== '붙여넣기' ? source : 'JSON 파일을 드롭하거나 클릭해서 선택'}
        <input id="file-input" type="file" accept="application/json,.json" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
      </Card>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />또는 붙여넣기<span className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-2">
        <textarea
          value={pasteText}
          onChange={e => setPasteText(e.target.value)}
          placeholder='여기에 JSON을 붙여넣으세요  {"session_date": "...", "book": "...", "problems": [ ... ] }'
          className="h-40 w-full resize-y rounded-md border bg-background p-3 font-mono text-xs outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onPaste} disabled={!pasteText.trim()}>붙여넣기 미리보기</Button>
          {pasteText && <Button variant="ghost" onClick={() => setPasteText('')}>지우기</Button>}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-emerald-700">{saved}</p>}

      {preview?.fatalError && <Card className="p-4 text-sm text-red-600">형식 오류: {preview.fatalError}</Card>}

      {preview?.ok && preview.session && (
        <Card className="space-y-3 p-4">
          <div className="flex items-center gap-2 text-sm">
            <Badge>{preview.session.session_date}</Badge>
            <Badge variant="secondary">{preview.session.book}</Badge>
            <span className="text-muted-foreground">문제 {preview.problemCount} · 발화 {preview.explanationCount}</span>
            {source && <span className="ml-auto text-xs text-muted-foreground">출처: {source}</span>}
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
