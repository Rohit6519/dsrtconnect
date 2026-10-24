import { toast as sonnerToast } from 'sonner'

type Tone = 'default' | 'success' | 'error' | 'message'

type Entry = {
  key: string
  at: number
}

const recent: Entry[] = []
const WINDOW_MS = 2200
const MAX_SAME = 1

function prune(now: number) {
  while (recent.length && now - recent[0].at > WINDOW_MS) recent.shift()
}

function allow(key: string): boolean {
  const now = Date.now()
  prune(now)
  const count = recent.filter((e) => e.key === key).length
  if (count >= MAX_SAME) return false
  recent.push({ key, at: now })
  return true
}

function emit(tone: Tone, title: string, description?: string) {
  const key = `${tone}:${title}:${description || ''}`
  if (!allow(key)) return

  const opts = description ? { description } : undefined
  if (tone === 'success') sonnerToast.success(title, opts)
  else if (tone === 'error') sonnerToast.error(title, opts)
  else if (tone === 'message') sonnerToast.message(title, opts)
  else sonnerToast(title, opts)
}

export const mailToast = {
  success: (title: string, description?: string) => emit('success', title, description),
  error: (title: string, description?: string) => emit('error', title, description),
  message: (title: string, description?: string) => emit('message', title, description),
  info: (title: string, description?: string) => emit('default', title, description),
}