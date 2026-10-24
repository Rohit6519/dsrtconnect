import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Sign in to apply' }, { status: 401 })

  try {
    const body = await request.json()

    // Fetch project (need name + slug for inbox message)
    const { data: project } = await supabase
      .from('projects')
      .select('id, name, slug, founder_id, user_id, is_public, application_permission')
      .eq('slug', slug)
      .single()

    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (project.founder_id === user.id || project.user_id === user.id) {
      return NextResponse.json({ error: 'You cannot apply to your own project' }, { status: 400 })
    }

    // Fetch role
    const { data: role } = await supabase
      .from('project_roles')
      .select('id, status, project_id, title')
      .eq('id', id)
      .single()

    if (!role || role.project_id !== project.id) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }
    if (role.status !== 'open') {
      return NextResponse.json({ error: 'This role is no longer accepting applications' }, { status: 400 })
    }

    const cover_letter = (body.cover_letter || '').trim()
    if (cover_letter.length < 20) {
      return NextResponse.json({ error: 'Cover letter must be at least 20 characters' }, { status: 400 })
    }

    // Insert application (existing logic)
    const insert: Record<string, any> = {
      role_id: id,
      project_id: project.id,
      applicant_id: user.id,
      cover_letter: cover_letter.slice(0, 5000),
      portfolio_url: body.portfolio_url || null,
      github_url: body.github_url || null,
      linkedin_url: body.linkedin_url || null,
      resume_url: body.resume_url || null,
      availability: body.availability || null,
      expected_hours: body.expected_hours || null,
      start_date: body.start_date || null,
      answers: body.answers || {},
      status: 'pending',
    }

    const { data: application, error: appErr } = await supabase
      .from('project_role_applications')
      .insert(insert)
      .select()
      .single()

    if (appErr) {
      if (appErr.code === '23505') {
        return NextResponse.json({ error: 'You have already applied to this role' }, { status: 409 })
      }
      throw appErr
    }

    // ═══════════════════════════════════════════════════════════════
    // NEW: Create inbox message for project owner (mirrors Batch 2 venture pattern)
    // ═══════════════════════════════════════════════════════════════
    const recipientId = project.founder_id || project.user_id

    if (recipientId && recipientId !== user.id) {
      const { data: applicant } = await supabase
        .from('users')
        .select('full_name, username')
        .eq('id', user.id)
        .single()

      const applicantName = applicant?.full_name || applicant?.username || 'A builder'
      const subject = 'New applicant for ' + role.title + ' at ' + project.name

      const messageBody = [
        applicantName + ' just applied for the ' + role.title + ' role.',
        '',
        cover_letter ? 'Cover letter:\n' + cover_letter : '(No cover letter provided)',
        '',
        body.availability ? 'Availability: ' + body.availability : '',
        body.expected_hours ? 'Expected hours: ' + body.expected_hours + ' hrs/week' : '',
        body.start_date ? 'Available to start: ' + body.start_date : '',
      ].filter(Boolean).join('\n')

      await supabase
        .from('inbox_messages')
        .insert({
          recipient_id: recipientId,
          sender_id: user.id,
          message_type: 'role_application',
          status: 'unread',
          subject: subject.slice(0, 200),
          body: messageBody.slice(0, 5000),
          reference_type: 'project',
          reference_id: project.id,
          reference_name: project.name,
          reference_slug: project.slug,
          metadata: {
            project_role_application_id: application.id,
            project_role_id: role.id,
            project_role_title: role.title,
            portfolio_url: body.portfolio_url,
            github_url: body.github_url,
            linkedin_url: body.linkedin_url,
            resume_url: body.resume_url,
          },
        })
        .then(() => {}, (e) => console.error('Inbox message insert failed:', e))
    }

    // Track signal for recommendation algorithm
    await supabase.from('user_activity_signals').insert({
      user_id: user.id,
      signal_type: 'apply',
      entity_type: 'project_role',
      entity_id: role.id,
      weight: 8.0,
    }).then(() => {}, () => {})

    return NextResponse.json({ success: true, application })
  } catch (e: any) {
    console.error('Apply error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}