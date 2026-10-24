import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const action = body.action // 'accepted' | 'declined'

    if (!['accepted', 'declined'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Verify user owns an identity that participates in this thread
    const { data: userIdentities } = await supabase.rpc('fn_get_user_mail_identities', {
      p_user_id: user.id,
    })
    const ownedIds = (userIdentities || []).map((i: any) => i.identity_id)

    const { data: myPart } = await supabase
      .from('mail_thread_participants')
      .select('*')
      .eq('thread_id', id)
      .in('identity_id', ownedIds)
      .limit(1)
      .maybeSingle()

    if (!myPart) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    // Fetch thread
    const { data: thread } = await supabase
      .from('mail_threads')
      .select('*')
      .eq('id', id)
      .single()

    if (!thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 })

    // Update thread action state
    await supabase
      .from('mail_threads')
      .update({ action_state: action, updated_at: new Date().toISOString() })
      .eq('id', id)

    // Cascade effects based on source_type
    if (thread.source_type === 'connect' && thread.source_entity_type === 'user' && thread.source_entity_id) {
      // Add to builder_connections (NOT follow — those are separate systems)
      await supabase
        .from('builder_connections')
        .upsert({
          requester_id: thread.source_entity_id,
          recipient_id: user.id,
          status: action === 'accepted' ? 'accepted' : 'declined',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'requester_id,recipient_id' })
        .then(() => {}, () => {})
    } else if (thread.source_type === 'application' && thread.source_entity_id) {
      const statusText = action === 'accepted' ? 'accepted' : 'rejected'
      // Update opportunity_applications
      await supabase
        .from('opportunity_applications')
        .update({ status: statusText, pipeline_stage: statusText, updated_at: new Date().toISOString() })
        .eq('opportunity_id', thread.source_entity_id)
        .then(() => {}, () => {})
      // Update looking_for_applications
      await supabase
        .from('looking_for_applications')
        .update({ status: statusText, pipeline_stage: statusText })
        .or(`request_id.eq.${thread.source_entity_id},venture_lf_id.eq.${thread.source_entity_id},project_role_id.eq.${thread.source_entity_id}`)
        .then(() => {}, () => {})
    } else if (thread.source_type === 'venture_invite' && thread.source_entity_id) {
      // Update venture connections
      await supabase
        .from('venture_connections')
        .update({ status: action === 'accepted' ? 'accepted' : 'declined', responded_at: new Date().toISOString() })
        .eq('venture_id', thread.source_entity_id)
        .then(() => {}, () => {})
    }

    // Post an inline system message noting the action
    const { data: userProfile } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const actorName = userProfile?.full_name || 'The recipient'

    // Find a system identity or use the acting user's identity
    const actingIdentityId = myPart.identity_id
    const noticeHtml = action === 'accepted'
      ? `<div style="padding:12px 16px;background:rgba(52,211,153,0.08);border:1px solid rgba(52,211,153,0.2);border-radius:10px;color:#6ee7b7;font-size:12px;font-weight:600;">✓ ${actorName} accepted this request</div>`
      : `<div style="padding:12px 16px;background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.2);border-radius:10px;color:#fca5a5;font-size:12px;font-weight:600;">✕ ${actorName} declined this request</div>`

    await supabase
      .from('mail_messages')
      .insert({
        thread_id: id,
        sender_identity_id: actingIdentityId,
        actual_user_id: user.id,
        body_html: noticeHtml,
        body_text: `${actorName} ${action} this request.`,
      })

    return NextResponse.json({ success: true, action_state: action })
  } catch (e: any) {
    console.error('Thread action error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}