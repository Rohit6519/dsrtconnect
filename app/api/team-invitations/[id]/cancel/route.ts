import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { trackOpportunityEvent } from '@/lib/events/opportunity-events'

export const dynamic = 'force-dynamic'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: invitation } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('id', id)
      .single()

    if (!invitation) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (invitation.inviter_id !== user.id) return NextResponse.json({ error: 'Only the inviter can cancel' }, { status: 403 })
    if (invitation.status !== 'pending') {
      return NextResponse.json({ error: `Cannot cancel invitation with status "${invitation.status}"` }, { status: 400 })
    }

    const { data: updated, error } = await supabase
      .from('team_invitations')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Notify applicant
    try {
      await supabase.from('notifications').insert({
        user_id: invitation.invitee_id,
        type: 'team_invitation_cancelled',
        from_user_id: user.id,
        entity_type: invitation.destination_type,
        entity_id: invitation.destination_id,
        title: `Team invitation cancelled`,
        message: `The invitation to join ${invitation.destination_name} has been withdrawn.`,
        action_url: `/looking-for/my-applications/${invitation.application_id}`,
      })
    } catch {}

    await trackOpportunityEvent({
      opportunity_id: invitation.opportunity_id,
      user_id: user.id,
      event_type: 'team_invitation_cancelled' as any,
      source: 'team_invitations',
      metadata: { invitation_id: id },
    }).catch(() => {})

    return NextResponse.json({ ok: true, invitation: updated })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}