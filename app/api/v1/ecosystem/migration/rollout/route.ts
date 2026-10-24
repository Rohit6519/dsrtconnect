import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail, ValidationError } from '@/lib/kernel'
import { setRolloutPercent } from '@/lib/ecosystem/migration'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let ctx
  try {
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const { data: user } = await supabase.from('users').select('is_admin, admin_role').eq('id', ctx.identityId).maybeSingle()
    if (!user?.is_admin && user?.admin_role !== 'super_admin') {
      return ok({ error: 'Admin access required' }, { ctx, status: 403 })
    }
    const body = await req.json().catch(() => ({}))
    const percent = body?.percent
    if (typeof percent !== 'number') throw new ValidationError([{ field: 'percent', message: 'Number required' }])
    const result = await setRolloutPercent(supabase, percent)
    return ok(result, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}