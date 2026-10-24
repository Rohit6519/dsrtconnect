import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ items: [] })

  try {
    // Get all follows
    const { data: follows } = await supabase
      .from('follows')
      .select('following_type, following_id, created_at')
      .eq('follower_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!follows || follows.length === 0) {
      return NextResponse.json({ items: [] })
    }

    const userIds = follows.filter(f => f.following_type === 'user').map(f => f.following_id)
    const ventureIds = follows.filter(f => f.following_type === 'venture').map(f => f.following_id)

    // Fetch profile data + latest post timestamps in parallel
    const [usersRes, venturesRes] = await Promise.all([
      userIds.length
        ? supabase.from('users').select('id, username, full_name, avatar_url, is_verified').in('id', userIds)
        : { data: [] },
      ventureIds.length
        ? supabase.from('ventures').select('id, slug, name, logo_url, is_verified').in('id', ventureIds)
        : { data: [] },
    ])

    // Fetch latest post timestamp per publisher
    const allPublisherIds = [...userIds, ...ventureIds]
    const { data: latestPosts } = allPublisherIds.length
      ? await supabase
          .from('posts')
          .select('publisher_id, publisher_type, created_at')
          .in('publisher_id', allPublisherIds)
          .eq('visibility', 'global')
          .or('is_draft.is.null,is_draft.eq.false')
          .order('created_at', { ascending: false })
      : { data: [] }

    const latestMap = new Map<string, string>()
    for (const p of (latestPosts || []) as any[]) {
      const key = `${p.publisher_type}-${p.publisher_id}`
      if (!latestMap.has(key)) latestMap.set(key, p.created_at)
    }

    const now = Date.now()
    const items: any[] = []

    for (const u of (usersRes.data || []) as any[]) {
      const latest = latestMap.get(`person-${u.id}`)
      const hasNew = latest ? (now - new Date(latest).getTime()) < (48 * 60 * 60 * 1000) : false
      items.push({
        id: u.id,
        name: u.full_name || u.username,
        handle: u.username,
        avatar_url: u.avatar_url,
        is_verified: u.is_verified,
        type: 'user',
        slug: u.username,
        latest_post_at: latest || null,
        has_new: hasNew,
      })
    }

    for (const v of (venturesRes.data || []) as any[]) {
      const latest = latestMap.get(`venture-${v.id}`)
      const hasNew = latest ? (now - new Date(latest).getTime()) < (48 * 60 * 60 * 1000) : false
      items.push({
        id: v.id,
        name: v.name,
        handle: v.slug,
        avatar_url: v.logo_url,
        is_verified: v.is_verified,
        type: 'venture',
        slug: v.slug,
        latest_post_at: latest || null,
        has_new: hasNew,
      })
    }

    // Sort: has_new first, then by latest_post_at desc
    items.sort((a, b) => {
      if (a.has_new && !b.has_new) return -1
      if (!a.has_new && b.has_new) return 1
      const aT = a.latest_post_at ? new Date(a.latest_post_at).getTime() : 0
      const bT = b.latest_post_at ? new Date(b.latest_post_at).getTime() : 0
      return bT - aT
    })

    return NextResponse.json({ items })
  } catch (e: any) {
    console.error('Following sidebar error:', e)
    return NextResponse.json({ items: [], error: e?.message }, { status: 500 })
  }
}