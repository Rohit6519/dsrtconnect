import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail } from '@/lib/kernel'
import { verifyMigrationHealth } from '@/lib/ecosystem/migration'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let ctx
  try {
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    // Only platform admins can run migration verification
    const { data: user } = await supabase.from('users').select('is_admin, admin_role').eq('id', ctx.identityId).maybeSingle()
    if (!user?.is_admin && user?.admin_role !== 'super_admin') {
      return ok({ error: 'Admin access required' }, { ctx, status: 403 })
    }
    const health = await verifyMigrationHealth(supabase)
    return ok(health, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}