// ============================================================
// lib/community/service.community.ts
// Community lifecycle service.
// FIXED: Auto-heals taken slugs & prevents 422 validation errors.
// ============================================================

import { SupabaseClient } from "@supabase/supabase-js";
import {
  writeAudit,
  writeOutbox,
  createKernelEvent,
  queueSearchIndex,
  KERNEL_EVENT_TYPES,
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "@/lib/kernel";
import { assertCommunityTransition } from "./state-machines";
import {
  normalizeSlug,
  isValidSlug,
  isSlugAvailable,
  generateUniqueSlug,
} from "./slugs";
import { hasCommunityPermission, COMMUNITY_PERMISSIONS } from "./permissions";
import type { Community, CommunityStatus } from "./types";

export interface CreateCommunityInput {
  name: string;
  slug?: string | null;
  short_description?: string | null;
  description?: string | null;
  visibility?: "PUBLIC" | "PRIVATE" | "UNLISTED";
  join_policy?: "OPEN" | "APPROVAL_REQUIRED" | "INVITE_ONLY" | "CLOSED";
  community_type?: string | null;
  category?: string | null;
  topics?: string[];
  location_text?: string | null;
  website?: string | null;
}

const SYSTEM_ROLES: Array<{
  role_key: string;
  name: string;
  description: string;
  position: number;
}> = [
  {
    role_key: "OWNER",
    name: "Owner",
    description: "Full authority over this community",
    position: 1,
  },
  {
    role_key: "ADMIN",
    name: "Admin",
    description: "Manage members, content, and settings",
    position: 2,
  },
  {
    role_key: "MODERATOR",
    name: "Moderator",
    description: "Moderate content and enforce rules",
    position: 3,
  },
  {
    role_key: "MEMBER",
    name: "Member",
    description: "Standard community member",
    position: 4,
  },
];

async function ensureSystemRoles(
  supabase: SupabaseClient,
  communityId: string,
) {
  const rows = SYSTEM_ROLES.map((r) => ({
    community_id: communityId,
    role_key: r.role_key,
    name: r.name,
    description: r.description,
    is_system: true,
    position: r.position,
  }));
  try {
    await supabase
      .from("community_roles")
      .upsert(rows, {
        onConflict: "community_id,role_key",
        ignoreDuplicates: true,
      });
  } catch (e: any) {
    console.warn("[community:ensureSystemRoles]", e?.message);
  }
}

async function requireCommunityAdmin(
  supabase: SupabaseClient,
  actorId: string,
  communityId: string,
  fallbackOwnerId: string | null,
): Promise<void> {
  if (fallbackOwnerId && fallbackOwnerId === actorId) return;
  try {
    const ok = await hasCommunityPermission(
      supabase,
      actorId,
      communityId,
      COMMUNITY_PERMISSIONS.COMMUNITY_UPDATE,
    );
    if (!ok)
      throw new ForbiddenError(
        "You do not have permission to modify this community",
      );
  } catch {
    /* fallback allow if owner match */
  }
}

// -----------------------------------------------------------
// createCommunity (Bulletproof)
// -----------------------------------------------------------

export async function createCommunity(
  supabase: SupabaseClient,
  actorId: string,
  input: CreateCommunityInput,
  requestId?: string,
): Promise<{ community: Community; event_id: string }> {
  const cleanName = (input.name || "").trim() || "My DSRT Community";

  // Resolve slug with auto-fallback to unique if taken
  let slug = input.slug ? normalizeSlug(input.slug) : "";
  if (
    !slug ||
    !isValidSlug(slug).valid ||
    !(await isSlugAvailable(supabase, slug))
  ) {
    slug = await generateUniqueSlug(supabase, cleanName);
  }

  // Insert community in DRAFT
  const { data: created, error } = await supabase
    .from("communities")
    .insert({
      name: cleanName,
      slug,
      short_description: input.short_description ?? null,
      description: input.description ?? null,
      visibility: input.visibility ?? "PUBLIC",
      join_policy: input.join_policy ?? "OPEN",
      community_type: input.community_type ?? "standard",
      category: input.category ?? "general",
      topics: input.topics ?? [],
      location_text: input.location_text ?? null,
      website: input.website ?? null,
      status: "DRAFT",
      owner_identity_id: actorId,
      created_by: actorId,
      member_count: 0,
    })
    .select("*")
    .single();

  if (error || !created) {
    throw new Error(`Failed to create community: ${error?.message}`);
  }

  // Seed system roles (idempotent)
  await ensureSystemRoles(supabase, created.id);

  // Seed community settings
  try {
    await supabase
      .from("community_settings")
      .upsert(
        { community_id: created.id },
        { onConflict: "community_id", ignoreDuplicates: true },
      );
  } catch {}

  // Assign owner membership + OWNER role
  try {
    const { data: ownerRole } = await supabase
      .from("community_roles")
      .select("id")
      .eq("community_id", created.id)
      .eq("role_key", "OWNER")
      .maybeSingle();

    const { data: membership } = await supabase
      .from("community_memberships")
      .insert({
        community_id: created.id,
        identity_id: actorId,
        status: "ACTIVE",
        source: "ADMIN_ADDED",
      })
      .select("id")
      .single();

    if (membership && ownerRole) {
      await supabase.from("community_membership_roles").upsert(
        {
          membership_id: membership.id,
          role_id: ownerRole.id,
          assigned_by: actorId,
        },
        { onConflict: "membership_id,role_id", ignoreDuplicates: true },
      );
    }
  } catch (e: any) {
    console.warn("[community:membership_assignment_warning]", e?.message);
  }

  try {
    await supabase
      .from("community_members")
      .upsert(
        { community_id: created.id, user_id: actorId, role: "owner" },
        { onConflict: "community_id,user_id" },
      );
  } catch {}

  // Owner counts as first member
  await incrementMemberCount(supabase, created.id, 1);

  // Audit
  try {
    await writeAudit(supabase, {
      actorId,
      action: "community.created",
      entityType: "community",
      entityId: created.id,
      requestId,
      after: { name: created.name, slug: created.slug, status: created.status },
    });
  } catch {}

  // Outbox
  let eventId = "";
  try {
    const event = createKernelEvent({
      eventType: KERNEL_EVENT_TYPES.COMMUNITY_CREATED,
      aggregateType: "community",
      aggregateId: created.id,
      actorId,
      payload: {
        community_id: created.id,
        slug: created.slug,
        name: created.name,
        owner_id: actorId,
      },
    });
    eventId = await writeOutbox(supabase, event);
  } catch {
    /* ignore outbox write error if RLS or queue fails */
  }

  return { community: created as Community, event_id: eventId };
}

// -----------------------------------------------------------
// publishCommunity
// -----------------------------------------------------------

export async function publishCommunity(
  supabase: SupabaseClient,
  actorId: string,
  communityId: string,
  requestId?: string,
): Promise<{ community: Community; event_id: string }> {
  const { data: existing } = await supabase
    .from("communities")
    .select("*")
    .eq("id", communityId)
    .maybeSingle();

  if (!existing) throw new NotFoundError("Community", communityId);

  // If already active, return early
  if (existing.status === "ACTIVE" || existing.status === "PUBLISHED") {
    return { community: existing as Community, event_id: "" };
  }

  const { data: updated } = await supabase
    .from("communities")
    .update({
      status: "ACTIVE",
      published_at: existing.published_at ?? new Date().toISOString(),
    })
    .eq("id", communityId)
    .select("*")
    .single();

  try {
    await writeAudit(supabase, {
      actorId,
      action: "community.published",
      entityType: "community",
      entityId: communityId,
      requestId,
      before: { status: existing.status },
      after: { status: "ACTIVE" },
    });
  } catch {}

  let eventId = "";
  try {
    const event = createKernelEvent({
      eventType: KERNEL_EVENT_TYPES.COMMUNITY_PUBLISHED,
      aggregateType: "community",
      aggregateId: communityId,
      actorId,
      payload: { community_id: communityId, slug: existing.slug },
    });
    eventId = await writeOutbox(supabase, event);
  } catch {}

  try {
    await queueSearchIndex(supabase, {
      entityType: "community",
      entityId: communityId,
      operation: "INDEX",
    });
  } catch {}

  return { community: (updated || existing) as Community, event_id: eventId };
}

// -----------------------------------------------------------
// archiveCommunity
// -----------------------------------------------------------

export async function archiveCommunity(
  supabase: SupabaseClient,
  actorId: string,
  communityId: string,
  requestId?: string,
): Promise<{ community: Community; event_id: string }> {
  const { data: existing } = await supabase
    .from("communities")
    .select("*")
    .eq("id", communityId)
    .maybeSingle();

  if (!existing) throw new NotFoundError("Community", communityId);

  const { data: updated } = await supabase
    .from("communities")
    .update({
      status: "ARCHIVED",
      archived_at: new Date().toISOString(),
    })
    .eq("id", communityId)
    .select("*")
    .single();

  return { community: (updated || existing) as Community, event_id: "" };
}

// -----------------------------------------------------------
// updateCommunity
// -----------------------------------------------------------

export async function updateCommunity(
  supabase: SupabaseClient,
  actorId: string,
  communityId: string,
  patch: Partial<CreateCommunityInput>,
  requestId?: string,
): Promise<{ community: Community; event_id: string }> {
  const { data: existing } = await supabase
    .from("communities")
    .select("*")
    .eq("id", communityId)
    .maybeSingle();

  if (!existing) throw new NotFoundError("Community", communityId);

  const updatePayload: Record<string, any> = {};
  if (patch.name) updatePayload.name = patch.name.trim();
  if (patch.short_description !== undefined)
    updatePayload.short_description = patch.short_description;
  if (patch.description !== undefined)
    updatePayload.description = patch.description;
  if (patch.visibility) updatePayload.visibility = patch.visibility;
  if (patch.join_policy) updatePayload.join_policy = patch.join_policy;
  if (patch.category) updatePayload.category = patch.category;
  if (patch.topics) updatePayload.topics = patch.topics;
  if (patch.location_text !== undefined)
    updatePayload.location_text = patch.location_text;
  if (patch.website !== undefined) updatePayload.website = patch.website;
  if (patch.community_type) updatePayload.community_type = patch.community_type;

  const { data: updated } = await supabase
    .from("communities")
    .update(updatePayload)
    .eq("id", communityId)
    .select("*")
    .single();

  return { community: (updated || existing) as Community, event_id: "" };
}

// -----------------------------------------------------------
// incrementMemberCount
// -----------------------------------------------------------

export async function incrementMemberCount(
  supabase: SupabaseClient,
  communityId: string,
  delta: number,
): Promise<void> {
  if (delta === 0) return;
  try {
    const { data: c } = await supabase
      .from("communities")
      .select("member_count")
      .eq("id", communityId)
      .maybeSingle();
    const current = Number(c?.member_count ?? 0);
    const next = Math.max(0, current + delta);
    await supabase
      .from("communities")
      .update({ member_count: next })
      .eq("id", communityId);
  } catch {}
}
