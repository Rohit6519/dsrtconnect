import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Log disconnection
  await supabase.from('data_access_log').insert({
    user_id: user.id,
    provider: 'github',
    action: 'disconnect',
    data_type: 'oauth_token',
    performed_by: 'user',
  })

  // Delete integration + all associated data
  const { error } = await supabase
    .from('user_integrations')
    .delete()
    .eq('user_id', user.id)
    .eq('provider', 'github')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Also delete tracked repos and their commits (cascade should handle this)
  await supabase
    .from('tracked_repos')
    .delete()
    .eq('user_id', user.id)
    .eq('provider', 'github')

  return NextResponse.json({ success: true })
}