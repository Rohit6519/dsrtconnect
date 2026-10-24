import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  context: { params: Promise<{ username: string }> }
) {
  const { username } = await context.params
  const supabase = await createClient()
  const { data: { user: viewer } } = await supabase.auth.getUser()

  try {
    const { data: profileUser, error: userErr } = await supabase
      .from('users')
      .select('id, username, full_name')
      .eq('username', username)
      .single()

    if (userErr || !profileUser) {
      return NextResponse.json({ error: 'User not found', projects: [] }, { status: 404 })
    }

    const isSelf = viewer?.id === profileUser.id

    let query = supabase
      .from('projects')
      .select(`
        id, slug, name, tagline, short_description, logo_url, cover_image_url,
        stage, status, industry, sector, location, is_open_source, is_dsrt_verified,
        follower_count, view_count, created_at, updated_at, is_public, visibility
      `)
      .or(`founder_id.eq.${profileUser.id},user_id.eq.${profileUser.id}`)
      .neq('status', 'archived')

    if (!isSelf) {
      query = query.or('is_public.eq.true,visibility.eq.public')
    }

    const { data: ownedProjects, error } = await query.order('updated_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      projects: ownedProjects || [],
      count: (ownedProjects || []).length,
      user: profileUser,
    })
  } catch (e: any) {
    console.error('[Profile Projects API] error:', e)
    return NextResponse.json({ error: e?.message, projects: [] }, { status: 500 })
  }
}