// ============================================================
// lib/community/discover.ts
// Server-side Discover & Global Search queries.
// BULLETPROOF & CRASH-PROOF: Uses select('*') + JS fallback mapping
// ============================================================

import { SupabaseClient } from "@supabase/supabase-js";

export interface DiscoverCommunityCard {
  id: string;
  public_id: string;
  slug: string;
  name: string;
  short_description: string | null;
  description?: string | null;
  logo_url: string | null;
  cover_url: string | null;
  banner_url?: string | null;
  category: string | null;
  community_type: string | null;
  visibility: string;
  join_policy: string;
  status: string;
  is_verified: boolean;
  member_count: number;
  post_count: number;
  topics: string[];
  location_text: string | null;
  created_at: string;
  published_at: string | null;
  is_member?: boolean;
  is_following?: boolean;
  membership_status?: string | null;
  reason_codes?: string[];
  reason_text?: string | null;
}

export interface AllCommunitiesFilters {
  category?: string;
  community_type?: string;
  join_policy?: string;
  visibility?: string;
  verified_only?: boolean;
  location?: string;
  sort?: "members" | "newest" | "active";
}

/**
 * Maps raw database row safely into DiscoverCommunityCard with full fallback values
 */
function mapToCard(c: any): DiscoverCommunityCard {
  return {
    id: c.id,
    public_id: c.public_id || c.id,
    slug: c.slug || c.id,
    name: c.name || "Untitled Community",
    short_description: c.short_description || c.description || null,
    description: c.description || null,
    logo_url: c.logo_url || null,
    cover_url: c.cover_url || null,
    banner_url: c.banner_url || c.cover_url || null,
    category: c.category || "general",
    community_type: c.community_type || "standard",
    visibility: c.visibility || "PUBLIC",
    join_policy: c.join_policy || "open",
    status: c.status || "ACTIVE",
    is_verified: !!c.is_verified,
    member_count: Number(c.member_count) || 1,
    post_count: Number(c.post_count) || 0,
    topics: Array.isArray(c.topics) ? c.topics : [],
    location_text: c.location_text || null,
    created_at: c.created_at || new Date().toISOString(),
    published_at: c.published_at || c.created_at || null,
  };
}

/**
 * Safely fetches all raw communities from Supabase without column mismatch errors
 */
async function fetchAllCommunitiesRaw(
  supabase: SupabaseClient,
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from("communities")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[fetchAllCommunitiesRaw Error]", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("[fetchAllCommunitiesRaw Exception]", err);
    return [];
  }
}

/**
 * Extracts a lowercase location hint from users.location_data JSONB.
 */
function extractLocationHint(locationData: any): string | null {
  if (!locationData) return null;
  if (typeof locationData === "string")
    return locationData.toLowerCase().trim() || null;
  const parts = [
    locationData.city,
    locationData.town,
    locationData.region,
    locationData.state,
    locationData.country,
    locationData.formatted,
    locationData.name,
    locationData.label,
  ]
    .filter(Boolean)
    .map((s: string) => String(s).toLowerCase().trim())
    .filter(Boolean);
  return parts[0] || null;
}

/**
 * Resolves personalize signals directly from active user profile attributes.
 */
async function loadUserSignals(
  supabase: SupabaseClient,
  actorId: string | null,
): Promise<{
  topics: string[];
  locationHint: string | null;
  institutionId: string | null;
}> {
  if (!actorId) return { topics: [], locationHint: null, institutionId: null };

  try {
    const { data: user } = await supabase
      .from("users")
      .select(
        "preferred_categories, profile_tags, looking_for_opportunities, location_data, institution_id",
      )
      .eq("id", actorId)
      .maybeSingle();

    if (!user) return { topics: [], locationHint: null, institutionId: null };

    const topics = Array.from(
      new Set([
        ...((user.preferred_categories as string[] | null) || []),
        ...((user.profile_tags as string[] | null) || []),
        ...((user.looking_for_opportunities as string[] | null) || []),
      ]).values(),
    )
      .map((t) => (t || "").toString().toLowerCase())
      .filter(Boolean);

    return {
      topics,
      locationHint: extractLocationHint(user.location_data),
      institutionId: user.institution_id ?? null,
    };
  } catch {
    return { topics: [], locationHint: null, institutionId: null };
  }
}

/**
 * Personalizes communities array checking whether user is currently a member or follower.
 */
async function enrichWithPersonalization(
  supabase: SupabaseClient,
  cards: DiscoverCommunityCard[],
  actorId: string | null,
): Promise<DiscoverCommunityCard[]> {
  if (!actorId || cards.length === 0) return cards;
  const ids = cards.map((c) => c.id);

  try {
    const [{ data: memberships }, { data: follows }] = await Promise.all([
      supabase
        .from("community_memberships")
        .select("community_id, status")
        .in("community_id", ids)
        .eq("identity_id", actorId),
      supabase
        .from("community_follows_v2")
        .select("community_id")
        .in("community_id", ids)
        .eq("identity_id", actorId),
    ]);

    const memMap = new Map(
      (memberships || []).map((m: any) => [m.community_id, m.status]),
    );
    const followSet = new Set((follows || []).map((f: any) => f.community_id));

    return cards.map((c) => ({
      ...c,
      is_member: String(memMap.get(c.id)).toUpperCase() === "ACTIVE",
      membership_status: memMap.get(c.id) ?? null,
      is_following: followSet.has(c.id),
    }));
  } catch {
    return cards;
  }
}

// -----------------------------------------------------------
// GLOBAL SEARCH (Communities + People)
// -----------------------------------------------------------
export async function searchGlobal(
  supabase: SupabaseClient,
  q: string,
  limit = 5,
) {
  const term = q.trim().toLowerCase();
  if (!term) return { communities: [], people: [] };

  const all = await fetchAllCommunitiesRaw(supabase);
  const mapped = all.map(mapToCard);

  const matchedCommunities = mapped
    .filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.short_description &&
          c.short_description.toLowerCase().includes(term)),
    )
    .slice(0, limit);

  let people: any[] = [];
  try {
    const { data } = await supabase
      .from("users")
      .select("id, username, full_name, avatar_url, tagline, is_verified")
      .or(`full_name.ilike.%${term}%,username.ilike.%${term}%`)
      .limit(limit);
    people = data || [];
  } catch {
    /* ignore users search error */
  }

  return { communities: matchedCommunities, people };
}

// -----------------------------------------------------------
// RECOMMENDED — personalized picks
// -----------------------------------------------------------
export async function getRecommendedCommunities(
  supabase: SupabaseClient,
  actorId: string | null,
  limit = 12,
): Promise<DiscoverCommunityCard[]> {
  const all = await fetchAllCommunitiesRaw(supabase);
  if (!all || all.length === 0) return [];

  const mapped = all.map(mapToCard);
  const { topics: userTopics, locationHint } = await loadUserSignals(
    supabase,
    actorId,
  );

  const scored = mapped
    .map((c) => {
      let score = 0;
      const reasons: string[] = [];

      const cTopics = c.topics.map((t) => String(t).toLowerCase());
      const overlap = cTopics.filter((t) => userTopics.includes(t)).length;
      if (overlap > 0) {
        score += overlap * 10;
        reasons.push("INTEREST_MATCH");
      }

      if (c.category && userTopics.includes(String(c.category).toLowerCase())) {
        score += 5;
        reasons.push("CATEGORY_MATCH");
      }

      if (
        locationHint &&
        c.location_text &&
        String(c.location_text).toLowerCase().includes(locationHint)
      ) {
        score += 6;
        reasons.push("LOCATION_MATCH");
      }

      if (c.is_verified) score += 2;
      score += Math.log10((c.member_count || 0) + 1) * 2;

      const reasonText = reasons.includes("INTEREST_MATCH")
        ? "Matches your interests"
        : reasons.includes("LOCATION_MATCH")
          ? "Near your location"
          : reasons.includes("CATEGORY_MATCH")
            ? "Aligned with your goals"
            : "Popular on DSRT";

      return {
        ...c,
        reason_codes: reasons,
        reason_text: reasonText,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return enrichWithPersonalization(supabase, scored, actorId);
}

// -----------------------------------------------------------
// RISING — activity & member popularity
// -----------------------------------------------------------
export async function getRisingCommunities(
  supabase: SupabaseClient,
  actorId: string | null,
  limit = 8,
): Promise<DiscoverCommunityCard[]> {
  const all = await fetchAllCommunitiesRaw(supabase);
  if (!all || all.length === 0) return [];

  const mapped = all.map(mapToCard);

  // Sort by member count + post count for rising
  mapped.sort(
    (a, b) => b.member_count + b.post_count - (a.member_count + a.post_count),
  );

  const risingSliced = mapped.slice(0, limit).map((c) => ({
    ...c,
    reason_codes: ["RISING"],
    reason_text: `${c.member_count} active members`,
  }));

  return enrichWithPersonalization(supabase, risingSliced, actorId);
}

// -----------------------------------------------------------
// NEW — recently created
// -----------------------------------------------------------
export async function getNewCommunities(
  supabase: SupabaseClient,
  actorId: string | null,
  limit = 8,
): Promise<DiscoverCommunityCard[]> {
  const all = await fetchAllCommunitiesRaw(supabase);
  if (!all || all.length === 0) return [];

  const mapped = all.map(mapToCard);
  mapped.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const newSliced = mapped.slice(0, limit);
  return enrichWithPersonalization(supabase, newSliced, actorId);
}

// -----------------------------------------------------------
// NEAR ME
// -----------------------------------------------------------
export async function getNearMeCommunities(
  supabase: SupabaseClient,
  actorId: string | null,
  limit = 6,
): Promise<DiscoverCommunityCard[]> {
  if (!actorId) return [];

  const all = await fetchAllCommunitiesRaw(supabase);
  if (!all || all.length === 0) return [];

  const { locationHint } = await loadUserSignals(supabase, actorId);
  const mapped = all.map(mapToCard);

  if (!locationHint)
    return enrichWithPersonalization(supabase, mapped.slice(0, limit), actorId);

  const near = mapped
    .filter(
      (c) =>
        c.location_text && c.location_text.toLowerCase().includes(locationHint),
    )
    .slice(0, limit);

  const result = near.length > 0 ? near : mapped.slice(0, limit);
  return enrichWithPersonalization(supabase, result, actorId);
}

// -----------------------------------------------------------
// CATEGORIES
// -----------------------------------------------------------
export async function getCommunityCategories(supabase: SupabaseClient) {
  const all = await fetchAllCommunitiesRaw(supabase);
  const counts = new Map<string, number>();

  for (const row of all) {
    const key = row.category || "general";
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

// -----------------------------------------------------------
// ALL COMMUNITIES (paginated + filtered)
// -----------------------------------------------------------
export async function getAllCommunities(
  supabase: SupabaseClient,
  actorId: string | null,
  filters: AllCommunitiesFilters,
  cursor: string | null,
  limit: number,
) {
  try {
    const all = await fetchAllCommunitiesRaw(supabase);
    let cards = all.map(mapToCard);

    if (filters.category) {
      cards = cards.filter(
        (c) => c.category?.toLowerCase() === filters.category?.toLowerCase(),
      );
    }
    if (filters.community_type) {
      cards = cards.filter(
        (c) =>
          c.community_type?.toLowerCase() ===
          filters.community_type?.toLowerCase(),
      );
    }
    if (filters.verified_only) {
      cards = cards.filter((c) => c.is_verified);
    }
    if (filters.location) {
      cards = cards.filter((c) =>
        c.location_text
          ?.toLowerCase()
          .includes(filters.location!.toLowerCase()),
      );
    }

    const sort = filters.sort ?? "members";
    if (sort === "newest") {
      cards.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    } else if (sort === "active") {
      cards.sort((a, b) => (b.post_count || 0) - (a.post_count || 0));
    } else {
      cards.sort((a, b) => (b.member_count || 0) - (a.member_count || 0));
    }

    let startIndex = 0;
    if (cursor) {
      const parsed = parseInt(cursor, 10);
      if (!isNaN(parsed)) startIndex = parsed;
    }

    const sliced = cards.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < cards.length;
    const nextCursor = hasMore ? String(startIndex + limit) : null;

    const enriched = await enrichWithPersonalization(supabase, sliced, actorId);
    return { items: enriched, next_cursor: nextCursor, has_more: hasMore };
  } catch (err: any) {
    console.error("[getAllCommunities Error]", err?.message);
    return { items: [], next_cursor: null, has_more: false };
  }
}

// -----------------------------------------------------------
// SEARCH COMMUNITIES
// -----------------------------------------------------------
export async function searchCommunities(
  supabase: SupabaseClient,
  actorId: string | null,
  q: string,
  limit = 20,
): Promise<DiscoverCommunityCard[]> {
  const term = q.trim().toLowerCase();
  if (!term) return [];

  const all = await fetchAllCommunitiesRaw(supabase);
  const mapped = all.map(mapToCard);

  const matched = mapped
    .filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.short_description &&
          c.short_description.toLowerCase().includes(term)) ||
        (c.description && c.description.toLowerCase().includes(term)),
    )
    .slice(0, limit);

  return enrichWithPersonalization(supabase, matched, actorId);
}

// -----------------------------------------------------------
// TRACK DISCOVER EVENTS
// -----------------------------------------------------------
export async function trackDiscoverEvent(
  supabase: SupabaseClient,
  actorId: string | null,
  events: Array<{
    community_id: string;
    event_type:
      "IMPRESSION" | "CLICK" | "DISMISS" | "JOIN_CLICK" | "FOLLOW_CLICK";
    surface?: string;
    metadata?: Record<string, unknown>;
  }>,
) {
  if (!events || events.length === 0) return;
  try {
    const rows = events.map((e) => ({
      identity_id: actorId,
      community_id: e.community_id,
      event_type: e.event_type,
      surface: e.surface ?? null,
      metadata: e.metadata ?? null,
    }));
    await supabase.from("community_discover_events").insert(rows);
  } catch {
    /* ignore tracking errors */
  }
}
