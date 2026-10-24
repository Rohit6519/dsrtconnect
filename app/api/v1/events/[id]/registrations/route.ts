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

    const { data: regs } = await supabase
      .from('event_registrations')
      .select('*')
      .eq('event_id', id)
      .order('registered_at', { ascending: true })
      .limit(500)

    const ids = Array.from(new Set((regs || []).map((r: any) => r.identity_id)))
    const { data: users } = ids.length > 0
      ? await supabase.from('users').select('id, username, full_name, avatar_url').in('id', ids)
      : { data: [] as any[] }
    const map = new Map((users || []).map((u: any) => [u.id, u]))

    const items = (regs || []).map((r: any) => ({ ...r, user: map.get(r.identity_id) || null }))
    return ok({ items }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}