import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { qna } = await request.json()

  if (!qna || typeof qna !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  // Fetch existing to merge
  const { data: existingUser } = await supabase
    .from('users')
    .select('founder_qna')
    .eq('id', user.id)
    .single()

  const currentQna = existingUser?.founder_qna || {}
  const mergedQna = { ...currentQna, ...qna }

  const { error } = await supabase
    .from('users')
    .update({
      founder_qna: mergedQna,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, founder_qna: mergedQna })
}
