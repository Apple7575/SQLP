'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) router.push('/')
    else setError((await res.json()).error ?? '로그인 실패')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <Card className="w-full max-w-sm p-6">
        <h1 className="mb-1 text-lg font-semibold">SQLP 스터디</h1>
        <p className="mb-4 text-sm text-muted-foreground">공유 비밀번호를 입력하세요.</p>
        <form onSubmit={submit} className="space-y-3">
          <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="비밀번호" autoFocus />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full">로그인</Button>
        </form>
      </Card>
    </div>
  )
}
