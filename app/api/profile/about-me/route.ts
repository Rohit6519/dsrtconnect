import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MAX_LENGTH = 10000 // ~10K chars, generous

/**
 * PATCH /api/profile/about-me
 * Body: { html: string, plain: string }
 *
 * Saves both:
 *   users.about_me_html  ← rich HTML
 *   users.bio            ← plain text fallback (used elsewhere in app: cards, search)
 */
export async function PATCH(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { html, plain } = await request.json()

  if (typeof html !== 'string' || typeof plain !== 'string') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (html.length > MAX_LENGTH) {
    return NextResponse.json({ error: `Too long (max ${MAX_LENGTH} chars)` }, { status: 400 })
  }

  const { error } = await supabase
    .from('users')
    .update({
      about_me_html: html.trim() || null,
      bio:           plain.trim() || null,
      updated_at:    new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    console.error('About Me update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, about_me_html: html, bio: plain })
}