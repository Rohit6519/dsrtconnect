import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: members, error } = await supabase
    .from("community_members")
    .select(
      `
      id, role, joined_at, user_id,
      users:user_id (id, full_name, username, avatar_url, tagline)
    `,
    )
    .eq("community_id", params.id)
    .order("joined_at", { ascending: false });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    members: (members || []).map((m: any) => ({
      id: m.id,
      role: m.role,
      joined_at: m.joined_at,
      user: m.users,
    })),
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("member_id");

  if (!memberId) {
    return NextResponse.json({ error: "Missing member_id" }, { status: 400 });
  }

  const { data: community } = await supabase
    .from("communities")
    .select("created_by")
    .eq("id", params.id)
    .single();

  const isCreator = community?.created_by === user.id;

  if (!isCreator) {
    const { data: myRole } = await supabase
      .from("community_members")
      .select("role")
      .eq("community_id", params.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!myRole || !["owner", "admin"].includes(myRole.role)) {
      return NextResponse.json({ error: "No permission" }, { status: 403 });
    }
  }

  const { data: memberToRemove } = await supabase
    .from("community_members")
    .select("user_id, role")
    .eq("id", memberId)
    .single();

  if (memberToRemove?.user_id === community?.created_by) {
    return NextResponse.json(
      {
        error: "Cannot remove community creator",
      },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("community_members")
    .delete()
    .eq("id", memberId);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { member_id, role } = body;

  if (!member_id || !role) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!["owner", "admin", "moderator", "member"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const { data: community } = await supabase
    .from("communities")
    .select("created_by")
    .eq("id", params.id)
    .single();

  if (community?.created_by !== user.id) {
    return NextResponse.json(
      {
        error: "Only creator can change roles",
      },
      { status: 403 },
    );
  }

  const { error } = await supabase
    .from("community_members")
    .update({ role })
    .eq("id", member_id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
