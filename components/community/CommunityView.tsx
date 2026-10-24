"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Building2,
  Users,
  FileText,
  UserPlus,
  CheckCircle2,
  MessageCircle,
  Lock,
  Send,
  Trash2,
  MoreVertical,
  Globe,
  Info,
  Calendar,
  Heart,
  Eye,
  Plus,
  Clock,
  MapPin,
  X,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface CommunityViewProps {
  community: any;
  members: any[];
  isMember: boolean;
  currentUserId?: string;
  currentUser?: any;
}

export function CommunityView({
  community,
  members,
  isMember,
  currentUserId,
  currentUser,
}: CommunityViewProps) {
  const router = useRouter();
  const supabase = createClient();
  const [tab, setTab] = useState<
    "posts" | "chat" | "members" | "events" | "about"
  >("posts");
  const [joining, setJoining] = useState(false);

  const isCreator = community.created_by === currentUserId;
  const canManage = isCreator || isMember;

  const handleJoin = async () => {
    if (!currentUserId) {
      router.push("/login");
      return;
    }
    setJoining(true);
    const { error } = await supabase.from("community_members").insert({
      community_id: community.id,
      user_id: currentUserId,
      role: "member",
    });
    setJoining(false);
    if (error) {
      toast.error("Failed to join");
    } else {
      toast.success("Joined community!");
      router.refresh();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm overflow-hidden">
        {community.cover_url && (
          <div className="h-32 md:h-48 bg-muted overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={community.cover_url}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h1 className="text-3xl font-bold tracking-tight">
                    {community.name}
                  </h1>
                  {community.is_verified && (
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  )}
                  {isCreator && (
                    <span className="text-[10px] px-2 py-0.5 bg-yellow-500/10 text-yellow-500 rounded-full font-bold uppercase">
                      Creator
                    </span>
                  )}
                </div>
                {community.description && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {community.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  {community.is_public ? (
                    <span className="text-[10px] px-2 py-0.5 bg-green-500/10 text-green-500 rounded flex items-center gap-1 font-semibold">
                      <Globe className="w-3 h-3" /> Public
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 bg-orange-500/10 text-orange-500 rounded flex items-center gap-1 font-semibold">
                      <Lock className="w-3 h-3" /> Private
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div>
              {!isMember && !isCreator && (
                <Button onClick={handleJoin} disabled={joining}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  {joining ? "Joining..." : "Join Community"}
                </Button>
              )}
              {isMember && !isCreator && (
                <Button variant="outline" disabled>
                  ✓ Member
                </Button>
              )}
              {isCreator && (
                <Link href={`/community/${community.slug}/settings`}>
                  <Button variant="outline">Manage</Button>
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6 pt-3 border-t border-border/40 flex-wrap">
            <div>
              <span className="text-2xl font-bold">
                {community.member_count || 0}
              </span>
              <span className="text-sm text-muted-foreground ml-1.5">
                members
              </span>
            </div>
            <div>
              <span className="text-2xl font-bold">
                {community.post_count || 0}
              </span>
              <span className="text-sm text-muted-foreground ml-1.5">
                posts
              </span>
            </div>
            {community.view_count > 0 && (
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4 text-orange-500" />
                <span className="text-2xl font-bold">
                  {community.view_count}
                </span>
                <span className="text-sm text-muted-foreground ml-1.5">
                  views
                </span>
              </div>
            )}
            {community.like_count > 0 && (
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                <span className="text-2xl font-bold">
                  {community.like_count}
                </span>
                <span className="text-sm text-muted-foreground ml-1.5">
                  likes
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Non-member notice */}
      {!isMember && !isCreator && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 flex items-center gap-3">
          <Lock className="w-5 h-5 text-blue-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold">You&apos;re viewing as a guest</p>
            <p className="text-xs text-muted-foreground">
              Join to see all posts, chat with members, and more
            </p>
          </div>
          <Button size="sm" onClick={handleJoin} disabled={joining}>
            <UserPlus className="w-4 h-4 mr-1" /> Join
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-1.5">
        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { id: "posts", label: "Posts", icon: FileText },
            { id: "chat", label: "Chat", icon: MessageCircle, badge: "Live" },
            {
              id: "members",
              label: `Members (${members.length})`,
              icon: Users,
            },
            { id: "events", label: "Events", icon: Calendar },
            { id: "about", label: "About", icon: Info },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap relative",
                  tab === t.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
                {t.badge && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-green-500 text-white rounded-full font-bold flex items-center gap-0.5">
                    <span className="w-1 h-1 bg-white rounded-full animate-pulse" />
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {tab === "posts" && (
        <PostsSection
          community={community}
          currentUser={currentUser}
          currentUserId={currentUserId}
          isMember={isMember}
          isCreator={isCreator}
          onJoin={handleJoin}
        />
      )}

      {tab === "chat" && (
        <ChatSection
          community={community}
          currentUser={currentUser}
          currentUserId={currentUserId}
          isMember={isMember}
          isCreator={isCreator}
          onJoin={handleJoin}
        />
      )}

      {tab === "members" && (
        <MembersSection
          members={members}
          community={community}
          currentUserId={currentUserId}
        />
      )}

      {tab === "events" && (
        <EventsSection
          community={community}
          currentUserId={currentUserId}
          isCreator={isCreator}
          isMember={isMember}
        />
      )}

      {tab === "about" && <AboutSection community={community} />}
    </div>
  );
}

// ==================== POSTS SECTION ====================

function PostsSection({
  community,
  currentUser,
  currentUserId,
  isMember,
  isCreator,
  onJoin,
}: any) {
  const supabase = createClient();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/community/${community.slug}/posts`);
      const data = await res.json();
      setPosts(data.posts || []);
    } finally {
      setLoading(false);
    }
  }, [community.slug]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    const channel = supabase
      .channel(`posts-${community.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
          filter: `community_id=eq.${community.id}`,
        },
        () => loadPosts(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [community.id]);

  return (
    <div className="space-y-3">
      {(isMember || isCreator) && (
        <PostComposer
          community={community}
          currentUser={currentUser}
          isCreator={isCreator}
          onPosted={loadPosts}
        />
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border rounded-2xl p-4">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-full bg-muted animate-pulse rounded mt-2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border bg-card/40 p-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm font-semibold">No posts yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            {isMember || isCreator
              ? "Be the first to share!"
              : "Join to see all posts"}
          </p>
        </div>
      ) : (
        <>
          {!isMember && !isCreator && (
            <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-3 text-center">
              <p className="text-xs text-orange-500">
                <Lock className="w-3 h-3 inline mr-1" />
                Showing public posts only. Join to see all.
              </p>
            </div>
          )}
          {posts.map((post: any) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              isCreator={isCreator}
              onDeleted={loadPosts}
            />
          ))}
        </>
      )}
    </div>
  );
}

function PostComposer({ community, currentUser, isCreator, onPosted }: any) {
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<"public" | "members_only">(
    "public",
  );
  const [sending, setSending] = useState(false);

  const handlePost = async () => {
    if (!content.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/community/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          community_id: community.id,
          content: content.trim(),
          visibility,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed");
      } else {
        toast.success("Posted!");
        setContent("");
        onPosted?.();
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-card/40 backdrop-blur-sm p-4">
      <div className="flex items-start gap-3">
        <Avatar className="w-10 h-10 flex-shrink-0">
          <AvatarImage src={currentUser?.avatar_url} />
          <AvatarFallback>
            {currentUser?.full_name?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What are you building today?"
            rows={3}
            maxLength={2000}
            className="w-full bg-transparent border-0 focus:outline-none text-sm resize-none"
          />
          {content.length > 0 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              {isCreator ? (
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as any)}
                  className="text-xs px-2 py-1 bg-muted/30 border rounded-lg"
                >
                  <option value="public">🌍 Public - Everyone</option>
                  <option value="members_only">🔒 Members only</option>
                </select>
              ) : (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Globe className="w-3 h-3" /> Public
                </span>
              )}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">
                  {content.length}/2000
                </span>
                <Button
                  size="sm"
                  onClick={handlePost}
                  disabled={!content.trim() || sending}
                >
                  {sending ? "Posting..." : "Post"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PostCard({ post, currentUserId, isCreator, onDeleted }: any) {
  const [showMenu, setShowMenu] = useState(false);
  const canDelete = post.author_id === currentUserId || isCreator;
  const isPrivate = post.visibility === "members_only";

  const handleDelete = async () => {
    if (!confirm("Delete this post?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) toast.error("Failed to delete");
    else {
      toast.success("Deleted");
      onDeleted?.();
    }
  };

  return (
    <div className="rounded-2xl border bg-card/40 backdrop-blur-sm p-4 relative">
      {isPrivate && (
        <div className="absolute top-3 right-12">
          <span className="text-[9px] px-2 py-0.5 bg-orange-500/10 text-orange-500 rounded font-bold uppercase flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" /> Members
          </span>
        </div>
      )}

      <div className="flex items-start gap-3">
        <Link href={`/profile/${post.users?.username}`}>
          <Avatar className="w-10 h-10">
            <AvatarImage src={post.users?.avatar_url} />
            <AvatarFallback>
              {post.users?.full_name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <Link
            href={`/profile/${post.users?.username}`}
            className="text-sm font-bold hover:underline"
          >
            {post.users?.full_name}
          </Link>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(post.created_at), {
              addSuffix: true,
            })}
          </p>
        </div>
        {canDelete && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-muted rounded"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute top-full right-0 mt-1 w-32 bg-popover border rounded-lg shadow-xl z-40">
                  <button
                    onClick={handleDelete}
                    className="w-full px-3 py-2 text-xs text-red-500 hover:bg-red-500/10 flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 whitespace-pre-wrap text-sm">{post.content}</div>
      {post.image_url && (
        <div className="mt-3 rounded-lg overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.image_url} alt="" className="w-full h-auto" />
        </div>
      )}
    </div>
  );
}

// ==================== CHAT SECTION ====================

function ChatSection({
  community,
  currentUser,
  currentUserId,
  isMember,
  isCreator,
  onJoin,
}: any) {
  const supabase = createClient();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    if (!isMember && !isCreator) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/community/${community.slug}/chat`);
      const data = await res.json();
      if (res.ok) setMessages(data.messages || []);
    } finally {
      setLoading(false);
    }
  }, [community.slug, isMember, isCreator]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isMember && !isCreator) return;
    const channel = supabase
      .channel(`chat-${community.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "community_chat_messages",
          filter: `community_id=eq.${community.id}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from("community_chat_messages")
            .select(
              "*, users:user_id(id, full_name, username, avatar_url, tagline)",
            )
            .eq("id", (payload.new as any).id)
            .single();
          if (data) {
            setMessages((prev) =>
              prev.find((m) => m.id === data.id) ? prev : [...prev, data],
            );
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
        (payload) =>
          setMessages((prev) =>
            prev.filter((m) => m.id !== (payload.old as any).id),
          ),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [community.id, isMember, isCreator]);

  const handleSend = async () => {
    if (!content.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/community/${community.slug}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error);
      } else {
        setContent("");
      }
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (msgId: string) => {
    if (!confirm("Delete message?")) return;
    await fetch(`/api/community/${community.slug}/chat?message_id=${msgId}`, {
      method: "DELETE",
    });
  };

  if (!isMember && !isCreator) {
    return (
      <div className="rounded-2xl border bg-card/40 p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-purple-500" />
        </div>
        <h3 className="text-base font-bold mb-2">Members-Only Chat</h3>
        <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
          Join <span className="font-bold">{community.name}</span> to chat with
          members
        </p>
        <Button onClick={onJoin}>
          <UserPlus className="w-4 h-4 mr-2" /> Join to Chat
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card/40 backdrop-blur-sm overflow-hidden flex flex-col h-[600px]">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          <p className="text-sm font-bold">Community Chat</p>
          <span className="text-[10px] text-muted-foreground">
            {messages.length} messages
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[10px] text-muted-foreground">Live</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 h-12 bg-muted/50 rounded-2xl animate-pulse" />
            </div>
          ))
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm font-semibold">No messages yet</p>
            <p className="text-xs text-muted-foreground mt-1">Say hi! 👋</p>
          </div>
        ) : (
          messages.map((msg: any, i: number) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              currentUserId={currentUserId}
              isCreator={isCreator}
              onDelete={() => handleDelete(msg.id)}
              previousMessage={i > 0 ? messages[i - 1] : null}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-3">
        <div className="flex gap-2 items-end">
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarImage src={currentUser?.avatar_url} />
            <AvatarFallback className="text-xs">
              {currentUser?.full_name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message..."
            rows={1}
            maxLength={1000}
            className="flex-1 px-3 py-2 bg-muted/30 border rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 max-h-32"
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!content.trim() || sending}
            className="h-10"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ChatMessage({
  message,
  currentUserId,
  isCreator,
  onDelete,
  previousMessage,
}: any) {
  const isMe = message.user_id === currentUserId;
  const canDelete = isMe || isCreator;
  const showAvatar =
    !previousMessage || previousMessage.user_id !== message.user_id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-2 group", isMe ? "flex-row-reverse" : "flex-row")}
    >
      {showAvatar ? (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={message.users?.avatar_url} />
          <AvatarFallback className="text-xs">
            {message.users?.full_name?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
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
            <span className="text-xs font-bold">
              {message.users?.full_name}
            </span>
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
          {canDelete && (
            <button
              onClick={onDelete}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center justify-center",
                isMe ? "-left-8" : "-right-8",
              )}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ==================== MEMBERS SECTION ====================

function MembersSection({ members, community, currentUserId }: any) {
  return (
    <div className="rounded-2xl border bg-card/40 backdrop-blur-sm p-6">
      {members.length === 0 ? (
        <div className="text-center py-8">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No members yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {members.map((m: any) => (
            <Link
              key={m.id}
              href={`/profile/${m.users?.username}`}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40 transition-colors"
            >
              <Avatar className="w-10 h-10">
                <AvatarImage src={m.users?.avatar_url} />
                <AvatarFallback>
                  {m.users?.full_name?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="font-medium text-sm">{m.users?.full_name}</p>
                  {m.role === "owner" && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-yellow-500/10 text-yellow-500 rounded font-bold uppercase">
                      Owner
                    </span>
                  )}
                </div>
                {m.users?.tagline && (
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {m.users.tagline}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== EVENTS SECTION ====================

function EventsSection({ community, currentUserId, isCreator, isMember }: any) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/community/${community.slug}/events`);
      const data = await res.json();
      setEvents(data.events || []);
    } finally {
      setLoading(false);
    }
  }, [community.slug]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleDelete = async (eventId: string) => {
    if (!confirm("Delete this event?")) return;
    const res = await fetch(
      `/api/community/${community.slug}/events?event_id=${eventId}`,
      {
        method: "DELETE",
      },
    );
    if (res.ok) {
      toast.success("Event deleted");
      loadEvents();
    }
  };

  return (
    <div className="space-y-3">
      {isCreator && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1" /> Create Event
          </Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-card border rounded-2xl p-4 h-32 animate-pulse"
            />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border bg-card/40 p-12 text-center">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm font-semibold">No events yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            {isCreator ? "Create your first event!" : "Check back later"}
          </p>
          {isCreator && (
            <Button
              size="sm"
              onClick={() => setShowCreate(true)}
              className="mt-4"
            >
              <Plus className="w-4 h-4 mr-1" /> Create Event
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              isCreator={isCreator}
              onDelete={() => handleDelete(event.id)}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateEventModal
          community={community}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            loadEvents();
          }}
        />
      )}
    </div>
  );
}

function EventCard({ event, isCreator, onDelete }: any) {
  const date = new Date(event.start_time);
  const isPast = date < new Date();
  const isOnline =
    event.location?.toLowerCase().includes("online") || !event.location;

  return (
    <div className="rounded-2xl border bg-card/40 backdrop-blur-sm p-4 relative">
      {isCreator && (
        <button
          onClick={onDelete}
          className="absolute top-3 right-3 w-7 h-7 rounded-lg hover:bg-red-500/10 text-red-500 flex items-center justify-center"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex-shrink-0 text-center rounded-lg p-3 w-16",
            isPast ? "bg-muted" : "bg-purple-500/10",
          )}
        >
          <p
            className={cn(
              "text-2xl font-bold",
              isPast ? "text-muted-foreground" : "text-purple-500",
            )}
          >
            {date.getDate()}
          </p>
          <p
            className={cn(
              "text-[10px] uppercase",
              isPast ? "text-muted-foreground" : "text-purple-500",
            )}
          >
            {format(date, "MMM")}
          </p>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base">{event.title}</h3>
          {event.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {event.description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(date, "MMM d, h:mm a")}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              {isOnline ? (
                "💻 Online"
              ) : (
                <>
                  <MapPin className="w-3 h-3" /> {event.location}
                </>
              )}
            </span>
            {isPast && (
              <span className="text-[9px] px-2 py-0.5 bg-muted rounded font-bold uppercase">
                Ended
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateEventModal({ community, onClose, onCreated }: any) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [location, setLocation] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || !startTime) {
      toast.error("Title and start time required");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch(`/api/community/${community.slug}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          start_time: new Date(startTime).toISOString(),
          location: location.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
      } else {
        toast.success("Event created!");
        onCreated();
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background border rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Create Event
          </h2>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              className="w-full mt-1.5 px-3 py-2 bg-muted/30 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell people what this event is about"
              rows={3}
              className="w-full mt-1.5 px-3 py-2 bg-muted/30 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Start Time *
            </label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full mt-1.5 px-3 py-2 bg-muted/30 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Online or physical address"
              className="w-full mt-1.5 px-3 py-2 bg-muted/30 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>
        <div className="p-4 border-t flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={creating}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating || !title.trim() || !startTime}
            className="flex-1"
          >
            {creating ? "Creating..." : "Create Event"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ==================== ABOUT SECTION ====================

function AboutSection({ community }: any) {
  return (
    <div className="rounded-2xl border bg-card/40 backdrop-blur-sm p-6 space-y-4">
      <div>
        <h3 className="text-sm font-bold mb-2">About</h3>
        <p className="text-sm text-muted-foreground">
          {community.description || "No description provided."}
        </p>
      </div>

      {community.tags?.length > 0 && (
        <div>
          <h3 className="text-sm font-bold mb-2">Tags</h3>
          <div className="flex flex-wrap gap-1.5">
            {community.tags.map((tag: string) => (
              <span
                key={tag}
                className="text-xs px-2 py-1 bg-muted rounded font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-bold mb-2">Details</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Category</span>
            <span className="font-medium capitalize">
              {community.category || "General"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Privacy</span>
            <span className="font-medium">
              {community.is_public ? "Public" : "Private"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created</span>
            <span className="font-medium">
              {formatDistanceToNow(new Date(community.created_at), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
