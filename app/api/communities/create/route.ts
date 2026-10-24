import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Generate URL-safe slug
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    name,
    slug: providedSlug,
    description,
    category,
    tags,
    icon_color,
    icon,
    cover_url,
    is_public,
    institution_id,
  } = body;

  // Validation
  if (!name || name.trim().length < 3) {
    return NextResponse.json(
      { error: "Community name must be at least 3 characters" },
      { status: 400 },
    );
  }

  if (name.trim().length > 60) {
    return NextResponse.json(
      { error: "Community name too long (max 60 chars)" },
      { status: 400 },
    );
  }

  // Generate slug
  let finalSlug = (providedSlug || slugify(name)).slice(0, 50);
  if (!finalSlug) finalSlug = slugify(name);

  // Check slug uniqueness
  const { data: existing } = await supabase
    .from("communities")
    .select("id")
    .eq("slug", finalSlug)
    .maybeSingle();

  if (existing) {
    // Auto-append random suffix
    const suffix = Math.random().toString(36).substring(2, 6);
    finalSlug = `${finalSlug}-${suffix}`;
  }

  // Create community
  const { data: community, error } = await supabase
    .from("communities")
    .insert({
      name: name.trim(),
      slug: finalSlug,
      description: description?.trim() || null,
      category: category || "general",
      tags: Array.isArray(tags)
        ? tags.filter((t) => t?.trim()).slice(0, 10)
        : [],
      icon: icon || "Users",
      icon_color: icon_color || "blue",
      cover_url: cover_url || null,
      is_public: is_public !== false,
      institution_id: institution_id || null,
      created_by: user.id,
      member_count: 1, // Creator is first member
      post_count: 0,
    })
    .select()
    .single();

  if (error) {
    console.error("Create community error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create community" },
      { status: 500 },
    );
  }

  // Note: Trigger auto-adds creator as owner in community_members

  return NextResponse.json({
    success: true,
    community,
    redirect: `/community/${community.slug}`,
  });
}
