import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Groq from 'groq-sdk'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { text, type, action = 'improve' } = body

  if (!text?.trim()) {
    return NextResponse.json({ error: 'No text provided' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, tagline, brings, interest_topics')
    .eq('id', user.id)
    .single()

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })

  const systemPrompts: Record<string, string> = {
    improve: `You are DSRT Writing Assistant. Improve the user's post while keeping THEIR voice and intent. Make it clearer, tighter, and more engaging. Do NOT change the meaning. Do NOT add hashtags. Do NOT make it longer than needed. Keep it authentic — don't make it sound corporate. Return ONLY the improved text, no explanations.`,
    pitch: `You are DSRT Writing Assistant. Transform the user's rough idea into a compelling pitch for builders. Include: the problem, the solution, why now, what makes it different. Keep under 200 words. Return ONLY the pitch.`,
    cold_email: `You are DSRT Writing Assistant. Transform the user's rough draft into a professional cold email. Keep it under 100 words. Personal, specific, actionable. Return ONLY the email text.`,
    professional: `You are DSRT Writing Assistant. Make this more professional but still human. Fix grammar and clarity. Do not make it stiff. Return ONLY the improved text.`,
    concise: `You are DSRT Writing Assistant. Make this shorter and punchier without losing meaning. Return ONLY the shortened text.`,
  }

  const system = systemPrompts[action] || systemPrompts.improve

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `${system}\n\nContext: The user is ${profile?.full_name}, ${profile?.tagline}. They are a ${profile?.brings?.join('/')}. The post type is: ${type}.`,
        },
        { role: 'user', content: text },
      ],
      temperature: 0.6,
      max_tokens: 800,
    })

    const improved = completion.choices[0].message.content?.trim()

    return NextResponse.json({ improved })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message?.slice(0, 100) || 'AI error' },
      { status: 500 }
    )
  }
}