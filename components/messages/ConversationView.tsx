"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  Loader2,
  MoreVertical,
  Info,
  Trash2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ConversationViewProps {
  conversation: any;
  otherParticipants: any[];
  initialMessages: any[];
  currentUserId: string;
}

export function ConversationView({
  conversation,
  otherParticipants,
  initialMessages,
  currentUserId,
}: ConversationViewProps) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const other = otherParticipants[0];
  const displayName = conversation.name || other?.full_name || "Unknown";
  const avatar = conversation.avatar_url || other?.avatar_url;

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 🔒 Decrypt encrypted message via API
  const decryptViaApi = async (
    encryptedContent: string,
    messageId?: string,
  ) => {
    try {
      const res = await fetch("/api/messages/decrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: encryptedContent,
          message_id: messageId,
        }),
      });
      const data = await res.json();
      return data.decrypted || encryptedContent;
    } catch (e) {
      console.error("Decrypt failed:", e);
      return "🔒 [Encrypted]";
    }
  };

  // Real-time message subscription
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        async (payload) => {
          const newMsg = payload.new as any;
          if (newMsg.sender_id === currentUserId) return;

          // Fetch sender info
          const { data: sender } = await supabase
            .from("users")
            .select("id, full_name, username, avatar_url")
            .eq("id", newMsg.sender_id)
            .single();

          // 🔓 Decrypt the message content
          const decryptedContent = await decryptViaApi(
            newMsg.content,
            newMsg.id,
          );

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [
              ...prev,
              {
                ...newMsg,
                content: decryptedContent,
                sender,
              },
            ];
          });

          // Mark as read
          supabase
            .from("conversation_participants")
            .update({ last_read_at: new Date().toISOString() })
            .eq("conversation_id", conversation.id)
            .eq("user_id", currentUserId);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        async (payload) => {
          const updated = payload.new as any;
          const decryptedContent = await decryptViaApi(
            updated.content,
            updated.id,
          );
          setMessages((prev) =>
            prev.map((m) =>
              m.id === updated.id
                ? { ...m, ...updated, content: decryptedContent }
                : m,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  const send = async () => {
    if (!input.trim() || sending) return;
    setSending(true);

    const content = input.trim();
    setInput("");

    // Optimistic message (shows plain text immediately)
    const tempId = "temp-" + Date.now();
    const tempMessage = {
      id: tempId,
      conversation_id: conversation.id,
      sender_id: currentUserId,
      content,
      created_at: new Date().toISOString(),
      sender: null,
    };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conversation.id, content }),
      });

      if (!res.ok) throw new Error("Failed");
      const data = await res.json();

      // Replace temp with real message (already decrypted from API)
      if (data?.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? data.message : m)),
        );
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(content);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (date: string) => {
    const d = new Date(date);
    if (isToday(d)) return format(d, "h:mm a");
    if (isYesterday(d)) return `Yesterday ${format(d, "h:mm a")}`;
    return format(d, "MMM d, h:mm a");
  };

  // Group messages
  const groupedMessages: any[] = [];
  messages.forEach((msg, idx) => {
    const prev = messages[idx - 1];
    const isSameSender = prev?.sender_id === msg.sender_id;
    const timeDiff = prev
      ? new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime()
      : Infinity;
    const shouldGroup = isSameSender && timeDiff < 60000;

    if (shouldGroup && groupedMessages.length > 0) {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    } else {
      groupedMessages.push({
        sender_id: msg.sender_id,
        sender: msg.sender,
        messages: [msg],
        first_time: msg.created_at,
      });
    }
  });

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header with Encryption Badge */}
      <div className="border-b bg-background/95 backdrop-blur px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/messages" className="md:hidden">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Link href={other ? `/profile/${other.username}` : "#"}>
            <Avatar className="w-9 h-9">
              <AvatarImage src={avatar} />
              <AvatarFallback>{displayName?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{displayName}</p>
            {other?.tagline && (
              <p className="text-xs text-muted-foreground truncate">
                {other.tagline}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {other && (
                <DropdownMenuItem asChild>
                  <Link href={`/profile/${other.username}`}>
                    <Info className="w-3.5 h-3.5 mr-2" />
                    View Profile
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* 🔒 Encryption Trust Badge */}
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <ShieldCheck className="w-3 h-3 text-green-600" />
          <span>
            Messages are secured with{" "}
            <span className="font-semibold text-green-600">
              AES-256 encryption
            </span>
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
            <Avatar className="w-16 h-16">
              <AvatarImage src={avatar} />
              <AvatarFallback className="text-xl">
                {displayName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{displayName}</p>
              <p className="text-xs text-muted-foreground">
                This is the beginning of your conversation
              </p>
              {/* 🔒 Extra encryption notice for empty chat */}
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-full">
                <Lock className="w-3 h-3 text-green-600" />
                <span className="text-[11px] font-medium text-green-700 dark:text-green-400">
                  Your messages are encrypted
                </span>
              </div>
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {groupedMessages.map((group, idx) => {
              const isMe = group.sender_id === currentUserId;
              return (
                <motion.div
                  key={group.first_time + idx}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn("flex gap-2", isMe && "flex-row-reverse")}
                >
                  {!isMe && (
                    <Avatar className="w-7 h-7 mt-auto flex-shrink-0">
                      <AvatarImage src={group.sender?.avatar_url} />
                      <AvatarFallback className="text-[10px]">
                        {group.sender?.full_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "flex flex-col gap-1 max-w-[70%]",
                      isMe && "items-end",
                    )}
                  >
                    {group.messages.map((msg: any, i: number) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "px-3 py-2 rounded-2xl text-sm break-words",
                          isMe
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted rounded-bl-sm",
                          i === 0 && !isMe && "rounded-tl-2xl",
                          i === 0 && isMe && "rounded-tr-2xl",
                        )}
                      >
                        {msg.content}
                      </div>
                    ))}
                    <p className="text-[10px] text-muted-foreground px-1 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      {formatMessageTime(
                        group.messages[group.messages.length - 1].created_at,
                      )}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Type an encrypted message..."
            disabled={sending}
            className="flex-1 h-10 px-4 bg-muted/40 border rounded-full text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <Button
            onClick={send}
            disabled={sending || !input.trim()}
            className="rounded-full w-10 h-10 p-0"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        {/* 🔒 Small hint below input */}
        <p className="text-[10px] text-muted-foreground text-center mt-2 flex items-center justify-center gap-1">
          <ShieldCheck className="w-2.5 h-2.5 text-green-600" />
          End-to-server encrypted with AES-256
        </p>
      </div>
    </div>
  );
}
