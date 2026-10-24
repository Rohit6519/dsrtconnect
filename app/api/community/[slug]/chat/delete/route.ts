import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/community/[slug]/chat/delete
 * Body: { message_id: string, mode: 'for_me' | 'for_everyone' | 'admin' }
 */
export async function POST(
  request: Request,
  { params }: { params: { slug: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { message_id, mode } = body;

  if (!message_id || !mode) {
    return NextResponse.json(
      { error: "message_id and mode required" },
      { status: 400 },
    );
  }

  if (!["for_me", "for_everyone", "admin"].includes(mode)) {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  // Get community
  const { data: community } = await supabase
    .from("communities")
    .select("id, created_by")
    .eq("slug", params.slug)
    .single();

  if (!community) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  // Get message
  const { data: message } = await supabase
    .from("community_chat_messages")
    .select("*")
    .eq("id", message_id)
    .eq("community_id", community.id)
    .maybeSingle();

  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  // Get user's admin role
  const { data: userData } = await supabase
    .from("users")
    .select("admin_role")
    .eq("id", user.id)
    .single();

  const isPlatformAdmin = userData?.admin_role === "dsrt_super_admin";
  const isCommunityCreator = community.created_by === user.id;
  const isSender = message.user_id === user.id;

  // ==================== HANDLE DIFFERENT MODES ====================

  if (mode === "for_me") {
    // ANYONE can delete for themselves
    const currentDeletedFor = message.deleted_for_users || [];
    if (currentDeletedFor.includes(user.id)) {
      return NextResponse.json({ success: true, already_deleted: true });
    }

    const { error } = await supabase
      .from("community_chat_messages")
      .update({
        deleted_for_users: [...currentDeletedFor, user.id],
      })
      .eq("id", message_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, mode: "for_me" });
  }

  if (mode === "for_everyone") {
    // SENDER only, within 1 hour
    if (!isSender) {
      return NextResponse.json(
        { error: "Only sender can delete for everyone" },
        { status: 403 },
      );
    }

    const messageAge = Date.now() - new Date(message.created_at).getTime();
    const oneHour = 60 * 60 * 1000;

    if (messageAge > oneHour) {
      return NextResponse.json(
        { error: "Time limit exceeded (1 hour). Use 'delete for me' instead." },
        { status: 403 },
      );
    }

    // Delete media from storage
    if (message.media_url) {
      try {
        const url = new URL(message.media_url);
        const path = url.pathname.split("/chat-media/")[1];
        if (path) {
          await supabase.storage.from("chat-media").remove([path]);
        }
      } catch (e) {
        console.error("Media delete failed:", e);
      }
    }

    // Mark as deleted for everyone
    const { error } = await supabase
      .from("community_chat_messages")
      .update({
        deleted_for_everyone: true,
        deleted_by: user.id,
        deleted_by_role: "sender",
        deleted_at: new Date().toISOString(),
        media_url: null, // Clear media URL
      })
      .eq("id", message_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, mode: "for_everyone" });
  }

  if (mode === "admin") {
    // PLATFORM ADMIN or COMMUNITY CREATOR
    if (!isPlatformAdmin && !isCommunityCreator) {
      return NextResponse.json(
        { error: "You don't have admin permissions" },
        { status: 403 },
      );
    }

    const role = isPlatformAdmin ? "platform_admin" : "community_creator";

    // Delete media from storage
    if (message.media_url) {
      try {
        const url = new URL(message.media_url);
        const path = url.pathname.split("/chat-media/")[1];
        if (path) {
          await supabase.storage.from("chat-media").remove([path]);
        }
      } catch (e) {
        console.error("Media delete failed:", e);
      }
    }

    // Mark as deleted by admin
    const { error } = await supabase
      .from("community_chat_messages")
      .update({
        deleted_for_everyone: true,
        deleted_by: user.id,
        deleted_by_role: role,
        deleted_at: new Date().toISOString(),
        media_url: null,
      })
      .eq("id", message_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, mode: "admin", role });
  }

  return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
}
