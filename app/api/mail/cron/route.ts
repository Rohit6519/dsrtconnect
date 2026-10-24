import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { wakeDueSnoozes } from '@/lib/mail/security/SnoozeEngine'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cronToken = searchParams.get('token')

  // Security check: match token with env variable
  const expectedSecret = process.env.CRON_SECRET || 'dsrt_cron_2025_secure_key'
  if (cronToken !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized cron trigger' }, { status: 401 })
  }

  // Use Supabase Service Role Key to bypass RLS in background processing
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    const results = {
      unsnoozed: 0,
      scheduled_sent: 0,
      errors: [] as string[],
    }

    // 1. Process Snoozed Emails via Phase 13 SnoozeEngine
    try {
      results.unsnoozed = await wakeDueSnoozes()
    } catch (snoozeErr: any) {
      results.errors.push(`Snooze restore error: ${snoozeErr.message}`)
    }

    // 2. Fetch all drafts that are scheduled for NOW or in the past
    const { data: scheduledDrafts, error: draftsErr } = await supabase
      .from('mail_drafts')
      .select('*')
      .lte('scheduled_send_at', new Date().toISOString())

    if (draftsErr) {
      results.errors.push(`Scheduled fetch error: ${draftsErr.message}`)
    } else if (scheduledDrafts && scheduledDrafts.length > 0) {
      for (const draft of scheduledDrafts) {
        try {
          const bodyText = (draft.body_html || '').replace(/<[^>]*>/g, ' ').trim()
          let threadId = draft.reply_to_thread_id

          // Create new thread if this is not a reply
          if (!threadId) {
            const { data: newThread, error: threadErr } = await supabase
              .from('mail_threads')
              .insert({
                subject: draft.subject || '(no subject)',
                source_type: 'direct',
                last_message_at: new Date().toISOString(),
                last_message_preview: bodyText.slice(0, 150),
                last_message_sender_identity_id: draft.from_identity_id,
                message_count: 1,
              })
              .select()
              .single()

            if (threadErr) throw threadErr
            threadId = newThread.id

            // Add sender participant
            if (draft.from_identity_id) {
              await supabase.from('mail_thread_participants').insert({
                thread_id: threadId,
                identity_id: draft.from_identity_id,
                role: 'from',
                is_read: true,
                folder: 'sent',
                last_read_at: new Date().toISOString(),
              })
            }

            // Add recipient participants
            const allRecipients = [
              ...(Array.isArray(draft.to_addresses) ? draft.to_addresses : []),
              ...(Array.isArray(draft.cc_addresses) ? draft.cc_addresses : []),
              ...(Array.isArray(draft.bcc_addresses) ? draft.bcc_addresses : []),
            ]

            const seenIdentities = new Set<string>()
            if (draft.from_identity_id) seenIdentities.add(draft.from_identity_id)

            for (const r of allRecipients) {
              const recId = r.identity_id || r.id
              if (recId && !seenIdentities.has(recId)) {
                seenIdentities.add(recId)
                await supabase.from('mail_thread_participants').insert({
                  thread_id: threadId,
                  identity_id: recId,
                  role: r.role || 'to',
                  folder: 'inbox',
                  is_read: false,
                })
              }
            }
          }

          // Insert Message
          const { error: msgErr } = await supabase.from('mail_messages').insert({
            thread_id: threadId,
            sender_identity_id: draft.from_identity_id,
            actual_user_id: draft.user_id,
            body_html: draft.body_html || '',
            body_text: bodyText,
            attachments: draft.attachments || [],
            reply_to_message_id: draft.reply_to_message_id,
            sent_at: new Date().toISOString(),
          })

          if (msgErr) throw msgErr

          // Delete draft once sent
          await supabase.from('mail_drafts').delete().eq('id', draft.id)

          results.scheduled_sent++
        } catch (err: any) {
          results.errors.push(`Failed to dispatch draft ${draft.id}: ${err.message}`)
        }
      }
    }

    return NextResponse.json({ success: true, timestamp: new Date().toISOString(), results })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}