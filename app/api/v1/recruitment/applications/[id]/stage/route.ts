import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail, NotFoundError, ValidationError } from '@/lib/kernel'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))

    if (!body?.stage) throw new ValidationError([{ field: 'stage', message: 'Stage required' }])

    const { data: app } = await supabase
      .from('looking_for_applications')
      .select('id, stage')
      .eq('id', id)
      .maybeSingle()

    if (!app) throw new NotFoundError('Application', id)

    await supabase
      .from('looking_for_applications')
      .update({ stage: body.stage, updated_at: new Date().toISOString() })
      .eq('id', id)

    return ok({ application_id: id, stage: body.stage }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}