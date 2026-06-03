'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Flame, Handshake, Calendar, BookOpen, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/', label: '홈', icon: Home },
  { href: '/weakness', label: '약점맵', icon: Flame },
  { href: '/pair-queue', label: '페어큐', icon: Handshake },
  { href: '/sessions', label: '세션', icon: Calendar },
  { href: '/review', label: '문제복습', icon: BookOpen },
  { href: '/upload', label: '업로드', icon: Upload },
]

export function Sidebar() {
  const path = usePathname()
  return (
    <aside className="w-52 shrink-0 border-r bg-muted/20 p-3">
      <div className="mb-4 px-2 text-sm font-semibold">SQLP 스터디</div>
      <nav className="space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? path === '/' : path.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                active ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:bg-background/60',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
