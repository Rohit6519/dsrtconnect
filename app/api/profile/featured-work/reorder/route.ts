import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/profile/featured-work/reorder
 * Body: { order: string[] } — array of featured_work IDs in new order
 */
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { order } = await request.json()
  if (!Array.isArray(order) || order.length === 0) {
    return NextResponse.json({ error: 'order array required' }, { status: 400 })
  }

  // Verify all IDs belong to this user
  const { data: userWorks } = await supabase
    .from('featured_work')
    .select('id')
    .eq('user_id', user.id)

  const userWorkIds = new Set((userWorks || []).map((w) => w.id))
  const invalidIds = order.filter((id) => !userWorkIds.has(id))
  if (invalidIds.length > 0) {
    return NextResponse.json({ error: 'Invalid work IDs in order' }, { status: 400 })
  }

  // Update positions in bulk
  const updates = order.map((id, index) =>
    supabase
      .from('featured_work')
      .update({ position: index, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id),
  )

  const results = await Promise.all(updates)
  const anyError = results.find((r) => r.error)
  if (anyError?.error) {
    return NextResponse.json({ error: anyError.error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, order })
}