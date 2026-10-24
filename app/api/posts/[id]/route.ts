import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  try {
    const { data: post, error } = await supabase.from('posts').select('*').eq('id', id).single()
    if (error || !post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    let publisher: any = null
    if (post.publisher_type === 'person') {
      const { data: u } = await supabase.from('users').select('id, username, full_name, avatar_url, tagline, is_verified, follower_count, bio').eq('id', post.publisher_id).single()
      if (u) publisher = { type: 'person', id: u.id, name: u.full_name, handle: u.username, avatar_url: u.avatar_url, tagline: u.tagline, is_verified: u.is_verified, follower_count: u.follower_count, slug: u.username, bio: u.bio }
    } else if (post.publisher_type === 'venture') {
      const { data: v } = await supabase.from('ventures').select('id, slug, name, tagline, description, logo_url, is_verified, follower_count').eq('id', post.publisher_id).single()
      if (v) publisher = { type: 'venture', id: v.id, name: v.name, handle: v.slug, avatar_url: v.logo_url, tagline: v.tagline, description: v.description, is_verified: v.is_verified, follower_count: v.follower_count, slug: v.slug }
    }

    let author: any = null
    if (post.user_id) { const { data: a } = await supabase.from('users').select('id, username, full_name, avatar_url').eq('id', post.user_id).single(); author = a }

    let current_reaction: string | null = null, is_bookmarked = false, is_reposted = false
    if (user) {
      const [rr, br, rpr] = await Promise.all([
        supabase.from('post_reactions').select('reaction_type').eq('post_id', id).eq('user_id', user.id).maybeSingle(),
        supabase.from('post_bookmarks').select('post_id').eq('post_id', id).eq('user_id', user.id).maybeSingle(),
        supabase.from('post_reposts').select('id').eq('original_post_id', id).eq('reposter_user_id', user.id).maybeSingle(),
      ])
      current_reaction = rr.data?.reaction_type || null
      is_bookmarked = !!br.data
      is_reposted = !!rpr.data
    }

    const { data: allReactions } = await supabase.from('post_reactions').select('reaction_type').eq('post_id', id)
    const reaction_breakdown: Record<string, number> = {}
    for (const r of (allReactions || []) as any[]) { reaction_breakdown[r.reaction_type] = (reaction_breakdown[r.reaction_type] || 0) + 1 }

    return NextResponse.json({ post: { ...post, publisher, author, current_reaction, is_reacted: !!current_reaction, is_bookmarked, is_reposted, reaction_breakdown } })
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }) }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: post } = await supabase.from('posts').select('user_id').eq('id', id).single()
  if (!post || post.user_id !== user.id) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  await supabase.from('posts').delete().eq('id', id)
  return NextResponse.json({ success: true })
}