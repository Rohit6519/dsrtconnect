import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { trackOpportunityEvent } from '@/lib/events/opportunity-events'

export const dynamic = 'force-dynamic'

/**
 * GET /api/opportunities/dashboard/messages
 * Aggregates inbox_messages + opportunity_internal_notes into per-application
 * conversations for every opportunity the current user owns or manages.
 */
export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1) Managed opportunities
    const [ownedRes, membersRes] = await Promise.all([
      supabase.from('opportunities').select('id').eq('poster_user_id', user.id),
      supabase
        .from('opportunity_members')
        .select('opportunity_id, role')
        .eq('user_id', user.id)
        .in('role', ['owner', 'admin', 'manager', 'reviewer']),
    ])

    const oppIds = Array.from(
      new Set([
        ...(ownedRes.data || []).map((o: any) => o.id),
        ...(membersRes.data || []).map((m: any) => m.opportunity_id),
      ])
    )

    if (oppIds.length === 0) {
      return NextResponse.json({ conversations: [] })
    }

    // 2) Messages tied to those opportunities
    const { data: messages, error: msgErr } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('reference_type', 'opportunity')
      .in('reference_id', oppIds)
      .order('created_at', { ascending: true })

    if (msgErr) throw msgErr

    const msgs = messages || []
    if (msgs.length === 0) {
      return NextResponse.json({ conversations: [] })
    }

    // 3) Group by application_id from metadata
    const appIds = [
      ...new Set(
        msgs
          .map((m: any) => m?.metadata?.opportunity_application_id)
          .filter(Boolean)
      ),
    ]

    if (appIds.length === 0) {
      return NextResponse.json({ conversations: [] })
    }

    // 4) Load apps, internal notes, users, opportunities
    const [{ data: apps }, { data: notes }] = await Promise.all([
      supabase
        .from('opportunity_applications')
        .select(
          'id, pipeline_stage, status, applicant_id, applicant_snapshot, opportunity_id'
        )
        .in('id', appIds),
      supabase
        .from('opportunity_internal_notes')
        .select('*')
        .in('application_id', appIds)
        .order('created_at', { ascending: true }),
    ])

    const activeApps = apps || []
    const internalNotes = notes || []

    if (activeApps.length === 0) {
      return NextResponse.json({ conversations: [] })
    }

    const userIds = Array.from(
      new Set(
        [
          ...activeApps.map((a: any) => a.applicant_id),
          ...internalNotes.map((n: any) => n.author_id),
          ...msgs.map((m: any) => m.sender_id),
        ].filter(Boolean)
      )
    )

    const oppIdsForApps = Array.from(
      new Set(activeApps.map((a: any) => a.opportunity_id))
    )

    const [{ data: users }, { data: oppMeta }] = await Promise.all([
      userIds.length
        ? supabase
            .from('users')
            .select('id, username, full_name, avatar_url, is_verified')
            .in('id', userIds)
        : Promise.resolve({ data: [] as any[] }),
      supabase
        .from('opportunities')
        .select('id, title, slug, opportunity_number')
        .in('id', oppIdsForApps),
    ])

    const userMap = new Map((users || []).map((u: any) => [u.id, u]))
    const oppMap = new Map((oppMeta || []).map((o: any) => [o.id, o]))
    const appMap = new Map(activeApps.map((a: any) => [a.id, a]))

    // 5) Build conversations
    const convosMap = new Map<string, any>()

    for (const m of msgs) {
      const appId = m?.metadata?.opportunity_application_id
      if (!appId || !appMap.has(appId)) continue

      if (!convosMap.has(appId)) {
        const app: any = appMap.get(appId)
        convosMap.set(appId, {
          application_id: appId,
          opportunity: oppMap.get(app.opportunity_id) || null,
          applicant:
            userMap.get(app.applicant_id) || app.applicant_snapshot || null,
          application: {
            pipeline_stage: app.pipeline_stage,
            status: app.status,
          },
          timeline: [] as any[],
          unread_count: 0,
          last_activity_at: m.created_at,
        })
      }

      const c = convosMap.get(appId)
      if (m.recipient_id === user.id && m.status === 'unread') {
        c.unread_count++
      }
      if (new Date(m.created_at) > new Date(c.last_activity_at)) {
        c.last_activity_at = m.created_at
      }

      c.timeline.push({
        type: 'message',
        id: m.id,
        body: m.body,
        sender_id: m.sender_id,
        sender: userMap.get(m.sender_id) || null,
        created_at: m.created_at,
        is_owner: m.sender_id === user.id,
        recipient_id: m.recipient_id,
        status: m.status,
      })
    }

    for (const n of internalNotes) {
      const appId = n.application_id
      if (!appId || !convosMap.has(appId)) continue
      const c = convosMap.get(appId)

      if (new Date(n.created_at) > new Date(c.last_activity_at)) {
        c.last_activity_at = n.created_at
      }
      c.timeline.push({
        type: 'note',
        id: n.id,
        body: n.body,
        author_id: n.author_id,
        author: userMap.get(n.author_id) || null,
        created_at: n.created_at,
      })
    }

    const conversations = Array.from(convosMap.values())
    for (const c of conversations) {
      c.timeline.sort(
        (a: any, b: any) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    }
    conversations.sort(
      (a, b) =>
        new Date(b.last_activity_at).getTime() -
        new Date(a.last_activity_at).getTime()
    )

    return NextResponse.json({ conversations })
  } catch (e: any) {
    console.error('dashboard/messages GET error:', e)
    return NextResponse.json(
      { error: e?.message || 'Failed', conversations: [] },
      { status: 500 }
    )
  }
}

/**
 * POST /api/opportunities/dashboard/messages
 * Sends a reply to an applicant (opportunity manager only).
 * body: { application_id: string, text: string }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const application_id = String(body.application_id || '').trim()
  const text = String(body.text || '').trim()

  if (!application_id || !text) {
    return NextResponse.json(
      { error: 'application_id and text required' },
      { status: 400 }
    )
  }

  try {
    const { data: app } = await supabase
      .from('opportunity_applications')
      .select('id, opportunity_id, applicant_id')
      .eq('id', application_id)
      .single()

    if (!app) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    // Access check
    const { data: opp } = await supabase
      .from('opportunities')
      .select('poster_user_id, title, slug')
      .eq('id', app.opportunity_id)
      .single()

    if (!opp) {
      return NextResponse.json(
        { error: 'Opportunity not found' },
        { status: 404 }
      )
    }

    let canAccess = opp.poster_user_id === user.id
    if (!canAccess) {
      const { data: m } = await supabase
        .from('opportunity_members')
        .select('role')
        .eq('opportunity_id', app.opportunity_id)
        .eq('user_id', user.id)
        .maybeSingle()
      canAccess =
        !!m &&
        ['owner', 'admin', 'manager', 'reviewer'].includes((m as any).role)
    }

    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: msg, error } = await supabase
      .from('inbox_messages')
      .insert({
        recipient_id: app.applicant_id,
        sender_id: user.id,
        message_type: 'role_application_reply',
        status: 'unread',
        subject: `Re: ${(opp.title || 'Opportunity').slice(0, 180)}`,
        body: text.slice(0, 5000),
        reference_type: 'opportunity',
        reference_id: app.opportunity_id,
        reference_name: opp.title || null,
        reference_slug: opp.slug || null,
        metadata: {
          opportunity_application_id: application_id,
          opportunity_id: app.opportunity_id,
        },
      })
      .select()
      .single()

    if (error) throw error

    // Best-effort event
    trackOpportunityEvent({
      opportunity_id: app.opportunity_id,
      user_id: user.id,
      event_type: 'message_sent' as any,
      source: 'dashboard_messages',
      metadata: { application_id },
    }).catch(() => {})

    return NextResponse.json({ message: msg })
  } catch (e: any) {
    console.error('dashboard/messages POST error:', e)
    return NextResponse.json(
      { error: e?.message || 'Failed' },
      { status: 500 }
    )
  }
}