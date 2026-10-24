import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { decryptMessage } from "@/lib/encryption/messages";

export const dynamic = "force-dynamic";

/**
 * POST /api/messages/decrypt
 * Body: { content: string, message_id?: string }
 * Decrypts an encrypted message
 */
export async function POST(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { content, message_id } = body;

  if (!content) {
    return NextResponse.json({ decrypted: "" });
  }

  // If message_id provided, verify user has access
  if (message_id) {
    const { data: msg } = await supabase
      .from("messages")
      .select("conversation_id")
      .eq("id", message_id)
      .maybeSingle();

    if (msg) {
      const { data: participant } = await supabase
        .from("conversation_participants")
        .select("id")
        .eq("conversation_id", msg.conversation_id)
        .eq("user_id", user.id)
        .is("left_at", null)
        .maybeSingle();

      if (!participant) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }
  }

  const decrypted = decryptMessage(content);

  return NextResponse.json({ decrypted });
}