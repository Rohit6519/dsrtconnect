import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [lookingForApps, modApps] = await Promise.all([
    // Looking For applications
    supabase
      .from('looking_for_applications')
      .select(`
        id, message, resume_url, portfolio_url, github_url, status,
        created_at, updated_at, reviewer_notes,
        posts:post_id (id, title, content, users:user_id(full_name, username, avatar_url)),
        venture_lf:venture_lf_id (
          id, title, type, description,
          ventures:venture_id (id, name, slug, logo_url, industry)
        )
      `)
      .eq('applicant_id', user.id)
      .order('created_at', { ascending: false }),

    // Moderator applications
    supabase
      .from('community_mod_applications')
      .select(`
        id, motivation, experience, role_type, status, created_at,
        communities:community_id (id, name, slug, cover_url)
      `)
      .eq('applicant_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  return NextResponse.json({
    looking_for: lookingForApps.data || [],
    moderator: modApps.data || [],
    total: (lookingForApps.data?.length || 0) + (modApps.data?.length || 0),
  })
}