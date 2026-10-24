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

  const { data: profile } = await supabase
    .from('users')
    .select('admin_role')
    .eq('id', user.id)
    .single()

  if (
    !profile?.admin_role ||
    !['dsrt_super_admin', 'dsrt_hackathon_admin', 'community_hackathon_admin'].includes(
      profile.admin_role
    )
  ) {
    return NextResponse.json({ error: 'Not admin' }, { status: 403 })
  }

  const { title, tagline, themes } = await request.json()

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Missing title' }, { status: 400 })
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are DSRT's hackathon organization assistant. You help admins create professional, exciting hackathon content. Return valid JSON only.`,
        },
        {
          role: 'user',
          content: `Generate content for a hackathon:

Title: ${title}
Tagline: ${tagline || 'not provided'}
Themes: ${themes?.join(', ') || 'not specified'}

Return JSON:
{
  "description": "3-4 paragraph description of the hackathon, its purpose, who should join, what to expect",
  "judging_criteria": "5-6 specific criteria with brief explanations. Format as markdown bullet list",
  "submission_guidelines": "Clear rules and requirements. What teams must submit. Format expectations. Format as markdown",
  "suggested_themes": ["3-5 additional relevant themes"]
}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2000,
    })

    const content = completion.choices[0].message.content
    if (!content) throw new Error('No response')

    const parsed = JSON.parse(content)
    return NextResponse.json(parsed)
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message?.slice(0, 100) || 'AI error' },
      { status: 500 }
    )
  }
}