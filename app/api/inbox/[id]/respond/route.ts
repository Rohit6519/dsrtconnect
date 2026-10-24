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
    const action = body.action

    if (!['accepted', 'declined'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const { data: msg, error: fetchErr } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('id', id)
      .eq('recipient_id', user.id)
      .single()

    if (fetchErr || !msg) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Update inbox message status
    const { error } = await supabase
      .from('inbox_messages')
      .update({
        status: action,
        responded_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error

    // Cascade to venture_connections (existing behavior)
    if (msg.message_type === 'venture_connection' && msg.metadata?.connection_id) {
      await supabase
        .from('venture_connections')
        .update({
          status: action,
          responded_at: new Date().toISOString(),
        })
        .eq('id', msg.metadata.connection_id)
        .then(() => {}, () => {})
    }

    // Cascade to project_role_applications (legacy path)
    if (msg.message_type === 'role_application' && msg.metadata?.application_id) {
      const dbStatus = action === 'accepted' ? 'accepted' : 'rejected'
      await supabase
        .from('project_role_applications')
        .update({
          status: dbStatus,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', msg.metadata.application_id)
        .then(() => {}, () => {})
    }

    // NEW: Cascade to project_role_applications (new metadata key)
    if (msg.message_type === 'role_application' && msg.metadata?.project_role_application_id) {
      const dbStatus = action === 'accepted' ? 'accepted' : 'rejected'
      await supabase
        .from('project_role_applications')
        .update({
          status: dbStatus,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', msg.metadata.project_role_application_id)
        .then(() => {}, () => {})
    }

    // Cascade to venture_role_applications (Batch 2 existing)
    if (msg.message_type === 'role_application' && msg.metadata?.venture_role_application_id) {
      const dbStatus = action === 'accepted' ? 'accepted' : 'rejected'
      await supabase
        .from('venture_role_applications')
        .update({
          status: dbStatus,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', msg.metadata.venture_role_application_id)
        .then(() => {}, () => {})
    }

    // NEW: Cascade to looking_for_applications (unified table)
    if (msg.metadata?.looking_for_application_id) {
      const pipelineStage = action === 'accepted' ? 'accepted' : 'rejected'
      const dbStatus = action === 'accepted' ? 'accepted' : 'rejected'
      await supabase
        .from('looking_for_applications')
        .update({
          pipeline_stage: pipelineStage,
          status: dbStatus,
          stage_updated_at: new Date().toISOString(),
        })
        .eq('id', msg.metadata.looking_for_application_id)
        .then(() => {}, () => {})
    }

    // Notify the sender about the response
    if (msg.sender_id) {
      const typeLabel = msg.message_type === 'role_application'
        ? 'application'
        : msg.message_type.replace(/_/g, ' ')

      await supabase.from('inbox_messages').insert({
        recipient_id: msg.sender_id,
        sender_id: user.id,
        message_type: 'system',
        status: 'unread',
        subject: 'Your ' + typeLabel + ' was ' + action,
        body: action === 'accepted'
          ? 'Great news — your ' + typeLabel + ' has been accepted.'
          : 'Your ' + typeLabel + ' has been reviewed and declined at this time.',
        reference_type: msg.reference_type,
        reference_id: msg.reference_id,
        reference_name: msg.reference_name,
        reference_slug: msg.reference_slug,
        metadata: msg.metadata || {},
      }).then(() => {}, () => {})
    }

    return NextResponse.json({ success: true, status: action })
  } catch (e: any) {
    console.error('Respond error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}