import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  return `https://${trimmed}`
}

function detectIcon(url: string): string {
  const lower = url.toLowerCase()
  if (lower.includes('github.com'))     return 'github'
  if (lower.includes('gitlab.com'))     return 'gitlab'
  if (lower.includes('dribbble.com'))   return 'dribbble'
  if (lower.includes('behance.net'))    return 'behance'
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube'
  if (lower.includes('medium.com'))     return 'medium'
  if (lower.includes('substack.com'))   return 'substack'
  if (lower.includes('notion.so') || lower.includes('notion.site')) return 'notion'
  if (lower.includes('figma.com'))      return 'figma'
  if (lower.includes('twitch.tv'))      return 'twitch'
  if (lower.includes('discord.'))       return 'discord'
  if (lower.includes('spotify.com'))    return 'spotify'
  if (lower.includes('soundcloud.com')) return 'soundcloud'
  if (lower.includes('producthunt.com'))return 'producthunt'
  if (lower.includes('stackoverflow')) return 'stackoverflow'
  if (lower.includes('reddit.com'))    return 'reddit'
  if (lower.includes('tiktok.com'))    return 'tiktok'
  if (lower.includes('pinterest.com')) return 'pinterest'
  if (lower.includes('threads.net'))   return 'threads'
  return 'link'
}

/**
 * PATCH /api/profile/custom-links/[id]
 * Body: { title?, url?, icon?, position? }
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const patch: Record<string, any> = {}

  if ('title' in body) {
    const t = (body.title || '').toString().trim()
    if (!t) return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 })
    if (t.length > 60) return NextResponse.json({ error: 'Title too long (max 60)' }, { status: 400 })
    patch.title = t
  }
  if ('url' in body) {
    const u = (body.url || '').toString().trim()
    if (!u) return NextResponse.json({ error: 'URL cannot be empty' }, { status: 400 })
    patch.url = normalizeUrl(u)
    if (!('icon' in body)) patch.icon = detectIcon(patch.url)
  }
  if ('icon' in body) {
    patch.icon = (body.icon || '').toString().trim() || 'link'
  }
  if ('position' in body && typeof body.position === 'number') {
    patch.position = body.position
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  // Verify ownership before updating
  const { data: existing } = await supabase
    .from('user_custom_links')
    .select('user_id')
    .eq('id', params.id)
    .single()

  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('user_custom_links')
    .update(patch)
    .eq('id', params.id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ link: data })
}

/**
 * DELETE /api/profile/custom-links/[id]
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Ownership check
  const { data: existing } = await supabase
    .from('user_custom_links')
    .select('user_id')
    .eq('id', params.id)
    .single()

  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('user_custom_links')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}