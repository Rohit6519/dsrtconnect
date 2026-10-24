import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CATEGORY_META: Record<
  string,
  { icon: string; color: string; label: string }
> = {
  technology: { icon: "Cpu", color: "blue", label: "Technology" },
  entrepreneurship: {
    icon: "Rocket",
    color: "orange",
    label: "Entrepreneurship",
  },
  ai: { icon: "Brain", color: "purple", label: "AI / ML" },
  "ai/ml": { icon: "Brain", color: "purple", label: "AI / ML" },
  design: { icon: "PaintBrush", color: "pink", label: "Design" },
  research: { icon: "MagnifyingGlass", color: "green", label: "Research" },
  finance: { icon: "CurrencyDollar", color: "yellow", label: "Finance" },
  health: { icon: "Heartbeat", color: "red", label: "HealthTech" },
  healthtech: { icon: "Heartbeat", color: "red", label: "HealthTech" },
  education: { icon: "GraduationCap", color: "cyan", label: "Education" },
  business: { icon: "Briefcase", color: "gray", label: "Business" },
  general: { icon: "Users", color: "blue", label: "General" },
};

export async function GET() {
  const supabase = createClient();

  // Get REAL category counts from database
  const { data: communities } = await supabase
    .from("communities")
    .select("category, member_count, view_count")
    .eq("is_public", true);

  if (!communities || communities.length === 0) {
    return NextResponse.json({ categories: [] });
  }

  // Aggregate REAL counts per category
  const categoryMap: Record<
    string,
    {
      community_count: number;
      member_count: number;
      view_count: number;
    }
  > = {};

  communities.forEach((c: any) => {
    const cat = (c.category || "general").toLowerCase();
    if (!categoryMap[cat]) {
      categoryMap[cat] = { community_count: 0, member_count: 0, view_count: 0 };
    }
    categoryMap[cat].community_count += 1;
    categoryMap[cat].member_count += c.member_count || 0;
    categoryMap[cat].view_count += c.view_count || 0;
  });

  // Convert to array and add meta info
  const categories = Object.entries(categoryMap)
    .map(([slug, counts]) => {
      const meta = CATEGORY_META[slug] || {
        icon: "Users",
        color: "blue",
        label: slug.charAt(0).toUpperCase() + slug.slice(1),
      };
      return {
        slug,
        label: meta.label,
        icon: meta.icon,
        color: meta.color,
        community_count: counts.community_count,
        member_count: counts.member_count,
        view_count: counts.view_count,
        is_trending: counts.view_count > 10,
      };
    })
    .sort((a, b) => b.community_count - a.community_count);

  return NextResponse.json({ categories });
}
