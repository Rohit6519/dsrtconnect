import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const offset = parseInt(searchParams.get("offset") || "0");

  const { data, error } = await supabase.rpc("smart_discover_communities", {
    p_user_id: user.id,
    p_tab: "recommended",
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    console.error("Recommended error:", error);
    // REAL fallback
    const { data: fallback } = await supabase
      .from("communities")
      .select(
        "id, name, slug, description, category, icon, icon_color, cover_url, tags, member_count, post_count, view_count, is_verified, created_at",
      )
      .eq("is_public", true)
      .order("view_count", { ascending: false, nullsFirst: false })
      .limit(limit);

    return NextResponse.json({ communities: fallback || [] });
  }

  return NextResponse.json({ communities: data || [] });
}
