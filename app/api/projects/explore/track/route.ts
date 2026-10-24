import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface Interaction {
  project_id: string
  action: 'view' | 'long_view' | 'click' | 'follow' | 'save' | 'dismiss' | 'share'
  weight: number
  domain_slugs?: string[]
  session_id?: string
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  try {
    const { interactions } = (await request.json()) as { interactions: Interaction[] }
    if (!interactions || !Array.isArray(interactions) || interactions.length === 0) {
      return NextResponse.json({ error: 'invalid payload' }, { status: 400 })
    }

    // Cap batch size to prevent abuse
    const batch = interactions.slice(0, 100)

    // 1. Insert raw interaction events
    const records = batch.map(i => ({
      user_id: user?.id || null,
      project_id: i.project_id,
      action: i.action,
      weight: i.weight,
      domain_slugs: i.domain_slugs || [],
      session_id: i.session_id || null,
    }))

    await supabase.from('project_explore_interactions').insert(records)

    // 2. Update domain affinity vectors (for logged-in users only)
    if (user?.id) {
      const domainAggregates = new Map<string, number>()

      for (const i of batch) {
        if (!i.domain_slugs || i.domain_slugs.length === 0) continue
        for (const slug of i.domain_slugs) {
          if (!slug) continue
          const key = slug.toLowerCase()
          domainAggregates.set(key, (domainAggregates.get(key) || 0) + i.weight)
        }
      }

      const updates = Array.from(domainAggregates.entries()).map(([slug, weight]) =>
        supabase.rpc('fn_update_project_domain_affinity', {
          p_user_id: user.id,
          p_domain_slugs: [slug],
          p_weight: weight,
        })
      )

      await Promise.allSettled(updates)
    }

    return NextResponse.json({ success: true, count: records.length })
  } catch (e: any) {
    console.error('[projects/explore/track] error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}