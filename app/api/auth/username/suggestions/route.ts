import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { seed, fullName, interests, count } = await request.json()

    const { data, error } = await adminClient.rpc('generate_username_suggestions', {
      p_seed: seed || '',
      p_full_name: fullName || null,
      p_interests: interests || [],
      p_count: count || 6,
      p_user_id: user.id
    })

    if (error) {
      console.error('[username/suggestions]', error)
      return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}