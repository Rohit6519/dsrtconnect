import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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
  const { recipient_id } = body;

  if (!recipient_id) {
    return NextResponse.json(
      { error: "recipient_id is required" },
      { status: 400 },
    );
  }

  if (recipient_id === user.id) {
    return NextResponse.json(
      { error: "Cannot message yourself" },
      { status: 400 },
    );
  }

  // ✅ Step 1: Check if a direct conversation already exists between these users
  const { data: existingConvs } = await supabase
    .from("conversation_participants")
    .select("conversation_id, conversations!inner(id, type)")
    .eq("user_id", user.id)
    .is("left_at", null);

  let existingConversationId: string | null = null;

  if (existingConvs && existingConvs.length > 0) {
    // Check each conversation to find one that has both users
    for (const conv of existingConvs) {
      const convType = (conv.conversations as any)?.type;
      if (convType !== "direct" && convType !== "dm") continue;

      const { data: otherParticipant } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conv.conversation_id)
        .eq("user_id", recipient_id)
        .is("left_at", null)
        .maybeSingle();

      if (otherParticipant) {
        existingConversationId = conv.conversation_id;
        break;
      }
    }
  }

  // ✅ Step 2: If found, return existing conversation
  if (existingConversationId) {
    return NextResponse.json({
      success: true,
      conversation_id: existingConversationId,
      existing: true,
    });
  }

  // ✅ Step 3: Create new conversation
  const { data: newConv, error: convError } = await supabase
    .from("conversations")
    .insert({
      type: "direct",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (convError || !newConv) {
    console.error("Conversation create error:", convError);
    return NextResponse.json(
      { error: convError?.message || "Failed to create conversation" },
      { status: 500 },
    );
  }

  // ✅ Step 4: Add BOTH participants
  const { error: partError } = await supabase
    .from("conversation_participants")
    .insert([
      {
        conversation_id: newConv.id,
        user_id: user.id,
        last_read_at: new Date().toISOString(),
      },
      {
        conversation_id: newConv.id,
        user_id: recipient_id,
        last_read_at: new Date().toISOString(),
      },
    ]);

  if (partError) {
    console.error("Participants add error:", partError);
    // Try to cleanup
    await supabase.from("conversations").delete().eq("id", newConv.id);
    return NextResponse.json(
      { error: partError.message || "Failed to add participants" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    conversation_id: newConv.id,
    created: true,
  });
}
