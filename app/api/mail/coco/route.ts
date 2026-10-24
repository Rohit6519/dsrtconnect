import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { threadId, action, customPrompt } = await request.json()

    if (!threadId) return NextResponse.json({ error: 'Thread ID required' }, { status: 400 })

    // 1. Verify access to thread
    const { data: identities } = await supabase.rpc('fn_get_user_mail_identities', { p_user_id: user.id })
    const ownedIds = (identities || []).map((i: any) => i.identity_id)

    const { data: part } = await supabase
      .from('mail_thread_participants')
      .select('id')
      .eq('thread_id', threadId)
      .in('identity_id', ownedIds)
      .limit(1)

    if (!part || part.length === 0) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    // 2. Fetch thread messages
    const { data: messages } = await supabase
      .from('mail_messages')
      .select('body_text, sent_at, sender_identity_id, mail_identities(display_name)')
      .eq('thread_id', threadId)
      .order('sent_at', { ascending: true })

    if (!messages || messages.length === 0) return NextResponse.json({ error: 'No messages to analyze' }, { status: 400 })

    // 3. Compile context for AI
    const threadContext = messages.map((m: any) => {
      const rawIdentities = m.mail_identities
      const senderName = Array.isArray(rawIdentities) 
        ? rawIdentities[0]?.display_name 
        : rawIdentities?.display_name || 'Unknown'
      return `From: ${senderName}\nDate: ${new Date(m.sent_at).toLocaleString()}\nMessage: ${m.body_text || ''}`
    }).join('\n\n---\n\n')

    // 4. Construct System Prompt based on Action
    let systemPrompt = "You are COCO, an elite AI assistant embedded in DSRT Mail. You are helpful, extremely concise, and professional."
    let userPrompt = ""

    if (action === 'Summarize this thread') {
      userPrompt = `Please provide a concise, 3-bullet-point summary of this email thread:\n\n${threadContext}`
    } else if (action === 'Extract action items') {
      userPrompt = `Extract all action items, deliverables, and promises from this thread. Format as a checkbox list:\n\n${threadContext}`
    } else if (action === 'Draft a professional reply') {
      userPrompt = `Draft a polite, professional reply to the last message in this thread. Leave placeholders like [Your Name] where appropriate:\n\n${threadContext}`
    } else if (action === 'Rewrite in a friendlier tone') {
      userPrompt = `Rewrite the last message in this thread to be warmer and friendlier, but keep it professional:\n\n${threadContext}`
    } else {
      userPrompt = `${customPrompt || 'Analyze this thread'}\n\nContext:\n${threadContext}`
    }

    // 5. Call AI API
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ result: "GROQ_API_KEY is not configured in environment variables." })
    }

    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.5,
        max_tokens: 1024
      })
    })

    const aiData = await aiResponse.json()
    if (!aiResponse.ok) throw new Error(aiData.error?.message || 'AI request failed')

    return NextResponse.json({ result: aiData.choices[0]?.message?.content || 'No response generated.' })

  } catch (e: any) {
    console.error('COCO error:', e)
    return NextResponse.json({ error: e.message || 'AI error' }, { status: 500 })
  }
}