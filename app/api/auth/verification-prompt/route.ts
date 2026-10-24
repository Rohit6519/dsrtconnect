import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ show: false })

    const { data, error } = await adminClient.rpc('get_verification_prompt_state', { p_user_id: user.id })
    if (error) return NextResponse.json({ show: false })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ show: false })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { context, action, metadata } = await request.json()
    if (!action) return NextResponse.json({ error: 'Action required' }, { status: 400 })

    await adminClient.rpc('record_verification_prompt_action', {
      p_user_id: user.id,
      p_context: context || 'general',
      p_action: action,
      p_metadata: metadata || {}
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}