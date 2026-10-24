import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET events
export async function GET(
  request: Request,
  { params }: { params: { slug: string } },
) {
  const supabase = createClient();

  const { data: community } = await supabase
    .from("communities")
    .select("id")
    .eq("slug", params.slug)
    .single();

  if (!community) {
    return NextResponse.json({ events: [] });
  }

  const { data: events } = await supabase
    .from("community_events")
    .select(
      `
      *,
      users:created_by (id, full_name, username, avatar_url)
    `,
    )
    .eq("community_id", community.id)
    .order("start_time", { ascending: true });

  return NextResponse.json({ events: events || [] });
}

// POST create event (creator/admin only)
export async function POST(
  request: Request,
  { params }: { params: { slug: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    title,
    description,
    event_type,
    start_time,
    end_time,
    is_online,
    location,
    meeting_url,
    max_attendees,
    registration_url,
    banner_url,
  } = body;

  // Validation
  if (!title?.trim() || !start_time) {
    return NextResponse.json(
      { error: "Title and start time are required" },
      { status: 400 },
    );
  }

  if (title.length > 200) {
    return NextResponse.json(
      { error: "Title must be less than 200 characters" },
      { status: 400 },
    );
  }

  const startDate = new Date(start_time);
  if (isNaN(startDate.getTime())) {
    return NextResponse.json({ error: "Invalid start time" }, { status: 400 });
  }

  if (end_time) {
    const endDate = new Date(end_time);
    if (isNaN(endDate.getTime()) || endDate <= startDate) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 },
      );
    }
  }

  const { data: community } = await supabase
    .from("communities")
    .select("id, created_by")
    .eq("slug", params.slug)
    .single();

  if (!community) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  // Permission check: only creator or admins
  if (community.created_by !== user.id) {
    const { data: membership } = await supabase
      .from("community_members")
      .select("role")
      .eq("community_id", community.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Only creator/admin can create events" },
        { status: 403 },
      );
    }
  }

  // Insert event
  const { data: event, error } = await supabase
    .from("community_events")
    .insert({
      community_id: community.id,
      created_by: user.id,
      organizer_id: user.id,
      title: title.trim(),
      description: description?.trim() || null,
      event_type: event_type || "general",
      start_time,
      end_time: end_time || null,
      is_online: is_online ?? true,
      location: location?.trim() || null,
      meeting_url: meeting_url?.trim() || null,
      max_attendees: max_attendees || null,
      registration_url: registration_url?.trim() || null,
      banner_url: banner_url || null,
    })
    .select(
      `
      *,
      users:created_by (id, full_name, username, avatar_url)
    `,
    )
    .single();

  if (error) {
    console.error("Event create error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, event });
}

// DELETE event
export async function DELETE(
  request: Request,
  { params }: { params: { slug: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("event_id");

  if (!eventId) {
    return NextResponse.json({ error: "Event ID required" }, { status: 400 });
  }

  // Permission check
  const { data: event } = await supabase
    .from("community_events")
    .select("created_by, community_id, banner_url")
    .eq("id", eventId)
    .single();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const { data: community } = await supabase
    .from("communities")
    .select("created_by")
    .eq("id", event.community_id)
    .single();

  const isEventCreator = event.created_by === user.id;
  const isCommunityCreator = community?.created_by === user.id;

  if (!isEventCreator && !isCommunityCreator) {
    const { data: membership } = await supabase
      .from("community_members")
      .select("role")
      .eq("community_id", event.community_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Delete banner from storage (best effort)
  if (event.banner_url) {
    try {
      const url = new URL(event.banner_url);
      const path = url.pathname.split("/covers/")[1];
      if (path) {
        await supabase.storage.from("covers").remove([path]);
      }
    } catch (e) {
      console.error("Banner delete failed:", e);
    }
  }

  const { error } = await supabase
    .from("community_events")
    .delete()
    .eq("id", eventId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
