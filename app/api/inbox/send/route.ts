import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Sign in to send' }, { status: 401 })

  try {
    const body = await request.json()

    const subject = (body.subject || '').trim()
    const messageBody = (body.body || '').trim()
    const referenceType = body.reference_type || null
    const referenceId = body.reference_id || null
    const attachments = Array.isArray(body.attachments) ? body.attachments.slice(0, 5) : []

    if (!subject || subject.length < 3) {
      return NextResponse.json({ error: 'Subject is required (min 3 chars)' }, { status: 400 })
    }
    if (!messageBody || messageBody.length < 10) {
      return NextResponse.json({ error: 'Message is required (min 10 chars)' }, { status: 400 })
    }

    let recipientId: string | null = null
    let referenceName: string | null = null
    let referenceSlug: string | null = null
    let messageType = 'connection_request'

    if (referenceType === 'project' && referenceId) {
      const { data: project } = await supabase
        .from('projects')
        .select('id, name, slug, founder_id, user_id')
        .eq('id', referenceId)
        .single()

      if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      recipientId = project.founder_id || project.user_id
      referenceName = project.name
      referenceSlug = project.slug
      messageType = 'connection_request'
    } else if (referenceType === 'venture' && referenceId) {
      const { data: venture } = await supabase
        .from('ventures')
        .select('id, name, slug, founder_id, user_id')
        .eq('id', referenceId)
        .single()

      if (!venture) return NextResponse.json({ error: 'Venture not found' }, { status: 404 })
      recipientId = venture.founder_id || venture.user_id
      referenceName = venture.name
      referenceSlug = venture.slug
      messageType = 'venture_connection'
    } else if (body.recipient_id) {
      recipientId = body.recipient_id
      messageType = 'connection_request'
    } else {
      return NextResponse.json({ error: 'Recipient or reference required' }, { status: 400 })
    }

    if (!recipientId) return NextResponse.json({ error: 'Could not determine recipient' }, { status: 400 })
    if (recipientId === user.id) return NextResponse.json({ error: 'Cannot send to yourself' }, { status: 400 })

    // Check for duplicate pending (only for reference-based sends)
    if (referenceId) {
      const { data: existing } = await supabase
        .from('inbox_messages')
        .select('id')
        .eq('sender_id', user.id)
        .eq('recipient_id', recipientId)
        .eq('reference_id', referenceId)
        .in('status', ['unread', 'read', 'pending'])
        .maybeSingle()

      if (existing) {
        return NextResponse.json({ error: 'You already have a pending message on this' }, { status: 409 })
      }
    }

    const { data, error } = await supabase
      .from('inbox_messages')
      .insert({
        recipient_id: recipientId,
        sender_id: user.id,
        message_type: messageType,
        status: 'unread',
        subject: subject.slice(0, 200),
        body: messageBody.slice(0, 10000),
        attachments,
        reference_type: referenceType,
        reference_id: referenceId,
        reference_name: referenceName,
        reference_slug: referenceSlug,
        metadata: body.metadata || {},
      })
      .select()
      .single()

    if (error) throw error

    await supabase.from('user_activity_signals').insert({
      user_id: user.id,
      signal_type: 'connect',
      entity_type: referenceType || 'user',
      entity_id: referenceId || recipientId,
      weight: 5.0,
    }).then(() => {}, () => {})

    return NextResponse.json({ success: true, message: data })
  } catch (e: any) {
    console.error('Send message error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}