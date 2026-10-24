import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify admin authorization
  const { data: dbUser } = await supabase
    .from('users')
    .select('role, is_admin')
    .eq('id', user.id)
    .maybeSingle()

  const isAdmin = dbUser?.is_admin || dbUser?.role === 'admin' || user.email?.endsWith('@dsrtai.com')
  if (!isAdmin) {
    return NextResponse.json({ error: 'Admin privilege required' }, { status: 403 })
  }

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // 1. Total Security Scans (24h & 7d)
    const [{ count: total24h }, { count: total7d }] = await Promise.all([
      adminClient.from('mail_security_results').select('id', { count: 'exact', head: true }).gte('scanned_at', twentyFourHoursAgo),
      adminClient.from('mail_security_results').select('id', { count: 'exact', head: true }).gte('scanned_at', sevenDaysAgo),
    ])

    // 2. Breakdown by Classification (24h)
    const { data: classifications } = await adminClient
      .from('mail_security_results')
      .select('classification')
      .gte('scanned_at', twentyFourHoursAgo)

    const classCounts: Record<string, number> = {
      LEGITIMATE: 0,
      SPAM: 0,
      PHISHING: 0,
      MALWARE: 0,
    }
    ;(classifications || []).forEach((row) => {
      if (row.classification) {
        classCounts[row.classification] = (classCounts[row.classification] || 0) + 1
      }
    })

    // 3. Breakdown by Delivery Action (24h)
    const { data: actions } = await adminClient
      .from('mail_security_results')
      .select('delivery_action')
      .gte('scanned_at', twentyFourHoursAgo)

    const actionCounts: Record<string, number> = {
      DELIVER: 0,
      DELIVER_WITH_WARNING: 0,
      SPAM: 0,
      QUARANTINE: 0,
      REJECT: 0,
    }
    ;(actions || []).forEach((row) => {
      if (row.delivery_action) {
        actionCounts[row.delivery_action] = (actionCounts[row.delivery_action] || 0) + 1
      }
    })

    // 4. Active Campaigns & Model Version
    const [{ count: spamCampaignsCount }, { data: activeModel }] = await Promise.all([
      adminClient.from('mail_campaigns').select('id', { count: 'exact', head: true }).eq('is_known_spam_campaign', true),
      adminClient.from('mail_model_registry').select('model_version, created_at').eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    // 5. Calculate Rates
    const totalScanCount = total24h || 1
    const spamRate = Number((((classCounts.SPAM || 0) / totalScanCount) * 100).toFixed(2))
    const phishingRate = Number((((classCounts.PHISHING || 0) / totalScanCount) * 100).toFixed(2))
    const malwareRate = Number((((classCounts.MALWARE || 0) / totalScanCount) * 100).toFixed(2))

    return NextResponse.json({
      telemetry: {
        total_scanned_24h: total24h || 0,
        total_scanned_7d: total7d || 0,
        classifications: classCounts,
        actions: actionCounts,
        rates: {
          spam_percentage: spamRate,
          phishing_percentage: phishingRate,
          malware_percentage: malwareRate,
        },
        active_spam_campaigns: spamCampaignsCount || 0,
        active_model_version: activeModel?.model_version || 'v1.0.0-phase10',
      },
    })
  } catch (e: any) {
    console.error('[Admin Security Stats Error]', e)
    return NextResponse.json({ error: e?.message || 'Failed to compute security stats' }, { status: 500 })
  }
}