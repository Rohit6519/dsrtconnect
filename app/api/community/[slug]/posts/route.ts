import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { slug: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: community } = await supabase
    .from("communities")
    .select("id, created_by")
    .eq("slug", params.slug)
    .single();

  if (!community) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  let isMember = false;
  let isCreator = false;
  if (user) {
    isCreator = community.created_by === user.id;
    if (!isCreator) {
      const { data: membership } = await supabase
        .from("community_members")
        .select("id")
        .eq("community_id", community.id)
        .eq("user_id", user.id)
        .maybeSingle();
      isMember = !!membership;
    } else {
      isMember = true;
    }
  }

  // Build query
  let query = supabase
    .from("posts")
    .select(
      `
      *,
      users:author_id (id, full_name, username, avatar_url, tagline)
    `,
    )
    .eq("community_id", community.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Non-members: only public posts
  if (!isMember) {
    query = query.or("visibility.eq.public,is_public.eq.true");
  }

  const { data: posts, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message, posts: [] });
  }

  return NextResponse.json({
    posts: posts || [],
    is_member: isMember,
    is_creator: isCreator,
    can_post: isMember,
  });
}
