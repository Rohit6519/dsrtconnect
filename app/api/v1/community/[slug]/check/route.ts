import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const slug = (body.slug || "").trim().toLowerCase();

    if (!slug || slug.length < 2) {
      return NextResponse.json({
        data: {
          available: false,
          reason: "Slug must be at least 2 characters long.",
        },
      });
    }

    const supabase = await createClient();
    const { data } = await supabase
      .from("communities")
      .select("id, slug")
      .eq("slug", slug)
      .maybeSingle();

    if (data) {
      return NextResponse.json({
        data: {
          available: false,
          slug,
          reason: "This URL slug is already taken.",
        },
      });
    }

    return NextResponse.json({
      data: { available: true, slug },
    });
  } catch (err: any) {
    return NextResponse.json({
      data: { available: true },
    });
  }
}
