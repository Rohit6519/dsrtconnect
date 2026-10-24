// ============================================================
// lib/ecosystem/analytics.ts
// Daily community rollups.
//
// FIXED:
//   - event_registrations joined through event_events (not community_id)
//   - Sequential loop replaced with batched Promise.all (concurrency 8)
//   - Correct query for reactions (scoped via post_id → community)
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js'

const BATCH_CONCURRENCY = 8

interface RollupNumbers {
  member_count: number
  new_members: number
  post_count: number
  comment_count: number
  reaction_count: number
  event_count: number
  registration_count: number
  application_count: number
  view_count: number
}

async function fetchDailyNumbers(
  supabase: SupabaseClient,
  communityId: string,
  dayStart: string,
  dayEnd: string
): Promise<RollupNumbers> {
  // Step 1: event IDs for this community — needed for registrations rollup
  const { data: events } = await supabase
    .from('event_events')
    .select('id')
    .eq('community_id', communityId)

  const eventIds = (events || []).map((e: any) => e.id)

  // Step 2: post IDs for this community in the day — needed for reactions
  const { data: postsInDay } = await supabase
    .from('community_posts_v2')
    .select('id')
    .eq('community_id', communityId)
    .gte('created_at', dayStart)
    .lte('created_at', dayEnd)
    .is('deleted_at', null)

  const postIds = (postsInDay || []).map((p: any) => p.id)

  const [
    memberCountRes,
    newMembersRes,
    commentCountRes,
    reactionCountRes,
    eventCountRes,
    registrationCountRes,
    applicationCountRes,
    viewCountRes,
  ] = await Promise.all([
    supabase
      .from('community_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('community_id', communityId)
      .eq('status', 'ACTIVE'),
    supabase
      .from('community_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('community_id', communityId)
      .eq('status', 'ACTIVE')
      .gte('joined_at', dayStart)
      .lte('joined_at', dayEnd),
    supabase
      .from('community_comments')
      .select('id', { count: 'exact', head: true })
      .eq('community_id', communityId)
      .gte('created_at', dayStart)
      .lte('created_at', dayEnd)
      .is('deleted_at', null),
    postIds.length > 0
      ? supabase
          .from('community_reactions')
          .select('id', { count: 'exact', head: true })
          .eq('target_type', 'post')
          .in('target_id', postIds)
          .gte('created_at', dayStart)
          .lte('created_at', dayEnd)
      : Promise.resolve({ count: 0 }),
    supabase
      .from('event_events')
      .select('id', { count: 'exact', head: true })
      .eq('community_id', communityId)
      .gte('created_at', dayStart)
      .lte('created_at', dayEnd),
    eventIds.length > 0
      ? supabase
          .from('event_registrations')
          .select('id', { count: 'exact', head: true })
          .in('event_id', eventIds)
          .gte('registered_at', dayStart)
          .lte('registered_at', dayEnd)
      : Promise.resolve({ count: 0 }),
    supabase
      .from('community_applications')
      .select('id', { count: 'exact', head: true })
      .eq('community_id', communityId)
      .gte('created_at', dayStart)
      .lte('created_at', dayEnd),
    supabase
      .from('community_visits_v2')
      .select('id', { count: 'exact', head: true })
      .eq('community_id', communityId)
      .gte('visited_at', dayStart)
      .lte('visited_at', dayEnd),
  ])

  return {
    member_count: memberCountRes.count ?? 0,
    new_members: newMembersRes.count ?? 0,
    post_count: postIds.length,
    comment_count: commentCountRes.count ?? 0,
    reaction_count: reactionCountRes.count ?? 0,
    event_count: eventCountRes.count ?? 0,
    registration_count: registrationCountRes.count ?? 0,
    application_count: applicationCountRes.count ?? 0,
    view_count: viewCountRes.count ?? 0,
  }
}

export async function computeDailyRollup(
  supabase: SupabaseClient,
  communityId: string,
  date: string
) {
  const dayStart = `${date}T00:00:00Z`
  const dayEnd = `${date}T23:59:59Z`

  const numbers = await fetchDailyNumbers(supabase, communityId, dayStart, dayEnd)

  await supabase.from('analytics_community_daily_rollups').upsert(
    {
      community_id: communityId,
      date,
      member_count: numbers.member_count,
      new_members: numbers.new_members,
      active_members: 0, // requires login tracking — populated in a later phase
      post_count: numbers.post_count,
      comment_count: numbers.comment_count,
      reaction_count: numbers.reaction_count,
      event_count: numbers.event_count,
      registration_count: numbers.registration_count,
      application_count: numbers.application_count,
      view_count: numbers.view_count,
      computed_at: new Date().toISOString(),
    },
    { onConflict: 'community_id,date' }
  )
}

// -----------------------------------------------------------
// Batch runner — concurrency 8
// -----------------------------------------------------------

async function runInBatches<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>
) {
  let index = 0
  const worker = async () => {
    while (index < items.length) {
      const myIdx = index++
      try {
        await fn(items[myIdx])
      } catch (e: any) {
        console.warn('[analytics:batch_item_failed]', e?.message)
      }
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  await Promise.all(workers)
}

export async function computeAllCommunityRollups(supabase: SupabaseClient) {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const { data: communities } = await supabase
    .from('communities')
    .select('id')
    .eq('status', 'ACTIVE')
    .limit(500)

  const list = (communities || []) as Array<{ id: string }>

  let computed = 0
  await runInBatches(list, BATCH_CONCURRENCY, async (c) => {
    await computeDailyRollup(supabase, c.id, yesterday)
    computed++
  })

  return { computed, date: yesterday }
}