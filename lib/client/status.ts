import type { Status } from '@/lib/insights/types'

export const STATUS_BG: Record<Status, string> = {
  잘함: 'bg-emerald-500',
  애매: 'bg-amber-400',
  모름: 'bg-red-500',
  미학습: 'bg-muted',
}

export const STATUS_TEXT: Record<Status, string> = {
  잘함: 'text-emerald-700',
  애매: 'text-amber-700',
  모름: 'text-red-700',
  미학습: 'text-muted-foreground',
}
