import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ConversationView } from "@/components/messages/ConversationView";
import { decryptMessages } from "@/lib/encryption/messages";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

export default async function ConversationPage({ params }: PageProps) {
  const { id } = params;
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  // Verify user is participant
  const { data: participant } = await supabase
    .from("conversation_participants")
    .select("*")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .is("left_at", null)
    .maybeSingle();

  if (!participant) {
    console.error("User not a participant of conversation:", id);
    notFound();
  }

  // Get conversation
  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .single();

  if (!conversation) {
    console.error("Conversation not found:", id);
    notFound();
  }

  // Get other participants
  const { data: otherParticipants } = await supabase
    .from("conversation_participants")
    .select("users:user_id (id, full_name, username, avatar_url, tagline)")
    .eq("conversation_id", id)
    .neq("user_id", user.id)
    .is("left_at", null);

  // Get messages (encrypted from DB)
  const { data: messages } = await supabase
    .from("messages")
    .select("*, sender:sender_id(id, full_name, username, avatar_url)")
    .eq("conversation_id", id)
    .eq("deleted", false)
    .order("created_at", { ascending: true })
    .limit(100);

  // 🔓 DECRYPT messages before sending to client
  const decryptedMessages = decryptMessages(messages || []);

  // Mark as read
  await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", id)
    .eq("user_id", user.id);

  return (
    <ConversationView
      conversation={conversation}
      otherParticipants={(otherParticipants || [])
        .map((p: any) => p.users)
        .filter(Boolean)}
      initialMessages={decryptedMessages}
      currentUserId={user.id}
    />
  );
}
