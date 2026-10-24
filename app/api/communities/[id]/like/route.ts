import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// POST - Like community
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if already liked
    const { data: existing } = await supabase
      .from("community_likes")
      .select("id")
      .eq("community_id", params.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        liked: true,
        message: "Already liked",
      });
    }

    // Insert like
    const { error } = await supabase.from("community_likes").insert({
      community_id: params.id,
      user_id: user.id,
    });

    if (error) {
      console.error("Like insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get updated count
    const { data: community } = await supabase
      .from("communities")
      .select("like_count")
      .eq("id", params.id)
      .single();

    return NextResponse.json({
      liked: true,
      like_count: community?.like_count || 1,
      message: "Community liked",
    });
  } catch (e: any) {
    console.error("Like API error:", e);
    return NextResponse.json(
      {
        error: e.message || "Server error",
      },
      { status: 500 },
    );
  }
}

// DELETE - Unlike community
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("community_likes")
      .delete()
      .eq("community_id", params.id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: community } = await supabase
      .from("communities")
      .select("like_count")
      .eq("id", params.id)
      .single();

    return NextResponse.json({
      liked: false,
      like_count: community?.like_count || 0,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: e.message || "Server error",
      },
      { status: 500 },
    );
  }
}

// GET - Check if liked
export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ liked: false });
    }

    const { data } = await supabase
      .from("community_likes")
      .select("id")
      .eq("community_id", params.id)
      .eq("user_id", user.id)
      .maybeSingle();

    return NextResponse.json({ liked: !!data });
  } catch (e) {
    return NextResponse.json({ liked: false });
  }
}
