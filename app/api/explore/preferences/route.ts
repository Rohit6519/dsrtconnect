import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// ─── GET current preferences ───
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({
      preferences: null,
      preferred_categories: [],
      preferred_community_ids: [],
    })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('interests, preferred_categories, preferred_community_ids, sectors, brings')
    .eq('id', user.id)
    .maybeSingle()

  const preferred_categories =
    (profile?.preferred_categories as string[]) ||
    (profile?.interests as string[]) ||
    []

  const preferred_community_ids =
    (profile?.preferred_community_ids as string[]) ||
    []

  return NextResponse.json({
    preferences: {
      preferred_categories,
      preferred_community_ids,
      discovery_ratio: 0.3,
    },
    preferred_categories,
    preferred_community_ids,
  })
}

// ─── PATCH — partial update ───
export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const updates: Record<string, any> = {}

    // Categories
    if (Array.isArray(body.preferred_categories)) {
      updates.preferred_categories = body.preferred_categories.slice(0, 50)
    }

    // Community IDs — validate UUIDs
    if (Array.isArray(body.preferred_community_ids)) {
      const validIds = body.preferred_community_ids
        .filter((id: any) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
        .slice(0, 50)
      updates.preferred_community_ids = validIds
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Try updating preferred_categories directly, fall back to interests
    const attempt = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select('preferred_categories, preferred_community_ids')
      .maybeSingle()

    if (attempt.error) {
      // Fallback: if preferred_categories column doesn't exist, use interests
      if (updates.preferred_categories) {
        const fallbackUpdates: Record<string, any> = {
          interests: updates.preferred_categories,
        }
        if (updates.preferred_community_ids) {
          fallbackUpdates.preferred_community_ids = updates.preferred_community_ids
        }
        await supabase
          .from('users')
          .update(fallbackUpdates)
          .eq('id', user.id)
      } else {
        throw attempt.error
      }
    }

    // Track signal — community preference change
    if (updates.preferred_community_ids) {
      supabase.from('user_activity_signals').insert({
        user_id: user.id,
        signal_type: 'community_preference_change',
        entity_type: 'community',
        entity_id: user.id,
        weight: 2.0,
        metadata: { community_ids: updates.preferred_community_ids },
      }).then(() => {}, () => {})
    }

    return NextResponse.json({
      success: true,
      preferred_categories: updates.preferred_categories || null,
      preferred_community_ids: updates.preferred_community_ids || null,
    })
  } catch (e: any) {
    console.error('Preferences PATCH error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}

// ─── PUT — replace all preferences ───
// Used by ExploreView which sends PUT
export async function PUT(request: Request) {
  // PUT delegates to PATCH — same behavior
  return PATCH(request)
}