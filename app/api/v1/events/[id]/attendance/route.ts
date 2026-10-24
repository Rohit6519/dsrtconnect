import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail } from '@/lib/kernel'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()

    const { data: rows } = await supabase
      .from('event_attendance')
      .select('*')
      .eq('event_id', id)
      .order('checked_in_at', { ascending: false })
      .limit(500)

    const ids = Array.from(new Set((rows || []).map((r: any) => r.identity_id)))
    const { data: users } = ids.length > 0
      ? await supabase.from('users').select('id, username, full_name, avatar_url').in('id', ids)
      : { data: [] as any[] }
    const map = new Map((users || []).map((u: any) => [u.id, u]))

    const items = (rows || []).map((r: any) => ({ ...r, user: map.get(r.identity_id) || null }))
    return ok({ items }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}