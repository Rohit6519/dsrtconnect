import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams
  const range = sp.get('range') || '30d'
  const opportunityId = sp.get('opportunity_id')

  const base = new URL('/api/opportunities/dashboard/analytics', req.url)
  base.searchParams.set('range', range)
  if (opportunityId) base.searchParams.set('opportunity_id', opportunityId)

  const res = await fetch(base.toString(), {
    headers: { cookie: req.headers.get('cookie') || '' },
  })
  if (!res.ok) return new Response('Failed', { status: 500 })
  const data = await res.json()

  const rows: (string | number)[][] = [
    [
      'Opportunity',
      'ID',
      'Status',
      'Type',
      'Views',
      'Applications',
      'Qualified',
      'Selected',
      'Conversion %',
    ],
    ...((data.per_opportunity || []) as any[]).map((o: any) => [
      csvSafe(o.title),
      o.opportunity_number || o.id,
      o.status,
      o.type,
      o.views,
      o.applications,
      o.qualified,
      o.selected,
      o.conversion,
    ]),
  ]

  const csv = rows
    .map((r) =>
      r
        .map((cell: string | number) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="opportunities_analytics_${range}.csv"`,
    },
  })
}

function csvSafe(s: string): string {
  return String(s || '').replace(/[\r\n]/g, ' ').trim()
}