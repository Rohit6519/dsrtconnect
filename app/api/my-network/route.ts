import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // People I follow
    const { data: following } = await supabase
      .from("follows")
      .select(
        `
        following_id, created_at,
        users:following_id (
          id, full_name, username, avatar_url, tagline, brings, 
          location, execution_score, bio
        )
      `,
      )
      .eq("follower_id", user.id)
      .eq("following_type", "user")
      .order("created_at", { ascending: false });

    // People who follow me
    const { data: followers } = await supabase
      .from("follows")
      .select(
        `
        follower_id, created_at,
        users:follower_id (
          id, full_name, username, avatar_url, tagline, brings, 
          location, execution_score, bio
        )
      `,
      )
      .eq("following_id", user.id)
      .eq("following_type", "user")
      .order("created_at", { ascending: false });

    // Connections
    const { data: connections } = await supabase
      .from("builder_connections")
      .select(
        `
        id, status, created_at,
        requester:requester_id (id, full_name, username, avatar_url, tagline, brings, location),
        recipient:recipient_id (id, full_name, username, avatar_url, tagline, brings, location)
      `,
      )
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .eq("status", "accepted")
      .order("created_at", { ascending: false });

    // Pending sent
    const { data: pendingSent } = await supabase
      .from("builder_connections")
      .select(
        `
        id, message, created_at,
        recipient:recipient_id (id, full_name, username, avatar_url, tagline)
      `,
      )
      .eq("requester_id", user.id)
      .eq("status", "pending");

    // Pending received
    const { data: pendingReceived } = await supabase
      .from("builder_connections")
      .select(
        `
        id, message, created_at,
        requester:requester_id (id, full_name, username, avatar_url, tagline)
      `,
      )
      .eq("recipient_id", user.id)
      .eq("status", "pending");

    // 🎯 NEW: Smart suggested people using algorithm
    let suggestedPeople: any[] = [];

    try {
      const { data: suggestedFromAlgo, error: suggestError } =
        await supabase.rpc("suggest_people_for_user", {
          p_user_id: user.id,
          p_limit: 20,
        });

      if (suggestedFromAlgo && suggestedFromAlgo.length > 0) {
        // ✅ Use smart algorithm results
        suggestedPeople = suggestedFromAlgo.map((p: any) => ({
          ...p,
          skills: p.shared_skills || [],
          company: p.tagline?.split(" at ")[1] || "DSRT Platform",
          role: p.tagline?.split(" at ")[0] || p.tagline || "Builder",
        }));
      }
    } catch (e) {
      console.error("Smart suggestion RPC error:", e);
    }

    // Fallback if algorithm returns nothing
    if (suggestedPeople.length === 0) {
      const { data: fallback } = await supabase
        .from("users")
        .select(
          "id, full_name, username, avatar_url, tagline, brings, location, execution_score, bio",
        )
        .eq("onboarding_complete", true)
        .neq("id", user.id)
        .order("execution_score", { ascending: false, nullsFirst: false })
        .limit(20);

      // Get mutual connections for each suggested user
      let myConnectionIds: string[] = [];
      (connections || []).forEach((c: any) => {
        const otherId =
          c.requester?.id === user.id ? c.recipient?.id : c.requester?.id;
        if (otherId) myConnectionIds.push(otherId);
      });

      if (fallback && fallback.length > 0) {
        const suggestedIds = fallback.map((s: any) => s.id);

        // Get their connections for mutual count
        const { data: theirConnections } = await supabase
          .from("builder_connections")
          .select("requester_id, recipient_id")
          .or(
            `requester_id.in.(${suggestedIds.join(",")}),recipient_id.in.(${suggestedIds.join(",")})`,
          )
          .eq("status", "accepted");

        const mutualCounts: Record<string, Set<string>> = {};
        (theirConnections || []).forEach((tc: any) => {
          if (suggestedIds.includes(tc.requester_id)) {
            if (!mutualCounts[tc.requester_id])
              mutualCounts[tc.requester_id] = new Set();
            if (myConnectionIds.includes(tc.recipient_id)) {
              mutualCounts[tc.requester_id].add(tc.recipient_id);
            }
          }
          if (suggestedIds.includes(tc.recipient_id)) {
            if (!mutualCounts[tc.recipient_id])
              mutualCounts[tc.recipient_id] = new Set();
            if (myConnectionIds.includes(tc.requester_id)) {
              mutualCounts[tc.recipient_id].add(tc.requester_id);
            }
          }
        });

        // Get user skills for tags
        const { data: userSkills } = await supabase
          .from("user_skills")
          .select("user_id, skills:skill_id(name)")
          .in("user_id", suggestedIds);

        const skillsMap: Record<string, string[]> = {};
        (userSkills || []).forEach((us: any) => {
          if (!skillsMap[us.user_id]) skillsMap[us.user_id] = [];
          if (us.skills?.name) skillsMap[us.user_id].push(us.skills.name);
        });

        // Filter out already connected/pending
        const excludeIds = new Set([
          ...myConnectionIds,
          ...(pendingSent || [])
            .map((p: any) => p.recipient?.id)
            .filter(Boolean),
          ...(pendingReceived || [])
            .map((p: any) => p.requester?.id)
            .filter(Boolean),
        ]);

        suggestedPeople = fallback
          .filter((s: any) => !excludeIds.has(s.id))
          .map((s: any) => ({
            ...s,
            mutual_connections: mutualCounts[s.id]?.size || 0,
            shared_communities: 0,
            shared_skills: skillsMap[s.id] || [],
            shared_interests: [],
            match_score: 0,
            match_reasons: ["popular"],
            skills: skillsMap[s.id] || [],
            company: s.tagline?.split(" at ")[1] || "DSRT Platform",
            role: s.tagline?.split(" at ")[0] || s.tagline || "Builder",
          }))
          .slice(0, 10);
      }
    }

    // Communities user is member of
    const { data: memberships } = await supabase
      .from("community_members")
      .select(
        `
        role, joined_at,
        communities:community_id (
          id, name, slug, description, category, icon, icon_color, cover_url,
          member_count, post_count, is_verified, tags, created_by
        )
      `,
      )
      .eq("user_id", user.id)
      .order("joined_at", { ascending: false });

    const joinedCommunities = (memberships || [])
      .map((m: any) => ({
        ...m.communities,
        role: m.role,
        joined_at: m.joined_at,
      }))
      .filter((c: any) => c && c.created_by !== user.id);

    // Communities followed
    const { data: followedComms } = await supabase
      .from("follows")
      .select(
        `
        following_id, created_at,
        communities:following_id (
          id, name, slug, description, category, icon, icon_color, cover_url,
          member_count, post_count, is_verified, tags
        )
      `,
      )
      .eq("follower_id", user.id)
      .eq("following_type", "community");

    const followedCommunities = (followedComms || [])
      .map((f: any) => ({
        ...f.communities,
        followed_at: f.created_at,
        role: "following",
      }))
      .filter(Boolean);

    const allCommunities = [
      ...joinedCommunities,
      ...followedCommunities.filter(
        (fc) => !joinedCommunities.some((jc) => jc.id === fc.id),
      ),
    ];

    // Recent activity
    const activityItems: any[] = [];
    (following || []).slice(0, 3).forEach((f: any) => {
      activityItems.push({
        type: "started_following",
        user_name: f.users?.full_name,
        user_avatar: f.users?.avatar_url,
        created_at: f.created_at,
      });
    });
    (memberships || []).slice(0, 3).forEach((m: any) => {
      activityItems.push({
        type: "joined_community",
        community_name: m.communities?.name,
        community_id: m.communities?.id,
        created_at: m.joined_at,
      });
    });

    const sortedActivity = activityItems
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 5);

    const followingPeople = (following || [])
      .map((f: any) => f.users)
      .filter(Boolean);
    const followerPeople = (followers || [])
      .map((f: any) => f.users)
      .filter(Boolean);
    const connectedPeople = (connections || [])
      .map((c: any) => {
        return c.requester?.id === user.id ? c.recipient : c.requester;
      })
      .filter(Boolean);

    return NextResponse.json({
      following: followingPeople,
      followers: followerPeople,
      connections: connectedPeople,
      pending_sent: pendingSent || [],
      pending_received: pendingReceived || [],
      suggested: suggestedPeople,
      communities: allCommunities,
      recent_activity: sortedActivity,
      people_you_may_know: suggestedPeople.slice(0, 5),
      counts: {
        following: followingPeople.length,
        followers: followerPeople.length,
        connections: connectedPeople.length,
        pending: (pendingSent?.length || 0) + (pendingReceived?.length || 0),
        communities: allCommunities.length,
        total:
          followingPeople.length +
          followerPeople.length +
          connectedPeople.length,
      },
    });
  } catch (e: any) {
    console.error("Network API error:", e);
    return NextResponse.json({
      error: e.message,
      following: [],
      followers: [],
      connections: [],
      pending_sent: [],
      pending_received: [],
      suggested: [],
      communities: [],
      recent_activity: [],
      people_you_may_know: [],
      counts: {
        following: 0,
        followers: 0,
        connections: 0,
        pending: 0,
        communities: 0,
        total: 0,
      },
    });
  }
}
