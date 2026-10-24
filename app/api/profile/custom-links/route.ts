import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MAX_CUSTOM_LINKS = 12

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
  if (lower.includes('hackernews') || lower.includes('news.ycombinator')) return 'hackernews'
  if (lower.includes('stackoverflow')) return 'stackoverflow'
  if (lower.includes('reddit.com'))    return 'reddit'
  if (lower.includes('tiktok.com'))    return 'tiktok'
  if (lower.includes('pinterest.com')) return 'pinterest'
  if (lower.includes('threads.net'))   return 'threads'
  return 'link'
}

/**
 * GET /api/profile/custom-links?user_id=<id>
 * Returns ordered list of custom links for a user (public)
 */
export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')

  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('user_custom_links')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ links: data || [] })
}

/**
 * POST /api/profile/custom-links
 * Body: { title, url, icon? }
 */
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, url, icon } = await request.json()

  const trimmedTitle = (title || '').toString().trim()
  const trimmedUrl = (url || '').toString().trim()

  if (!trimmedTitle) return NextResponse.json({ error: 'Title required' }, { status: 400 })
  if (trimmedTitle.length > 60) return NextResponse.json({ error: 'Title too long (max 60)' }, { status: 400 })
  if (!trimmedUrl) return NextResponse.json({ error: 'URL required' }, { status: 400 })

  const normalizedUrl = normalizeUrl(trimmedUrl)

  // Check current count
  const { count } = await supabase
    .from('user_custom_links')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if ((count || 0) >= MAX_CUSTOM_LINKS) {
    return NextResponse.json({ error: `Max ${MAX_CUSTOM_LINKS} custom links` }, { status: 400 })
  }

  const finalIcon = (icon || '').toString().trim() || detectIcon(normalizedUrl)

  const { data, error } = await supabase
    .from('user_custom_links')
    .insert({
      user_id: user.id,
      title: trimmedTitle,
      url: normalizedUrl,
      icon: finalIcon,
      position: count || 0,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ link: data })
}