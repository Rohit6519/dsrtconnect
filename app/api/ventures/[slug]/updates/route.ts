import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'published'
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

  try {
    const { data: venture } = await supabase
      .from('ventures')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (!venture) return NextResponse.json({ error: 'Venture not found' }, { status: 404 })

    let isMember = false
    if (user) {
      const { data: memberCheck } = await supabase.rpc('is_venture_owner_or_member', {
        p_venture_id: venture.id,
        p_user_id: user.id
      })
      isMember = !!memberCheck
    }

    let query = supabase
      .from('venture_updates')
      .select('*, author:users!created_by(id, full_name, username, avatar_url)', { count: 'exact' })
      .eq('venture_id', venture.id)
      .is('deleted_at', null)
      .order('is_pinned', { ascending: false })
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (isMember && (status === 'draft' || status === 'archived' || status === 'all')) {
      if (status !== 'all') query = query.eq('status', status)
    } else {
      query = query.eq('status', 'published')
      if (!isMember) query = query.eq('visibility', 'public')
    }

    const { data: updates, count, error } = await query.range(offset, offset + limit - 1)
    if (error) throw error

    let userReactions: Record<string, string[]> = {}
    let userSaves: Set<string> = new Set()

    if (user && updates && updates.length > 0) {
      const updateIds = updates.map(u => u.id)
      const [reactionsRes, savesRes] = await Promise.all([
        supabase
          .from('venture_update_reactions')
          .select('update_id, reaction_type')
          .eq('user_id', user.id)
          .in('update_id', updateIds),
        supabase
          .from('venture_update_saves')
          .select('update_id')
          .eq('user_id', user.id)
          .in('update_id', updateIds),
      ])

      ;(reactionsRes.data || []).forEach((r: any) => {
        if (!userReactions[r.update_id]) userReactions[r.update_id] = []
        userReactions[r.update_id].push(r.reaction_type)
      })
      userSaves = new Set((savesRes.data || []).map((s: any) => s.update_id))
    }

    const enriched = (updates || []).map((u: any) => ({
      ...u,
      user_reactions: userReactions[u.id] || [],
      is_saved: userSaves.has(u.id),
    }))

    return NextResponse.json({ updates: enriched, total: count || 0, can_edit: isMember })
  } catch (e: any) {
    console.error('List updates error:', e)
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: venture } = await supabase.from('ventures').select('id').eq('slug', slug).single()
    if (!venture) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: isMember } = await supabase.rpc('is_venture_owner_or_member', {
      p_venture_id: venture.id,
      p_user_id: user.id
    })
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const status = body.status === 'draft' ? 'draft' : 'published'
    const contentBlocks = Array.isArray(body.content_blocks) ? body.content_blocks : []
    const contentText = contentBlocks
      .map((b: any) => b.content || '')
      .filter(Boolean)
      .join(' ')
      .slice(0, 3000)

    const insert: Record<string, any> = {
      venture_id: venture.id,
      created_by: user.id,        // ✅ CORRECT COLUMN
      last_edited_by: user.id,
      title: (body.title || '').trim().slice(0, 300) || null,
      content: contentText,
      content_blocks: contentBlocks,
      content_text: contentText,
      type: body.type || 'general',
      status,
      visibility: body.visibility || 'public',
      cover_asset_id: body.cover_asset_id || null,
      is_public: true,
    }

    if (status === 'published') {
      insert.published_at = new Date().toISOString()
    }

    const { data: update, error } = await supabase
      .from('venture_updates')
      .insert(insert)
      .select('*, author:users!created_by(id, full_name, username, avatar_url)')
      .single()

    if (error) throw error

    try {
      await supabase.rpc('fn_venture_audit', {
        p_venture_id: venture.id,
        p_action: `update.${status === 'draft' ? 'drafted' : 'published'}`,
        p_target_type: 'update',
        p_target_id: update.id,
        p_after: update
      })
    } catch {}

    try {
      await supabase.rpc('fn_venture_emit_event', {
        p_venture_id: venture.id,
        p_event_type: 'venture.update.created',
        p_aggregate_type: 'update',
        p_aggregate_id: update.id,
        p_payload: { status }
      })
    } catch {}

    return NextResponse.json({ success: true, update })
  } catch (e: any) {
    console.error('Create update error:', e)
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}