import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uid = user.id;

  try {
    // 🎯 1. Fetch User's Main Projects
    let publishedProjects: any[] = [];
    try {
      const { data: pData, error: pErr } = await supabase
        .from("projects")
        .select("*")
        .or(`founder_id.eq.${uid},user_id.eq.${uid},created_by.eq.${uid}`)
        .order("created_at", { ascending: false });

      if (!pErr && pData) {
        publishedProjects = pData.filter(
          (p: any) => p.status !== "draft" && p.visibility !== "draft",
        );
      } else {
        const { data: rawProjects } = await supabase
          .from("projects")
          .select("*");
        if (rawProjects) {
          publishedProjects = rawProjects.filter(
            (p: any) =>
              (p.founder_id === uid ||
                p.user_id === uid ||
                p.created_by === uid) &&
              p.status !== "draft" &&
              p.visibility !== "draft",
          );
        }
      }
    } catch (e) {
      console.error("[Dashboard projects fetch error]:", e);
    }

    // 🎯 2. Fetch User's Draft Projects
    let drafts: any[] = [];
    try {
      const { data: dData } = await supabase
        .from("projects")
        .select("*")
        .or(`founder_id.eq.${uid},user_id.eq.${uid},created_by.eq.${uid}`)
        .or("visibility.eq.draft,status.eq.draft")
        .order("updated_at", { ascending: false });

      if (dData) drafts = dData;
    } catch (e) {
      console.error("[Dashboard drafts fetch error]:", e);
    }

    // 🎯 3. Fetch Followed Projects (Enhanced & Fail-Safe)
    let followingProjects: any[] = [];
    try {
      const { data: follows, error: followsErr } = await supabase
        .from("follows")
        .select("*")
        .eq("follower_id", uid);

      if (!followsErr && follows && follows.length > 0) {
        // Collect project IDs from following_id, target_id, or entity_id
        const followedIds = Array.from(
          new Set(
            follows
              .filter(
                (f: any) => !f.following_type || f.following_type === "project",
              )
              .map((f: any) => f.following_id || f.target_id || f.entity_id)
              .filter(Boolean),
          ),
        );

        if (followedIds.length > 0) {
          const { data: pData } = await supabase
            .from("projects")
            .select("*")
            .in("id", followedIds);

          if (pData && pData.length > 0) {
            const founderIds = Array.from(
              new Set(
                pData
                  .map((p: any) => p.founder_id || p.user_id || p.created_by)
                  .filter(Boolean),
              ),
            );

            let userMap = new Map<string, any>();
            if (founderIds.length > 0) {
              const { data: users } = await supabase
                .from("users")
                .select("id, full_name, username, avatar_url")
                .in("id", founderIds);

              userMap = new Map((users || []).map((u: any) => [u.id, u]));
            }

            followingProjects = pData.map((p: any) => ({
              ...p,
              is_following: true,
              founder:
                userMap.get(p.founder_id || p.user_id || p.created_by) || null,
            }));
          }
        }
      }
    } catch (e) {
      console.error("[Dashboard following fetch error]:", e);
    }

    // 🎯 4. Fetch Activity
    let activity: any[] = [];
    try {
      const { data: actData } = await supabase
        .from("project_activity")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(20);

      if (actData) activity = actData;
    } catch (e) {}

    // Calculate Stats
    const totalProjects = publishedProjects.length;
    const activeProjects = publishedProjects.filter(
      (p: any) => p.status === "active" || !p.status,
    ).length;
    const totalFollowers = publishedProjects.reduce(
      (s: number, p: any) => s + (p.follower_count || 0),
      0,
    );

    return NextResponse.json({
      projects: publishedProjects,
      drafts,
      activity,
      analytics: {},
      viewsOverTime: [],
      trafficSources: [],
      audienceBreakdown: [],
      following: followingProjects,
      stats: {
        totalProjects,
        activeProjects,
        totalFollowers,
        totalApplications: 0,
        totalTeamMembers: totalProjects,
        totalRecruiting: 0,
      },
    });
  } catch (error: any) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
