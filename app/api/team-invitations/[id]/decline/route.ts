import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { trackOpportunityEvent } from '@/lib/events/opportunity-events'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const reason = body.reason ? String(body.reason).slice(0, 500) : null

  try {
    const { data: invitation } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('id', id)
      .single()

    if (!invitation) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (invitation.invitee_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (invitation.status !== 'pending') {
      return NextResponse.json({ error: `Cannot decline invitation with status "${invitation.status}"` }, { status: 400 })
    }

    const { data: updated, error } = await supabase
      .from('team_invitations')
      .update({
        status: 'declined',
        declined_at: new Date().toISOString(),
        decline_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Notify employer
    try {
      const { data: profile } = await supabase.from('users').select('full_name').eq('id', user.id).single()
      await supabase.from('notifications').insert({
        user_id: invitation.inviter_id,
        type: 'team_invitation_declined',
        from_user_id: user.id,
        entity_type: invitation.destination_type,
        entity_id: invitation.destination_id,
        title: `${profile?.full_name || 'Applicant'} declined team invitation`,
        message: `The invitation to join ${invitation.destination_name} was declined.`,
        action_url: `/looking-for/my-opportunities/${invitation.opportunity_id}`,
      })
    } catch {}

    await trackOpportunityEvent({
      opportunity_id: invitation.opportunity_id,
      user_id: user.id,
      event_type: 'team_invitation_declined' as any,
      source: 'team_invitations',
      metadata: { invitation_id: id, reason },
    }).catch(() => {})

    return NextResponse.json({ ok: true, invitation: updated })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}