import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { encryptMessage, isEncrypted } from "@/lib/encryption/messages";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all messages
  const { data: messages, error } = await supabase
    .from("messages")
    .select("id, content")
    .limit(1000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let encryptedCount = 0;
  let skippedCount = 0;

  for (const msg of messages || []) {
    if (isEncrypted(msg.content)) {
      skippedCount++;
      continue;
    }

    const encrypted = encryptMessage(msg.content);
    await supabase
      .from("messages")
      .update({ content: encrypted })
      .eq("id", msg.id);

    encryptedCount++;
  }

  return NextResponse.json({
    success: true,
    total: messages?.length || 0,
    encrypted: encryptedCount,
    skipped: skippedCount,
  });
}
