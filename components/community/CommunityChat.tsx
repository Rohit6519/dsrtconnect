"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import {
  PaperPlaneTilt,
  Lock,
  Users,
  Trash,
  DotsThree,
  ChatCircle,
  Crown,
  ShieldCheck,
  X,
} from "@phosphor-icons/react";

interface Props {
  community: any;
  currentUser: any;
  isJoined: boolean;
  onJoin: () => void;
}

export function CommunityChat({
  community,
  currentUser,
  isJoined,
  onJoin,
}: Props) {
  const supabase = createClient();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMessages = useCallback(async () => {
    if (!isJoined) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/community/${community.slug}/chat`);
      const data = await res.json();

      if (res.ok) {
        setMessages(data.messages || []);
        setIsCreator(data.is_creator || false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [community.slug, isJoined]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Real-time subscription
  useEffect(() => {
    if (!isJoined) return;

    const channel = supabase
      .channel(`community-chat-${community.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "community_chat_messages",
          filter: `community_id=eq.${community.id}`,
        },
        async (payload) => {
          // Fetch complete message with user info
          const { data: newMsg } = await supabase
            .from("community_chat_messages")
            .select(
              `
              *,
              users:user_id (id, full_name, username, avatar_url, tagline)
            `,
            )
            .eq("id", (payload.new as any).id)
            .single();

          if (newMsg) {
            setMessages((prev) => {
              if (prev.find((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "community_chat_messages",
          filter: `community_id=eq.${community.id}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.filter((m) => m.id !== (payload.old as any).id),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [community.id, isJoined]);

  const handleSend = async () => {
    if (!content.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/community/${community.slug}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.requires_join) {
          toast.error("Please join the community first");
        } else {
          toast.error(data.error || "Failed to send");
        }
        return;
      }

      setContent("");
      inputRef.current?.focus();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!confirm("Delete this message?")) return;

    try {
      const res = await fetch(
        `/api/community/${community.slug}/chat?message_id=${messageId}`,
        { method: "DELETE" },
      );

      if (res.ok) {
        toast.success("Message deleted");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete");
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ==================== NOT MEMBER VIEW ====================
  if (!isJoined) {
    return (
      <div className="bg-card border rounded-2xl overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChatCircle className="w-4 h-4 text-primary" weight="fill" />
            <p className="text-sm font-bold">Community Chat</p>
          </div>
          <span className="text-[10px] px-2 py-0.5 bg-orange-500/10 text-orange-500 rounded font-bold">
            MEMBERS ONLY
          </span>
        </div>

        <div className="p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-purple-500" weight="fill" />
          </div>
          <h3 className="text-base font-bold mb-2">Join to Chat</h3>
          <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
            Community chat is exclusive to members. Join{" "}
            <span className="font-bold">{community.name}</span> to start
            chatting with other members.
          </p>
          <Button
            onClick={onJoin}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <Users className="w-4 h-4 mr-2" weight="fill" />
            Join Community
          </Button>
        </div>
      </div>
    );
  }

  // ==================== MEMBER VIEW - CHAT ====================
  return (
    <div className="bg-card border rounded-2xl overflow-hidden flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChatCircle className="w-4 h-4 text-primary" weight="fill" />
          <p className="text-sm font-bold">Community Chat</p>
          <span className="text-[10px] text-muted-foreground">
            {messages.length} messages
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[10px] text-muted-foreground">Live</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-12 w-2/3 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <ChatCircle
              className="w-12 h-12 mx-auto text-muted-foreground/30 mb-2"
              weight="duotone"
            />
            <p className="text-sm font-semibold">No messages yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Be the first to say hello! 👋
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {messages.map((msg: any, i: number) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                currentUser={currentUser}
                isCreator={isCreator}
                onDelete={() => handleDelete(msg.id)}
                previousMessage={i > 0 ? messages[i - 1] : null}
              />
            ))}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t p-3">
        <div className="flex gap-2 items-end">
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarImage src={currentUser.avatar_url} />
            <AvatarFallback className="text-xs">
              {currentUser.full_name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <textarea
            ref={inputRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            maxLength={1000}
            className="flex-1 px-3 py-2 bg-muted/30 border rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 max-h-32"
            style={{ minHeight: "40px" }}
          />

          <Button
            size="sm"
            onClick={handleSend}
            disabled={!content.trim() || sending}
            className="flex-shrink-0 h-10"
          >
            <PaperPlaneTilt className="w-4 h-4" weight="fill" />
          </Button>
        </div>

        <div className="flex items-center justify-between mt-2 px-1">
          <p className="text-[10px] text-muted-foreground">
            Press Enter to send, Shift+Enter for new line
          </p>
          <p className="text-[10px] text-muted-foreground">
            {content.length}/1000
          </p>
        </div>
      </div>
    </div>
  );
}

// ==================== MESSAGE BUBBLE ====================

function MessageBubble({
  message,
  currentUser,
  isCreator,
  onDelete,
  previousMessage,
}: any) {
  const [showMenu, setShowMenu] = useState(false);
  const isMe = message.user_id === currentUser.id;
  const canDelete = isMe || isCreator;
  const isMessageCreator = message.users?.id === message.community_created_by;

  // Group consecutive messages from same user
  const showAvatar =
    !previousMessage ||
    previousMessage.user_id !== message.user_id ||
    new Date(message.created_at).getTime() -
      new Date(previousMessage.created_at).getTime() >
      5 * 60 * 1000;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn("flex gap-2 group", isMe ? "flex-row-reverse" : "flex-row")}
    >
      {showAvatar ? (
        <Link
          href={`/profile/${message.users?.username}`}
          className="flex-shrink-0"
        >
          <Avatar className="w-8 h-8">
            <AvatarImage src={message.users?.avatar_url} />
            <AvatarFallback className="text-xs">
              {message.users?.full_name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
      ) : (
        <div className="w-8 flex-shrink-0" />
      )}

      <div className={cn("flex-1 min-w-0", isMe && "flex flex-col items-end")}>
        {showAvatar && (
          <div
            className={cn(
              "flex items-center gap-2 mb-1",
              isMe && "flex-row-reverse",
            )}
          >
            <Link
              href={`/profile/${message.users?.username}`}
              className="text-xs font-bold hover:underline"
            >
              {message.users?.full_name}
            </Link>
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(message.created_at), {
                addSuffix: true,
              })}
            </span>
          </div>
        )}

        <div
          className={cn(
            "group/msg relative max-w-[80%]",
            isMe ? "ml-auto" : "mr-auto",
          )}
        >
          <div
            className={cn(
              "px-3 py-2 rounded-2xl text-sm",
              isMe
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-muted rounded-bl-sm",
            )}
          >
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>

          {/* Delete button */}
          {canDelete && (
            <button
              onClick={onDelete}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center justify-center",
                isMe ? "-left-8" : "-right-8",
              )}
              title="Delete message"
            >
              <Trash className="w-3 h-3" weight="bold" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
