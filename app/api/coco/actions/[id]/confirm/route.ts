// ============================================================
// app/api/coco/actions/[id]/confirm/route.ts
// Handles explicit user confirmation of high-risk actions.
// ============================================================

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handler, ok, fail } from '@/lib/kernel/response'

import { authorizeActionRun, startActionRun, resolveActionRun } from '@/lib/coco/actions/manager'
import { executeTool } from '@/lib/coco/tools'
import { resolveUserPermissions } from '@/lib/coco/context'
import { adminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'


export const POST = handler(async ({ req }) => {
  const url = new URL(req.url)
  const segments = url.pathname.split('/')
  const actionId = segments[segments.length - 2] // Extract [id] from route

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('COCO_UNAUTHENTICATED')

  // 1. Authorize (verifies ownership & status = awaiting_confirmation)
  const authorized = await authorizeActionRun(actionId, user.id)
  if (!authorized) {
    throw new Error('Action not found, expired, or already resolved')
  }

  // 2. Fetch the stored proposed call from DB to ensure tampering didn't happen
  const { data: actionRecord } = await adminClient
    .from('coco_action_runs')
    .select('proposed_call, conversation_id')
    .eq('id', actionId)
    .single()
  
  if (!actionRecord) throw new Error('Action record missing')

  // 3. Mark executing
  await startActionRun(actionId)

  // 4. Resolve permissions for execution
  const permSet = await resolveUserPermissions(user.id)

  // 5. Execute
  const result = await executeTool({
    userId: user.id,
    conversationId: actionRecord.conversation_id,
    toolCall: actionRecord.proposed_call as any,
    userScopes: permSet.scopes,
    requestId: 'rest-confirm-' + actionId
  })

  // 6. Finalize lifecycle
  await resolveActionRun(actionId, result)

  return ok({ success: result.success, result })
})