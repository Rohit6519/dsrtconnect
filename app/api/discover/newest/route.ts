import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "12"), 50);

  if (user) {
    const { data } = await supabase.rpc("smart_discover_communities", {
      p_user_id: user.id,
      p_tab: "newest",
      p_limit: limit,
      p_offset: 0,
    });
    return NextResponse.json({ communities: data || [] });
  }

  // Fallback - REAL newest
  const { data } = await supabase
    .from("communities")
    .select(
      "id, name, slug, description, category, icon, icon_color, cover_url, tags, member_count, post_count, view_count, is_verified, created_at",
    )
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  return NextResponse.json({ communities: data || [] });
}
