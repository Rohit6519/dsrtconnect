import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface Interaction {
  venture_id: string
  action: 'view' | 'click' | 'follow' | 'save' | 'dismiss' | 'share'
  weight: number
  domain_slugs?: string[]
  session_id?: string
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  try {
    const { interactions } = await request.json() as { interactions: Interaction[] }
    if (!interactions || !Array.isArray(interactions)) {
      return NextResponse.json({ error: 'invalid payload' }, { status: 400 })
    }

    // 1. Insert raw interaction events
    const records = interactions.map(i => ({
      user_id: user?.id || null,
      venture_id: i.venture_id,
      action: i.action,
      weight: i.weight,
      domain_slugs: i.domain_slugs || [],
      session_id: i.session_id || null,
    }))

    await supabase.from('explore_interactions').insert(records)

    // 2. For logged-in users, update affinity vectors
    if (user?.id) {
      // Aggregate weights per domain to reduce SQL calls
      const domainAggregates = new Map<string, number>()
      
      for (const i of interactions) {
        if (!i.domain_slugs || i.domain_slugs.length === 0) continue
        for (const slug of i.domain_slugs) {
          if (!slug) continue
          const key = slug.toLowerCase()
          domainAggregates.set(key, (domainAggregates.get(key) || 0) + i.weight)
        }
      }

      // Update affinities per domain in parallel
      const updates = Array.from(domainAggregates.entries()).map(([slug, weight]) =>
        supabase.rpc('fn_update_domain_affinity', {
          p_user_id: user.id,
          p_domain_slugs: [slug],
          p_weight: weight,
        })
      )

      await Promise.allSettled(updates)
    }

    return NextResponse.json({ success: true, count: records.length })
  } catch (e: any) {
    console.error('Track API error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}