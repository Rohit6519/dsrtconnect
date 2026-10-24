import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const VALID_TYPES = new Set([
  "general",
  "release",
  "building",
  "experiment",
  "progress",
  "fix",
  "announcement",
  "collaboration",
  "insight",
]);

const VALID_RELEASE_LABELS = new Set(["none", "pre-release", "release"]);

const VALID_STAGES = new Set([
  "idea",
  "research",
  "planning",
  "prototype",
  "mvp",
  "beta",
  "production",
  "scaling",
  "completed",
  "on-hold",
]);

const VALID_SORTS = new Set(["newest", "most_discussed", "most_saved"]);

// Limits
const MAX_TITLE_LEN = 200;
const MAX_CONTENT_LEN = 10_000;
const MAX_SECTION_TEXT_LEN = 10_000;
const MAX_SECTIONS = 8;
const MAX_IMAGES_TOTAL = 4;
const MAX_VIDEOS_TOTAL = 1;
const MAX_LINKS = 8;
const MAX_LINK_TITLE_LEN = 60;
const MAX_LINK_URL_LEN = 500;
const MAX_TAGS = 10;
const MAX_TAG_LEN = 40;
const MAX_ATTACHMENTS = 8;
const MAX_ALT_TEXT_LEN = 200;
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION / SANITIZATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function isValidUrl(u: unknown): u is string {
  if (typeof u !== "string") return false;
  const s = u.trim();
  if (!s) return false;
  return /^https?:\/\/.+/i.test(s) || /^mailto:.+@.+/i.test(s);
}

function isValidMediaUrl(u: unknown): u is string {
  if (typeof u !== "string") return false;
  const s = u.trim();
  if (!s) return false;
  return /^https?:\/\/.+/i.test(s) || /^\/[a-z0-9]/i.test(s);
}

function safeString(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.slice(0, max);
}

function safeArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function sanitizeTag(t: unknown): string | null {
  if (typeof t !== "string") return null;
  const cleaned = t.trim().replace(/^#/, "").toLowerCase();
  if (!cleaned) return null;
  if (cleaned.length > MAX_TAG_LEN) return cleaned.slice(0, MAX_TAG_LEN);
  return cleaned;
}

interface SectionInput {
  id?: unknown;
  text?: unknown;
  images?: unknown;
  video?: unknown;
}

interface LinkInput {
  id?: unknown;
  title?: unknown;
  url?: unknown;
}

interface NormalizedImage {
  url: string;
  alt?: string;
}

interface NormalizedSection {
  id: string;
  text: string;
  images: NormalizedImage[];
  video: string | null;
}

function normalizeImageEntry(entry: unknown): NormalizedImage | null {
  if (typeof entry === "string") {
    if (!isValidMediaUrl(entry)) return null;
    return { url: entry.trim() };
  }
  if (entry && typeof entry === "object") {
    const e = entry as any;
    if (!isValidMediaUrl(e.url)) return null;
    const img: NormalizedImage = { url: String(e.url).trim() };
    if (typeof e.alt === "string" && e.alt.trim()) {
      img.alt = e.alt.trim().slice(0, MAX_ALT_TEXT_LEN);
    }
    return img;
  }
  return null;
}

function sanitizeSections(input: unknown): {
  sections: NormalizedSection[];
  totalImages: number;
  totalVideos: number;
  error?: string;
} {
  const raw = safeArray<SectionInput>(input);
  if (raw.length > MAX_SECTIONS) {
    return {
      sections: [],
      totalImages: 0,
      totalVideos: 0,
      error: `Maximum ${MAX_SECTIONS} sections allowed`,
    };
  }

  let totalImages = 0;
  let totalVideos = 0;
  const sections: NormalizedSection[] = [];

  for (let i = 0; i < raw.length; i++) {
    const s = raw[i] || {};
    const text = safeString(s.text, MAX_SECTION_TEXT_LEN).trim();

    const imagesRaw = safeArray<unknown>(s.images);
    const images: NormalizedImage[] = [];
    for (const entry of imagesRaw) {
      const img = normalizeImageEntry(entry);
      if (!img) continue;
      images.push(img);
      totalImages++;
      if (totalImages > MAX_IMAGES_TOTAL) {
        return {
          sections: [],
          totalImages,
          totalVideos,
          error: `Maximum ${MAX_IMAGES_TOTAL} images per update`,
        };
      }
    }

    let video: string | null = null;
    if (s.video && isValidMediaUrl(s.video)) {
      video = String(s.video).trim();
      totalVideos++;
      if (totalVideos > MAX_VIDEOS_TOTAL) {
        return {
          sections: [],
          totalImages,
          totalVideos,
          error: `Maximum ${MAX_VIDEOS_TOTAL} video per update`,
        };
      }
    }

    if (!text && images.length === 0 && !video) continue;

    sections.push({
      id: typeof s.id === "string" && s.id ? s.id.slice(0, 40) : `s${i}`,
      text,
      images,
      video,
    });
  }

  return { sections, totalImages, totalVideos };
}

function sanitizeLinks(input: unknown): {
  links: Array<{ title: string; url: string }>;
  error?: string;
} {
  const raw = safeArray<LinkInput>(input);
  if (raw.length > MAX_LINKS) {
    return { links: [], error: `Maximum ${MAX_LINKS} links allowed` };
  }

  const links: Array<{ title: string; url: string }> = [];

  for (const l of raw) {
    const title = safeString(l.title, MAX_LINK_TITLE_LEN).trim();
    const url = safeString(l.url, MAX_LINK_URL_LEN).trim();

    if (!title && !url) continue;
    if (!url || !isValidUrl(url)) {
      return { links: [], error: `Invalid URL: ${url.slice(0, 40)}` };
    }
    if (!title) {
      return { links: [], error: "Every link needs a title" };
    }

    links.push({ title, url });
  }

  return { links };
}

function sanitizeTags(input: unknown): string[] {
  const raw = safeArray<unknown>(input);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of raw) {
    const cleaned = sanitizeTag(t);
    if (!cleaned) continue;
    if (seen.has(cleaned)) continue;
    seen.add(cleaned);
    out.push(cleaned);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

function sanitizeAttachments(input: unknown): any[] {
  const raw = safeArray<any>(input);
  const out: any[] = [];
  for (const a of raw) {
    if (!a || typeof a !== "object") continue;
    if (!isValidMediaUrl(a.url)) continue;
    out.push({
      url: String(a.url).trim().slice(0, 500),
      name: typeof a.name === "string" ? a.name.slice(0, 200) : "File",
      size: typeof a.size === "number" && a.size > 0 ? Math.floor(a.size) : 0,
      type:
        typeof a.type === "string"
          ? a.type.slice(0, 100)
          : "application/octet-stream",
    });
    if (out.length >= MAX_ATTACHMENTS) break;
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// POST — create update
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to post updates" },
      { status: 401 },
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    // ─── 1. Load project ───────────────────────────────────────────
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select(
        "id, founder_id, user_id, stage, name, slug, is_public, visibility, status",
      )
      .eq("slug", slug)
      .maybeSingle();

    if (projErr) throw projErr;
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isOwner =
      project.founder_id === user.id || project.user_id === user.id;
    let memberRole: string | null = null;

    if (!isOwner) {
      const { data: member } = await supabase
        .from("project_members")
        .select("role")
        .eq("project_id", project.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!member) {
        return NextResponse.json(
          { error: "Only team members can post updates on this project" },
          { status: 403 },
        );
      }
      memberRole = member.role || "Member";
    }

    // ─── 2. Sanitize fields ────────────────────────────────────────
    const title = safeString(body.title, MAX_TITLE_LEN).trim();

    const updateType =
      typeof body.update_type === "string" && VALID_TYPES.has(body.update_type)
        ? body.update_type
        : "general";

    const releaseLabel =
      typeof body.release_label === "string" &&
      VALID_RELEASE_LABELS.has(body.release_label)
        ? body.release_label
        : "none";

    const commentsDisabled = body.comments_disabled === true;

    const { sections, error: sectionErr } = sanitizeSections(body.sections);
    if (sectionErr) {
      return NextResponse.json({ error: sectionErr }, { status: 400 });
    }

    const { links, error: linkErr } = sanitizeLinks(body.links);
    if (linkErr) {
      return NextResponse.json({ error: linkErr }, { status: 400 });
    }

    const tags = sanitizeTags(body.tags);
    const attachments = sanitizeAttachments(body.attachments);

    // Legacy fields
    const legacyContent = safeString(body.content, MAX_CONTENT_LEN).trim();
    const legacyImageUrls = safeArray<unknown>(body.image_urls)
      .filter(isValidMediaUrl)
      .slice(0, 8) as string[];
    const legacyMediaUrls = safeArray<unknown>(body.media_urls)
      .filter(isValidMediaUrl)
      .slice(0, 4) as string[];

    // Always guarantee non-null content
    const sectionTexts = sections
      .map((s) => s.text)
      .filter(Boolean)
      .join("\n\n");
    const primaryContent =
      legacyContent || sectionTexts || title || "Project update";

    // 🎯 3. Insert Payload with Publisher Info ───────────────────────
    const insertData: Record<string, any> = {
      user_id: user.id,
      project_id: project.id,
      publisher_type: "project", // 👈 Fixes publisher_type NOT NULL constraint
      publisher_id: project.id, // 👈 Fixes publisher_id constraint
      type: "update",
      post_category: "update",
      title: title || null,
      content: primaryContent, // Never null
      sections: sections,
      links: links,
      release_label: releaseLabel,
      tags: tags,
      image_urls: legacyImageUrls,
      media_urls: legacyMediaUrls,
      attachments: attachments,
      is_pinned: false,
      visibility: "global",
      update_type: updateType,
      comments_disabled: commentsDisabled,
    };

    if ((project as any).community_id) {
      insertData.community_id = (project as any).community_id;
    }

    // ─── 4. Insert ─────────────────────────────────────────────────
    const { data: post, error: insertErr } = await supabase
      .from("posts")
      .insert(insertData)
      .select(
        `
        *,
        user:users!posts_user_id_fkey (
          id, full_name, username, avatar_url, is_verified
        )
      `,
      )
      .single();

    if (insertErr) {
      console.error("[updates:POST] Insert error:", insertErr);
      throw insertErr;
    }

    // ─── 5. Side effects (non-blocking) ────────────────────────────
    Promise.resolve(
      supabase
        .from("projects")
        .update({ last_activity_at: new Date().toISOString() })
        .eq("id", project.id),
    ).catch((e) =>
      console.error("[updates:POST] last_activity_at bump failed:", e),
    );

    const activityTitle = title || primaryContent.slice(0, 80);
    const activitySubtitle =
      releaseLabel !== "none"
        ? releaseLabel.replace("-", " ")
        : updateType !== "general"
          ? updateType
          : null;

    Promise.resolve(
      supabase.from("project_activity").insert({
        user_id: project.founder_id || project.user_id,
        project_id: project.id,
        type: "update_published",
        title: activityTitle,
        subtitle: activitySubtitle,
        icon: "ChatCircleDots",
        color:
          releaseLabel === "release"
            ? "emerald"
            : releaseLabel === "pre-release"
              ? "amber"
              : "blue",
        actor_id: user.id,
        entity_type: "post",
        entity_id: post.id,
      }),
    ).catch((e) => console.error("[updates:POST] activity insert failed:", e));

    const responsePost = {
      ...post,
      author_role: isOwner ? "Founder" : memberRole,
      user_liked: false,
      user_bookmarked: false,
    };

    return NextResponse.json({ success: true, update: responsePost });
  } catch (error: any) {
    console.error("[updates:POST] Fatal:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to publish update" },
      { status: 500 },
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET — list updates
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT))),
    MAX_LIMIT,
  );
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0"));
  const type = searchParams.get("type") || "all";
  const sortParam = searchParams.get("sort") || "newest";
  const sort = VALID_SORTS.has(sortParam) ? sortParam : "newest";

  try {
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("id, founder_id, user_id, is_public, visibility, status")
      .eq("slug", slug)
      .maybeSingle();

    if (projErr) throw projErr;
    if (!project) {
      return NextResponse.json({ updates: [], has_more: false });
    }

    const isPublicReadable =
      project.status !== "draft" &&
      project.status !== "archived" &&
      (project.is_public ||
        project.visibility === "public" ||
        project.visibility === "unlisted");

    let canRead = isPublicReadable;
    if (!canRead && user?.id) {
      if (project.founder_id === user.id || project.user_id === user.id) {
        canRead = true;
      } else {
        const { data: member } = await supabase
          .from("project_members")
          .select("id")
          .eq("project_id", project.id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (member) canRead = true;
      }
    }

    if (!canRead) {
      return NextResponse.json(
        { error: "Forbidden", updates: [], has_more: false },
        { status: 403 },
      );
    }

    let query = supabase
      .from("posts")
      .select(
        `
        id, project_id, user_id, type, post_category,
        title, content, sections, links, release_label, tags,
        image_urls, media_urls, attachments,
        update_type, milestone_from, milestone_to,
        like_count, comment_count, bookmark_count,
        is_pinned, pinned_at, comments_disabled,
        created_at, edited_at,
        user:users!posts_user_id_fkey (
          id, full_name, username, avatar_url, is_verified
        )
      `,
        { count: "exact" },
      )
      .eq("project_id", project.id);

    query = query.order("created_at", { ascending: false });
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      updates: data || [],
      has_more: (data || []).length >= limit,
      total: (data || []).length,
    });
  } catch (error: any) {
    console.error("[updates:GET] Error:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to load updates",
        updates: [],
        has_more: false,
      },
      { status: 500 },
    );
  }
}
