import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireAuthContext,
  ok,
  fail,
  NotFoundError,
  ForbiddenError,
  writeAudit,
} from "@/lib/kernel";
import {
  hasCommunityPermission,
  COMMUNITY_PERMISSIONS,
} from "@/lib/community/permissions";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  let ctx;
  try {
    const { slug } = await params;
    ctx = await requireAuthContext(req);
    const supabase = await createClient();

    const { data: community } = await supabase
      .from("communities")
      .select(
        "id, name, slug, short_description, description, logo_url, cover_url, banner_url, category, community_type, visibility, join_policy, location_text, website, owner_identity_id",
      )
      .eq("slug", slug)
      .maybeSingle();

    if (!community) throw new NotFoundError("Community", slug);

    const { data: settings } = await supabase
      .from("community_settings")
      .select("*")
      .eq("community_id", community.id)
      .maybeSingle();

    return ok(
      {
        community,
        settings: {
          ...(settings || {}),
          logo_url: community.logo_url || null,
          cover_url: community.cover_url || community.banner_url || null,
          banner_url: community.banner_url || community.cover_url || null,
          name: community.name || "",
          short_description: community.short_description || "",
        },
      },
      { ctx },
    );
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

    const { data: community } = await supabase
      .from("communities")
      .select("id, slug, owner_identity_id")
      .eq("slug", slug)
      .maybeSingle();

    if (!community) throw new NotFoundError("Community", slug);

    const isOwner = community.owner_identity_id === ctx.identityId;
    const canManage =
      isOwner ||
      (await hasCommunityPermission(
        supabase,
        ctx.identityId,
        community.id,
        COMMUNITY_PERMISSIONS.COMMUNITY_UPDATE,
      ));

    if (!canManage) throw new ForbiddenError("Not allowed");

    // 🎯 1. Update Communities Table (Logo, Cover, Banner, Name)
    const communityPatch: Record<string, any> = {};

    if ("logo_url" in body) communityPatch.logo_url = body.logo_url || null;
    if ("cover_url" in body) {
      communityPatch.cover_url = body.cover_url || null;
      communityPatch.banner_url = body.cover_url || null;
    }
    if ("banner_url" in body && !communityPatch.cover_url) {
      communityPatch.banner_url = body.banner_url || null;
      communityPatch.cover_url = body.banner_url || null;
    }
    if ("name" in body && body.name?.trim())
      communityPatch.name = body.name.trim();
    if ("short_description" in body)
      communityPatch.short_description = body.short_description?.trim() || null;

    if (Object.keys(communityPatch).length > 0) {
      const { error: commErr } = await supabase
        .from("communities")
        .update(communityPatch)
        .eq("id", community.id);

      if (commErr) {
        console.error("[settings PATCH error]:", commErr.message);
      }
    }

    // 🎯 2. Update Community Settings Toggles
    const allowedToggles = [
      "allow_member_posts",
      "allow_member_polls",
      "allow_member_resources",
      "allow_member_invites",
      "allow_external_links",
      "allow_media_uploads",
      "require_post_approval",
      "require_application",
      "show_member_directory",
      "show_member_count",
      "default_post_visibility",
    ];
    const settingsPatch: Record<string, any> = {};
    for (const key of allowedToggles) {
      if (key in body) settingsPatch[key] = body[key];
    }

    if (Object.keys(settingsPatch).length > 0) {
      await supabase
        .from("community_settings")
        .upsert(
          { community_id: community.id, ...settingsPatch },
          { onConflict: "community_id" },
        );
    }

    try {
      await writeAudit(supabase, {
        actorId: ctx.identityId,
        action: "community.settings.updated",
        entityType: "community",
        entityId: community.id,
        requestId: ctx.requestId,
        metadata: {
          community_changed: Object.keys(communityPatch),
          settings_changed: Object.keys(settingsPatch),
        },
      });
    } catch {}

    return ok({ updated: true, community: communityPatch }, { ctx });
  } catch (err) {
    return fail(err, ctx);
  }
}
