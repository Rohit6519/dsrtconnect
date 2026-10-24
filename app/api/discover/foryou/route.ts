import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ items: [] });

  // Get personalized communities with REAL data
  const { data: communities } = await supabase.rpc(
    "smart_discover_communities",
    {
      p_user_id: user.id,
      p_tab: "foryou",
      p_limit: 20,
      p_offset: 0,
    },
  );

  // Enrich with real project/venture counts
  const enrichedCommunities = await enrichCommunities(
    supabase,
    communities || [],
  );

  return NextResponse.json({
    items: enrichedCommunities.map((c: any) => ({
      type: "community",
      data: c,
    })),
  });
}

// Helper to add real project/venture counts
async function enrichCommunities(supabase: any, communities: any[]) {
  if (communities.length === 0) return [];

  const commIds = communities.map((c: any) => c.id);

  // Get organization mapping
  const { data: orgCommunities } = await supabase
    .from("organization_communities")
    .select("community_id, organization_id")
    .in("community_id", commIds);

  const orgIdsMap: Record<string, string[]> = {};
  (orgCommunities || []).forEach((oc: any) => {
    if (!orgIdsMap[oc.community_id]) orgIdsMap[oc.community_id] = [];
    orgIdsMap[oc.community_id].push(oc.organization_id);
  });

  const allOrgIds = Object.values(orgIdsMap).flat();

  // Get REAL project counts
  const { data: projects } =
    allOrgIds.length > 0
      ? await supabase
          .from("projects")
          .select("id, organization_id")
          .in("organization_id", allOrgIds)
      : { data: [] };

  // Get REAL venture counts
  const { data: ventures } =
    allOrgIds.length > 0
      ? await supabase
          .from("ventures")
          .select("id, organization_id")
          .in("organization_id", allOrgIds)
      : { data: [] };

  // Count per community
  return communities.map((c: any) => {
    const orgIds = orgIdsMap[c.id] || [];
    const projectCount = (projects || []).filter((p: any) =>
      orgIds.includes(p.organization_id),
    ).length;
    const ventureCount = (ventures || []).filter((v: any) =>
      orgIds.includes(v.organization_id),
    ).length;

    return {
      ...c,
      project_count: projectCount,
      venture_count: ventureCount,
    };
  });
}
