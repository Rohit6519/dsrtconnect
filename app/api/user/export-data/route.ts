import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Collect all user data
  const [
    { data: profile },
    { data: skills },
    { data: education },
    { data: experience },
    { data: journeyEvents },
    { data: projects },
    { data: tasks },
    { data: posts },
    { data: comments },
    { data: follows },
    { data: notifications },
    { data: integrations },
  ] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).single(),
    supabase.from('user_skills').select('*, skills(*)').eq('user_id', user.id),
    supabase.from('user_education').select('*').eq('user_id', user.id),
    supabase.from('user_experience').select('*').eq('user_id', user.id),
    supabase.from('journey_events').select('*').eq('user_id', user.id),
    supabase.from('projects').select('*').eq('founder_id', user.id),
    supabase.from('project_tasks').select('*').eq('user_id', user.id),
    supabase.from('posts').select('*').eq('user_id', user.id),
    supabase.from('post_comments').select('*').eq('user_id', user.id),
    supabase.from('follows').select('*').eq('follower_id', user.id),
    supabase.from('notifications').select('*').eq('user_id', user.id),
    supabase.from('user_integrations').select('id, provider, provider_username, created_at').eq('user_id', user.id),
  ])

  const exportData = {
    export_date: new Date().toISOString(),
    dsrt_version: '1.0',
    user_id: user.id,
    profile,
    skills,
    education,
    experience,
    journey_events: journeyEvents,
    projects,
    tasks,
    posts,
    comments,
    follows,
    notifications,
    integrations, // metadata only, not tokens
  }

  // Log audit
  await supabase.rpc('log_audit', {
    p_user_id: user.id,
    p_action: 'export_data',
    p_severity: 'info',
  })

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="dsrt-export-${user.id}-${Date.now()}.json"`,
    },
  })
}