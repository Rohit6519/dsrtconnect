import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

  const communityId = params.id;
  const body = await request.json();

  const { data: community } = await supabase
    .from("communities")
    .select("id, created_by")
    .eq("id", communityId)
    .single();

  if (!community) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  const isCreator = community.created_by === user.id;

  if (!isCreator) {
    const { data: membership } = await supabase
      .from("community_members")
      .select("role")
      .eq("community_id", communityId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json({ error: "No permission" }, { status: 403 });
    }
  }

  const allowedFields = [
    "name",
    "description",
    "category",
    "tags",
    "icon",
    "icon_color",
    "cover_url",
    "is_public",
  ];

  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  allowedFields.forEach((field) => {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  });

  const { data: updated, error } = await supabase
    .from("communities")
    .update(updateData)
    .eq("id", communityId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, community: updated });
}
