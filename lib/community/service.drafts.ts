// ============================================================
// lib/community/service.drafts.ts
// Draft lifecycle service for the Community Studio.
// FIXED: Handles publishing safely without strict 422 validations.
// ============================================================

import { SupabaseClient } from "@supabase/supabase-js";
import {
  writeAudit,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "@/lib/kernel";
import { createCommunity, publishCommunity } from "./service.community";
import { normalizeSlug, generateUniqueSlug } from "./slugs";

export interface DraftData {
  name?: string;
  tagline?: string;
  slug?: string;
  logo_url?: string | null;
  logo_file_id?: string | null;
  cover_url?: string | null;
  cover_file_id?: string | null;
  visibility?: "PUBLIC" | "PRIVATE" | "UNLISTED";
  community_type?: string;
  category?: string;
  topics?: string[];
  location_text?: string | null;
  website?: string | null;
  short_description?: string | null;
  description?: string | null;
  join_policy?: "OPEN" | "APPROVAL_REQUIRED" | "INVITE_ONLY" | "CLOSED";
  allow_member_invites?: boolean;
  rules?: Array<{ title: string; description?: string }>;
  allow_member_posts?: boolean;
  allow_member_polls?: boolean;
  allow_member_resources?: boolean;
  require_post_approval?: boolean;
  show_member_directory?: boolean;
  show_member_count?: boolean;
}

export interface CommunityDraft {
  id: string;
  owner_identity_id: string;
  community_id: string | null;
  step: string;
  data: DraftData;
  status: "DRAFT" | "PUBLISHING" | "PUBLISHED" | "DISCARDED";
  autosave_version: number;
  published_at: string | null;
  discarded_at: string | null;
  created_at: string;
  updated_at: string;
}

function nullToUndefined<T>(v: T | null | undefined): T | undefined {
  return v === null ? undefined : v;
}

export async function createDraft(
  supabase: SupabaseClient,
  actorId: string,
): Promise<CommunityDraft> {
  const { data, error } = await supabase
    .from("community_drafts")
    .insert({
      owner_identity_id: actorId,
      step: "identity",
      data: {},
      status: "DRAFT",
    })
    .select("*")
    .single();

  if (error || !data)
    throw new Error(`Failed to create draft: ${error?.message}`);
  return data as CommunityDraft;
}

export async function getDraft(
  supabase: SupabaseClient,
  actorId: string,
  draftId: string,
): Promise<CommunityDraft> {
  const { data } = await supabase
    .from("community_drafts")
    .select("*")
    .eq("id", draftId)
    .maybeSingle();

  if (!data) throw new NotFoundError("Draft", draftId);
  if (data.owner_identity_id !== actorId)
    throw new ForbiddenError("Not your draft");
  return data as CommunityDraft;
}

export async function listMyDrafts(
  supabase: SupabaseClient,
  actorId: string,
): Promise<CommunityDraft[]> {
  const { data } = await supabase
    .from("community_drafts")
    .select("*")
    .eq("owner_identity_id", actorId)
    .eq("status", "DRAFT")
    .order("updated_at", { ascending: false })
    .limit(10);

  return (data || []) as CommunityDraft[];
}

export async function updateDraft(
  supabase: SupabaseClient,
  actorId: string,
  draftId: string,
  patch: Partial<DraftData>,
  step?: string,
): Promise<CommunityDraft> {
  const current = await getDraft(supabase, actorId, draftId);
  if (current.status !== "DRAFT") {
    return current;
  }

  const nextData: DraftData = { ...(current.data || {}), ...(patch || {}) };

  const { data, error } = await supabase
    .from("community_drafts")
    .update({
      data: nextData,
      step: step ?? current.step,
      autosave_version: current.autosave_version + 1,
    })
    .eq("id", draftId)
    .eq("owner_identity_id", actorId)
    .select("*")
    .single();

  if (error || !data)
    throw new Error(`Failed to update draft: ${error?.message}`);
  return data as CommunityDraft;
}

export async function discardDraft(
  supabase: SupabaseClient,
  actorId: string,
  draftId: string,
): Promise<void> {
  const current = await getDraft(supabase, actorId, draftId);
  if (current.status === "PUBLISHED") return;
  await supabase
    .from("community_drafts")
    .update({ status: "DISCARDED", discarded_at: new Date().toISOString() })
    .eq("id", draftId)
    .eq("owner_identity_id", actorId);
}

export async function publishDraft(
  supabase: SupabaseClient,
  actorId: string,
  draftId: string,
  requestId?: string,
): Promise<{ community_id: string; slug: string; public_id: string }> {
  const draft = await getDraft(supabase, actorId, draftId);

  // If already published, return existing community details
  if (draft.status === "PUBLISHED" && draft.community_id) {
    const { data: existing } = await supabase
      .from("communities")
      .select("id, slug, public_id")
      .eq("id", draft.community_id)
      .maybeSingle();

    if (existing) {
      return {
        community_id: existing.id,
        slug: existing.slug,
        public_id: existing.public_id || existing.id,
      };
    }
  }

  const data: DraftData = { ...(draft.data || {}) };

  // Fallbacks for empty fields
  const name = (data.name || "").trim() || "My DSRT Community";
  const tagline =
    (data.short_description || data.tagline || "").trim() ||
    "A vibrant community of builders on DSRT.";
  const visibility = data.visibility || "PUBLIC";
  const joinPolicy = data.join_policy || "OPEN";

  let targetSlug = data.slug ? normalizeSlug(data.slug) : normalizeSlug(name);
  if (!targetSlug || targetSlug.length < 2) {
    targetSlug = await generateUniqueSlug(supabase, name);
  }

  await supabase
    .from("community_drafts")
    .update({ status: "PUBLISHING" })
    .eq("id", draftId)
    .eq("owner_identity_id", actorId);

  let createdCommunityId: string | null = null;
  try {
    const { community } = await createCommunity(
      supabase,
      actorId,
      {
        name,
        slug: targetSlug,
        short_description: tagline,
        description: data.description ?? tagline,
        visibility,
        join_policy: joinPolicy,
        community_type: data.community_type || "standard",
        category: data.category ?? "general",
        topics: data.topics ?? [],
        location_text: nullToUndefined(data.location_text),
        website: nullToUndefined(data.website),
      },
      requestId,
    );
    createdCommunityId = community.id;

    // Attach visuals
    const updatePatch: Record<string, any> = {};
    if (data.logo_url) updatePatch.logo_url = data.logo_url;
    if (data.cover_url) updatePatch.cover_url = data.cover_url;
    if (Object.keys(updatePatch).length > 0) {
      await supabase
        .from("communities")
        .update(updatePatch)
        .eq("id", community.id);
    }

    // Rules
    const rulesToInsert =
      data.rules && data.rules.length > 0
        ? data.rules
        : [
            {
              title: "Be Respectful & Constructive",
              description: "Maintain a supportive environment for all members.",
            },
          ];

    const rows = rulesToInsert
      .filter((r) => r.title && r.title.trim().length > 0)
      .map((r, i) => ({
        community_id: community.id,
        title: r.title.trim(),
        description: r.description?.trim() || null,
        position: i,
        status: "ACTIVE",
        created_by: actorId,
      }));

    if (rows.length > 0) {
      await supabase.from("community_rules").insert(rows);
    }

    // Publish
    await publishCommunity(supabase, actorId, community.id, requestId);

    // Mark draft PUBLISHED
    await supabase
      .from("community_drafts")
      .update({
        status: "PUBLISHED",
        community_id: community.id,
        published_at: new Date().toISOString(),
      })
      .eq("id", draftId)
      .eq("owner_identity_id", actorId);

    return {
      community_id: community.id,
      slug: community.slug,
      public_id: community.public_id || community.id,
    };
  } catch (err: any) {
    // Revert draft status
    await supabase
      .from("community_drafts")
      .update({ status: "DRAFT" })
      .eq("id", draftId)
      .eq("owner_identity_id", actorId);

    throw err;
  }
}
