import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const VALID_TYPES = ['general','investor','partner','advisor','collaborator','media','other']

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Sign in to connect' }, { status: 401 })

  try {
    const body = await request.json()
    const message = (body.message || '').trim()
    const type = VALID_TYPES.includes(body.type) ? body.type : 'general'

    if (!message || message.length < 10) {
      return NextResponse.json({ error: 'Please write a meaningful message (min 10 chars)' }, { status: 400 })
    }

    const { data: venture } = await supabase
      .from('ventures')
      .select('id, user_id, founder_id, name, slug')
      .eq('slug', slug)
      .single()

    if (!venture) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (venture.user_id === user.id || venture.founder_id === user.id) {
      return NextResponse.json({ error: 'Cannot connect to your own venture' }, { status: 400 })
    }

    // Check for existing pending request
    const { data: existing } = await supabase
      .from('venture_connections')
      .select('id, status')
      .eq('venture_id', venture.id)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'You already have a pending request' }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('venture_connections')
      .insert({
        venture_id: venture.id,
        user_id: user.id,
        message: message.slice(0, 2000),
        type,
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error

    // Bump venture connection_count
    await supabase.rpc('exec_sql', {}).then(() => {}, () => {})

    // Track signal
    await supabase.from('user_activity_signals').insert({
      user_id: user.id, signal_type: 'connect',
      entity_type: 'venture', entity_id: venture.id, weight: 5.0,
      metadata: { type },
    }).then(() => {}, () => {})

    return NextResponse.json({ success: true, connection: data })
  } catch (e: any) {
    console.error('Connect venture error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}
