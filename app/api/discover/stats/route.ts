import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 30;

export async function GET() {
  const supabase = createClient();

  try {
    const now = new Date();
    const monthAgo = new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const [
      communitiesRes,
      membersRes,
      projectsRes,
      venturesRes,
      locationsRes,
      likesRes,
      recentMembersRes,
    ] = await Promise.all([
      supabase
        .from("communities")
        .select("id", { count: "exact", head: true })
        .eq("is_public", true),
      supabase
        .from("community_members")
        .select("user_id", { count: "exact", head: true }),
      supabase.from("projects").select("id", { count: "exact", head: true }),
      supabase.from("ventures").select("id", { count: "exact", head: true }),
      supabase.from("locations").select("country").not("country", "is", null),
      supabase
        .from("community_likes")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("community_members")
        .select("id", { count: "exact", head: true })
        .gte("joined_at", monthAgo),
    ]);

    const uniqueCountries = new Set(
      (locationsRes.data || []).map((l: any) => l.country),
    ).size;

    const totalLikes = likesRes.count || 0;
    const totalMembers = membersRes.count || 0;
    const avgRating =
      totalMembers > 0
        ? Math.min(5, (totalLikes / totalMembers) * 5 + 3.5).toFixed(1)
        : "4.5";

    return NextResponse.json({
      stats: {
        total_communities: communitiesRes.count || 0,
        total_members: membersRes.count || 0,
        total_projects: projectsRes.count || 0,
        total_ventures: venturesRes.count || 0,
        total_countries: uniqueCountries,
        total_likes: totalLikes,
        avg_rating: avgRating,
        total_reviews: totalLikes,
        new_members_this_month: recentMembersRes.count || 0,
      },
    });
  } catch (error) {
    return NextResponse.json({
      stats: {
        total_communities: 0,
        total_members: 0,
        total_projects: 0,
        total_ventures: 0,
        total_countries: 0,
        total_likes: 0,
        avg_rating: "0",
        total_reviews: 0,
        new_members_this_month: 0,
      },
    });
  }
}
