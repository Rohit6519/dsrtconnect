import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MAX_TAGS = 12

/**
 * PATCH /api/profile/tags
 * Body: { tags: string[] }
 * Replaces the full tags array (simpler than add/remove endpoints)
 */
export async function PATCH(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tags } = await request.json()

  if (!Array.isArray(tags)) {
    return NextResponse.json({ error: 'tags must be an array' }, { status: 400 })
  }

  // Sanitize: trim, lowercase for comparison, dedupe, keep original case
  const seen = new Set<string>()
  const cleaned: string[] = []
  for (const raw of tags) {
    if (typeof raw !== 'string') continue
    const trimmed = raw.trim()
    if (!trimmed) continue
    if (trimmed.length > 40) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    cleaned.push(trimmed)
    if (cleaned.length >= MAX_TAGS) break
  }

  const { error } = await supabase
    .from('users')
    .update({
      profile_tags: cleaned,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, tags: cleaned })
}