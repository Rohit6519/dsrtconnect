// ============================================================
// app/api/coco/actions/[id]/cancel/route.ts
// Handles explicit user cancellation of pending actions.
// ============================================================

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handler, ok } from '@/lib/kernel/response'
import { cancelActionRun } from '@/lib/coco/actions/manager'


export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'


export const POST = handler(async ({ req }) => {
  const url = new URL(req.url)
  const segments = url.pathname.split('/')
  const actionId = segments[segments.length - 2]

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('COCO_UNAUTHENTICATED')

  await cancelActionRun(actionId, user.id)

  return ok({ cancelled: true })
})