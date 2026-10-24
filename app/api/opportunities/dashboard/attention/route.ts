import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: opps } = await supabase
    .from('opportunities')
    .select('id, title, slug, status, application_deadline, published_at, created_at, updated_at')
    .eq('poster_user_id', user.id)

  const list = opps || []
  const oppIds = list.map(o => o.id)
  const byId = new Map(list.map(o => [o.id, o]))
  const items: any[] = []

  // 1) Unreviewed applications
  if (oppIds.length) {
    const { data: unreviewed } = await supabase
      .from('opportunity_applications')
      .select('id, opportunity_id')
      .in('opportunity_id', oppIds)
      .in('pipeline_stage', ['applied', 'submitted', 'pending'])

    const count = unreviewed?.length || 0
    if (count > 0) {
      items.push({
        key: 'unreviewed_applications',
        severity: 'warn',
        title: `${count} application${count > 1 ? 's are' : ' is'} waiting for review`,
        subtitle: 'Oldest waiting: recent',
        action: { label: 'Open Applications', href: '/looking-for/my-opportunities/applications?stage=submitted' },
      })
    }
  }

  // 2) Expiring within 7 days
  const now = Date.now()
  const in7 = now + 7 * 86400000
  const expiring = list.filter(o =>
    ['active', 'closing-soon'].includes(o.status) &&
    o.application_deadline &&
    new Date(o.application_deadline).getTime() > now &&
    new Date(o.application_deadline).getTime() < in7
  )
  if (expiring.length) {
    items.push({
      key: 'expiring_soon',
      severity: 'warn',
      title: `${expiring.length} opportunit${expiring.length === 1 ? 'y expires' : 'ies expire'} within 7 days`,
      subtitle: expiring.slice(0, 2).map(e => e.title).join(' · '),
      action: { label: 'Review', href: '/looking-for/my-opportunities/portfolio?status=active' },
    })
  }

  // 3) Draft not published for 30+ days
  const drafts30 = list.filter(o =>
    o.status === 'draft' &&
    new Date(o.updated_at || o.created_at).getTime() < now - 30 * 86400000
  )
  if (drafts30.length) {
    items.push({
      key: 'stale_draft',
      severity: 'info',
      title: `${drafts30.length} draft${drafts30.length > 1 ? 's have' : ' has'} not been published for 30 days`,
      subtitle: drafts30.slice(0, 2).map(d => d.title).join(' · '),
      action: { label: 'Open drafts', href: '/looking-for/my-opportunities/portfolio?status=draft' },
    })
  }

  // 4) Shortlisted with no recent update (>7d)
  if (oppIds.length) {
    const since = new Date(Date.now() - 7 * 86400000).toISOString()
    const { data: stale } = await supabase
      .from('opportunity_applications')
      .select('id')
      .in('opportunity_id', oppIds)
      .in('pipeline_stage', ['screening', 'shortlisted'])
      .lt('stage_updated_at', since)

    if ((stale?.length || 0) > 0) {
      items.push({
        key: 'stale_shortlisted',
        severity: 'info',
        title: `${stale!.length} shortlisted applicant${stale!.length > 1 ? 's have' : ' has'} not received an update in 7+ days`,
        action: { label: 'Review shortlist', href: '/looking-for/my-opportunities/applications?stage=shortlisted' },
      })
    }
  }

  return NextResponse.json({ items })
}