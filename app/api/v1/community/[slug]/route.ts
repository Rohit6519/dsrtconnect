// ============================================================
// app/api/v1/community/[slug]/route.ts
// Handles community GET/PATCH by either UUID or string slug.
// FIXED: Added logo_url to COMMUNITY_FIELDS
// ============================================================

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildRequestContext,
  requireAuthContext,
  ok,
  fail,
  NotFoundError,
} from "@/lib/kernel";
import { updateCommunity, resolveCommunityCapabilities } from "@/lib/community";

export const dynamic = "force-dynamic";

// 🎯 Added logo_url to COMMUNITY_FIELDS
const COMMUNITY_FIELDS = `
  id, public_id, slug, name, short_description, description, mission,
  logo_url, cover_url, banner_url, category, community_type, visibility, join_policy,
  status, is_verified, member_count, post_count, view_count, like_count,
  topics, location_text, website, founded_at, chat_enabled, chat_members_only,
  created_at, updated_at, published_at, archived_at, version,
  owner_identity_id, created_by
`;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  let ctx;
  try {
    const { slug } = await params;
    ctx = await buildRequestContext(req);
    const supabase = await createClient();

    let query = supabase.from("communities").select(COMMUNITY_FIELDS).limit(1);
    const looksLikeUuid = slug.includes("-") && slug.length >= 32;
    query = looksLikeUuid ? query.eq("id", slug) : query.eq("slug", slug);
    const { data: community } = await query.maybeSingle();

    if (!community) {
      const { data: historical } = await supabase
        .from("community_slug_history")
        .select("community_id")
        .eq("old_slug", slug)
        .maybeSingle();
      if (historical?.community_id) {
        const { data: found } = await supabase
          .from("communities")
          .select(COMMUNITY_FIELDS)
          .eq("id", historical.community_id)
          .maybeSingle();
        if (found)
          return ok(await enrichCommunity(supabase, found, ctx.identityId), {
            ctx,
          });
      }
      throw new NotFoundError("Community", slug);
    }

    return ok(await enrichCommunity(supabase, community, ctx.identityId), {
      ctx,
    });
  } catch (err) {
    return fail(err, ctx);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  let ctx;
  try {
    const { slug } = await params;
    ctx = await requireAuthContext(req);
    const supabase = await createClient();
    const body = await req.json().catch(() => ({}));

    let communityId = slug;
    if (!slug.includes("-") || slug.length < 32) {
      const { data: c } = await supabase
        .from("communities")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!c) throw new NotFoundError("Community", slug);
      communityId = c.id;
    }

    const result = await updateCommunity(
      supabase,
      ctx.identityId,
      communityId,
      body,
      ctx.requestId,
    );
    return ok(
      { community: result.community },
      { ctx, eventId: result.event_id },
    );
  } catch (err) {
    return fail(err, ctx);
  }
}

async function enrichCommunity(
  supabase: any,
  community: any,
  identityId: string | null,
) {
  const [
    capabilities,
    { data: settings },
    { data: rules },
    { data: adminRows },
    { data: recentMembers },
  ] = await Promise.all([
    resolveCommunityCapabilities(supabase, community.id, identityId),
    supabase
      .from("community_settings")
      .select("*")
      .eq("community_id", community.id)
      .maybeSingle(),
    supabase
      .from("community_rules")
      .select("id, title, description, position")
      .eq("community_id", community.id)
      .eq("status", "ACTIVE")
      .order("position", { ascending: true }),
    supabase
      .from("community_membership_roles")
      .select(
        `
        role_id,
        community_roles!inner ( id, role_key, community_id ),
        community_memberships!inner ( id, identity_id, joined_at, status )
      `,
      )
      .eq("community_roles.community_id", community.id)
      .in("community_roles.role_key", ["OWNER", "ADMIN"])
      .eq("community_memberships.status", "ACTIVE")
      .limit(8),
    supabase
      .from("community_memberships")
      .select("identity_id, joined_at")
      .eq("community_id", community.id)
      .eq("status", "ACTIVE")
      .order("joined_at", { ascending: false })
      .limit(6),
  ]);

  const adminIds = Array.from(
    new Set(
      (adminRows || [])
        .map((r: any) => r.community_memberships?.identity_id)
        .filter(Boolean),
    ),
  );
  const recentIds = Array.from(
    new Set(
      (recentMembers || []).map((m: any) => m.identity_id).filter(Boolean),
    ),
  );
  const allUserIds = Array.from(new Set([...adminIds, ...recentIds]));

  const { data: users } =
    allUserIds.length > 0
      ? await supabase
          .from("users")
          .select("id, username, full_name, avatar_url, tagline, is_verified")
          .in("id", allUserIds)
      : { data: [] as any[] };

  const userMap = new Map((users || []).map((u: any) => [u.id, u]));

  const admins = (adminRows || [])
    .map((r: any) => {
      const uid = r.community_memberships?.identity_id;
      const user = uid ? userMap.get(uid) : null;
      if (!user) return null;
      return {
        identity_id: uid,
        role_key: r.community_roles?.role_key,
        user,
      };
    })
    .filter(Boolean);

  const recent = (recentMembers || [])
    .map((m: any) => userMap.get(m.identity_id))
    .filter(Boolean);

  return {
    community,
    settings: settings || null,
    rules: rules || [],
    admins,
    recent_members: recent,
    capabilities,
  };
}
