import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { encryptMessage, decryptMessage } from "@/lib/encryption/messages";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const conversationId = body.conversation_id || body.conversationId;
  const content = body.content;

  if (!conversationId) {
    return NextResponse.json(
      { error: "conversation_id is required" },
      { status: 400 },
    );
  }

  if (!content || typeof content !== "string" || !content.trim()) {
    return NextResponse.json(
      { error: "Message content is required" },
      { status: 400 },
    );
  }

  if (content.length > 5000) {
    return NextResponse.json(
      { error: "Message too long (max 5000 characters)" },
      { status: 400 },
    );
  }

  // Verify user is a participant
  const { data: participant } = await supabase
    .from("conversation_participants")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .is("left_at", null)
    .maybeSingle();

  if (!participant) {
    return NextResponse.json(
      { error: "You are not a participant of this conversation" },
      { status: 403 },
    );
  }

  // 🔒 ENCRYPT the message before saving
  const encryptedContent = encryptMessage(content.trim());

  // Insert encrypted message
  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: encryptedContent, // 🔒 Encrypted
    })
    .select("*, sender:sender_id(id, full_name, username, avatar_url)")
    .single();

  if (error) {
    console.error("Message send error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send message" },
      { status: 500 },
    );
  }

  // Update conversation's last_message_at
  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  // 🔓 DECRYPT before returning to client
  const decryptedMessage = {
    ...message,
    content: decryptMessage(message.content),
  };

  return NextResponse.json({
    success: true,
    message: decryptedMessage,
  });
}
