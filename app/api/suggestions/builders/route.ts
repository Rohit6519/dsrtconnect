import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '5')

  // Use the SQL function we created for smart suggestions
  const { data: suggestions, error } = await supabase
    .rpc('get_follow_suggestions', {
      p_user_id: user.id,
      p_limit: limit,
    })

  if (error) {
    console.error('Suggestions error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ suggestions: suggestions || [] })
}