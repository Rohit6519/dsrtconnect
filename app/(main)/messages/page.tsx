import { createClient } from "@/lib/supabase/server";
import { MessagesInbox } from "@/components/messages/MessagesInbox";
import { decryptMessage } from "@/lib/encryption/messages";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get all conversations for user
  const { data: participants } = await supabase
    .from("conversation_participants")
    .select(
      `
      conversation_id,
      last_read_at,
      conversations!inner (
        id, type, name, avatar_url, last_message_at, created_at
      )
    `,
    )
    .eq("user_id", user!.id)
    .is("left_at", null)
    .order("conversations(last_message_at)", { ascending: false });

  // For each conversation, get last message + other participant(s)
  const conversations = await Promise.all(
    (participants || []).map(async (p: any) => {
      const conv = p.conversations;

      // Get last message
      const { data: lastMessage } = await supabase
        .from("messages")
        .select("id, content, sender_id, created_at")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // 🔓 Decrypt last message content for preview
      const decryptedLastMessage = lastMessage
        ? { ...lastMessage, content: decryptMessage(lastMessage.content) }
        : null;

      // Get other participants
      const { data: otherParticipants } = await supabase
        .from("conversation_participants")
        .select("users:user_id (id, full_name, username, avatar_url)")
        .eq("conversation_id", conv.id)
        .neq("user_id", user!.id)
        .is("left_at", null);

      // Count unread
      const { count: unreadCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", conv.id)
        .gt("created_at", p.last_read_at)
        .neq("sender_id", user!.id);

      return {
        ...conv,
        last_message: decryptedLastMessage,
        other_participants: (otherParticipants || [])
          .map((p: any) => p.users)
          .filter(Boolean),
        unread_count: unreadCount || 0,
      };
    }),
  );

  return (
    <MessagesInbox conversations={conversations} currentUserId={user!.id} />
  );
}
