import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/profile/tagline
 * Body: { plain: string, html: string }
 *
 * Saves both:
 *   users.tagline       ← plain text (for previews, search, cards)
 *   users.tagline_html  ← rich HTML (for profile display)
 */
export async function PATCH(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { plain, html } = await request.json()

  if (typeof plain !== 'string' || typeof html !== 'string') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (plain.length > 300) {
    return NextResponse.json({ error: 'Tagline too long (max 300 chars)' }, { status: 400 })
  }

  const { error } = await supabase
    .from('users')
    .update({
      tagline: plain.trim() || null,
      tagline_html: html.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, tagline: plain, tagline_html: html })
}