import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  encryptMessage,
  decryptMessage,
  decryptMessages,
} from "@/lib/encryption/messages";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { slug: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Unauthorized", messages: [] },
      { status: 401 },
    );

  const { data: community } = await supabase
    .from("communities")
    .select("id, created_by")
    .eq("slug", params.slug)
    .single();

  if (!community) {
    return NextResponse.json(
      { error: "Community not found", messages: [] },
      { status: 404 },
    );
  }

  const isCreator = community.created_by === user.id;
  let isMember = isCreator;

  if (!isCreator) {
    const { data: membership } = await supabase
      .from("community_members")
      .select("id")
      .eq("community_id", community.id)
      .eq("user_id", user.id)
      .maybeSingle();
    isMember = !!membership;
  }

  if (!isMember) {
    return NextResponse.json(
      {
        error: "Members only",
        requires_join: true,
        messages: [],
      },
      { status: 403 },
    );
  }

  // Get user's admin role
  const { data: userData } = await supabase
    .from("users")
    .select("admin_role")
    .eq("id", user.id)
    .single();

  const isPlatformAdmin = userData?.admin_role === "dsrt_super_admin";

  // Get all messages
  const { data: messages } = await supabase
    .from("community_chat_messages")
    .select(
      `
      *,
      users:user_id (id, full_name, username, avatar_url, tagline)
    `,
    )
    .eq("community_id", community.id)
    .order("created_at", { ascending: true })
    .limit(100);

  // Filter: exclude messages deleted-for-me
  const filteredMessages = (messages || []).filter((msg: any) => {
    const deletedFor = msg.deleted_for_users || [];
    return !deletedFor.includes(user.id);
  });

  // Decrypt content (only if not deleted for everyone)
  const processedMessages = filteredMessages.map((msg: any) => {
    if (msg.deleted_for_everyone) {
      return {
        ...msg,
        content: null,
        media_url: null,
      };
    }
    return {
      ...msg,
      content: msg.content ? decryptMessage(msg.content) : null,
    };
  });

  return NextResponse.json({
    messages: processedMessages,
    is_creator: isCreator,
    is_platform_admin: isPlatformAdmin,
  });
}

// POST message (same as before, encryption preserved)
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
  const { content, media } = body;

  if (!content?.trim() && !media?.url) {
    return NextResponse.json(
      { error: "Message content or media required" },
      { status: 400 },
    );
  }

  const { data: community } = await supabase
    .from("communities")
    .select("id, created_by")
    .eq("slug", params.slug)
    .single();

  if (!community) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  const isCreator = community.created_by === user.id;
  if (!isCreator) {
    const { data: membership } = await supabase
      .from("community_members")
      .select("id")
      .eq("community_id", community.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json(
        {
          error: "Must be member to chat",
          requires_join: true,
        },
        { status: 403 },
      );
    }
  }

  const encryptedContent = content?.trim()
    ? encryptMessage(content.trim())
    : null;

  const insertData: any = {
    community_id: community.id,
    user_id: user.id,
    content: encryptedContent,
  };

  if (media?.url) {
    insertData.media_url = media.url;
    insertData.media_type = media.type;
    insertData.media_size = media.size;
    insertData.media_name = media.name;
    if (media.duration) insertData.media_duration = media.duration;
    if (media.metadata) insertData.media_metadata = media.metadata;
  }

  const { data: message, error } = await supabase
    .from("community_chat_messages")
    .insert(insertData)
    .select(
      `
      *,
      users:user_id (id, full_name, username, avatar_url, tagline)
    `,
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const decryptedMessage = {
    ...message,
    content: message.content ? decryptMessage(message.content) : null,
  };

  return NextResponse.json({ success: true, message: decryptedMessage });
}

// Legacy DELETE - redirects to new delete API
export async function DELETE(
  request: Request,
  { params }: { params: { slug: string } },
) {
  return NextResponse.json(
    { error: "Use POST /chat/delete instead" },
    { status: 410 },
  );
}
