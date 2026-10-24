import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const VALID_REACTIONS = ['like', 'love', 'insightful', 'celebrate', 'support', 'curious', 'thinking']

export async function POST(
  req: Request,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const reactionType = body.reaction_type

    if (!VALID_REACTIONS.includes(reactionType)) {
      return NextResponse.json({ error: 'Invalid reaction' }, { status: 400 })
    }

    // Check if reaction already exists
    const { data: existing } = await supabase
      .from('venture_update_reactions')
      .select('id')
      .eq('update_id', id)
      .eq('user_id', user.id)
      .eq('reaction_type', reactionType)
      .maybeSingle()

    if (existing) {
      // Toggle off
      await supabase
        .from('venture_update_reactions')
        .delete()
        .eq('id', existing.id)
      return NextResponse.json({ success: true, reacted: false })
    } else {
      // Add reaction
      await supabase
        .from('venture_update_reactions')
        .insert({
          update_id: id,
          user_id: user.id,
          reaction_type: reactionType,
        })
      return NextResponse.json({ success: true, reacted: true })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}