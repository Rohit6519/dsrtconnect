import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Find invitation(s) for this application where user is invitee or inviter
    const { data: invitations } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('application_id', applicationId)
      .or(`invitee_id.eq.${user.id},inviter_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (!invitations || invitations.length === 0) {
      return NextResponse.json({ invitation: null })
    }

    // Return the most recent one
    const invitation = invitations[0]

    // Enrich
    let destination = null
    if (invitation.destination_type === 'project') {
      const { data: p } = await supabase.from('projects').select('id, name, slug, icon').eq('id', invitation.destination_id).single()
      destination = p
    } else {
      const { data: v } = await supabase.from('ventures').select('id, name, slug, logo_url').eq('id', invitation.destination_id).single()
      destination = v
    }

    const { data: inviter } = await supabase
      .from('users')
      .select('id, full_name, username, avatar_url')
      .eq('id', invitation.inviter_id)
      .single()

    return NextResponse.json({
      invitation,
      destination,
      inviter,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}