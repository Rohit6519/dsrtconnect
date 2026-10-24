// ============================================================
// app/api/cron/outbox-dispatcher/route.ts
// Every-N-seconds cron endpoint that:
//   1. Registers all outbox consumers (idempotent per cold-start)
//   2. Reaps stale PROCESSING locks
//   3. Dispatches pending outbox events
//   4. Runs periodic event/waitlist/no-show/analytics workers
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { dispatchPendingOutboxEvents } from '@/lib/kernel'

import { registerCommunityActivityConsumers } from '@/lib/community/activity-consumers'
import '@/lib/operations/action-registry' // side-effect: registers built-in workflow actions

// Guard these imports so the dispatcher still runs even if a phase module
// isn't in the repo yet (e.g. during incremental rollout).
let registerEcosystemActivityConsumers: (() => void) | null = null
let dispatchDueReminders: ((c: any) => Promise<{ dispatched: number }>) | null = null
let processExpiredOffers: ((c: any) => Promise<{ expired: number }>) | null = null
let markNoShows: ((c: any) => Promise<{ updated: number }>) | null = null
let computeAllCommunityRollups:
  | ((c: any) => Promise<{ computed: number; date: string }>)
  | null = null

try {
  const mod = require('@/lib/ecosystem/activity')
  registerEcosystemActivityConsumers = mod.registerEcosystemActivityConsumers ?? null
} catch { /* module not present yet */ }

try {
  const mod = require('@/lib/events/reminders')
  dispatchDueReminders = mod.dispatchDueReminders ?? null
  processExpiredOffers = mod.processExpiredOffers ?? null
  markNoShows = mod.markNoShows ?? null
} catch { /* events module not present yet */ }

try {
  const mod = require('@/lib/ecosystem/analytics')
  computeAllCommunityRollups = mod.computeAllCommunityRollups ?? null
} catch { /* analytics module not present yet */ }

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Register consumers once per cold-start
registerCommunityActivityConsumers()
if (registerEcosystemActivityConsumers) registerEcosystemActivityConsumers()

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const secret = process.env.CRON_SECRET || 'dsrt-cron-secret'

    if (authHeader !== `Bearer ${secret}` && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized cron dispatch' }, { status: 401 })
    }

    // 1. Outbox
    const outbox = await dispatchPendingOutboxEvents(adminClient, 50)

    // 2. Domain workers — each guarded so one failure doesn't block the others
    let reminders = { dispatched: 0 }
    let offers = { expired: 0 }
    let noShows = { updated: 0 }
    let analytics: { computed: number; date: string } = { computed: 0, date: '' }

    if (dispatchDueReminders) {
      try {
        reminders = await dispatchDueReminders(adminClient)
      } catch (e: any) {
        console.warn('[cron:reminders_failed]', e?.message)
      }
    }
    if (processExpiredOffers) {
      try {
        offers = await processExpiredOffers(adminClient)
      } catch (e: any) {
        console.warn('[cron:offers_failed]', e?.message)
      }
    }
    if (markNoShows) {
      try {
        noShows = await markNoShows(adminClient)
      } catch (e: any) {
        console.warn('[cron:no_shows_failed]', e?.message)
      }
    }

    // 3. Analytics rollup — only when explicitly requested
    const doAnalytics = req.nextUrl.searchParams.get('analytics') === 'true'
    if (doAnalytics && computeAllCommunityRollups) {
      try {
        analytics = await computeAllCommunityRollups(adminClient)
      } catch (e: any) {
        console.warn('[cron:analytics_failed]', e?.message)
      }
    }

    return NextResponse.json({
      success: true,
      outbox_processed: outbox.processedCount,
      outbox_failed: outbox.failedCount,
      outbox_reaped_stale: outbox.reapedStale,
      reminders_dispatched: reminders.dispatched,
      waitlist_offers_expired: offers.expired,
      no_shows_marked: noShows.updated,
      analytics_computed: analytics.computed,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Cron error', at: 'outbox-dispatcher' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  return POST(req)
}