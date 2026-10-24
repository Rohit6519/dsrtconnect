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
  Image as ImageIcon,
  Video as VideoIcon,
  Video,
  Paperclip,
  Smile,
  Loader2,
  File as FileIcon,
  Download,
  Mic,
  Play,
  Pause,
  Check,
  Copy,
  Crown,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface CommunityViewProps {
  community: any;
  members: any[];
  posts: any[];
  events: any[];
  isJoined: boolean;
  currentUser: any;
}

export function CommunityView({
  community,
  members,
  posts: initialPosts,
  events: initialEvents,
  isJoined,
  currentUser,
}: CommunityViewProps) {
  const router = useRouter();
  const supabase = createClient();
  const [tab, setTab] = useState<
    "posts" | "chat" | "members" | "events" | "about"
  >("posts");
  const [joining, setJoining] = useState(false);
  const [posts, setPosts] = useState<any[]>(initialPosts || []);
  const [events, setEvents] = useState<any[]>(initialEvents || []);

  const currentUserId = currentUser?.id;
  const isCreator = community.created_by === currentUserId;

  const loadPosts = useCallback(async () => {
    try {
      const res = await fetch(`/api/community/${community.slug}/posts`);
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (e) {
      console.error(e);
    }
  }, [community.slug]);

  const loadEvents = useCallback(async () => {
    try {
      const res = await fetch(`/api/community/${community.slug}/events`);
      const data = await res.json();
      setEvents(data.events || []);
    } catch (e) {
      console.error(e);
    }
  }, [community.slug]);

  useEffect(() => {
    loadPosts();
    loadEvents();
  }, [loadPosts, loadEvents]);

  useEffect(() => {
    const channel = supabase
      .channel(`community-${community.id}`)
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
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "community_events",
          filter: `community_id=eq.${community.id}`,
        },
        () => loadEvents(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [community.id]);

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
              {!isJoined && !isCreator && (
                <Button onClick={handleJoin} disabled={joining}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  {joining ? "Joining..." : "Join Community"}
                </Button>
              )}
              {isJoined && !isCreator && (
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
              <span className="text-2xl font-bold">{posts.length}</span>
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
      {!isJoined && !isCreator && (
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
          posts={posts}
          currentUser={currentUser}
          currentUserId={currentUserId}
          isMember={isJoined}
          isCreator={isCreator}
          onJoin={handleJoin}
          onReload={loadPosts}
        />
      )}

      {tab === "chat" && (
        <ChatSection
          community={community}
          currentUser={currentUser}
          currentUserId={currentUserId}
          isMember={isJoined}
          isCreator={isCreator}
          onJoin={handleJoin}
        />
      )}

      {tab === "members" && (
        <MembersSection members={members} community={community} />
      )}

      {tab === "events" && (
        <EventsSection
          community={community}
          events={events}
          currentUserId={currentUserId}
          isCreator={isCreator}
          isMember={isJoined}
          onReload={loadEvents}
        />
      )}

      {tab === "about" && <AboutSection community={community} />}
    </div>
  );
}

// ==================== POSTS SECTION ====================

function PostsSection({
  community,
  posts,
  currentUser,
  currentUserId,
  isMember,
  isCreator,
  onJoin,
  onReload,
}: any) {
  return (
    <div className="space-y-3">
      {(isMember || isCreator) && (
        <PostComposer
          community={community}
          currentUser={currentUser}
          isCreator={isCreator}
          onPosted={onReload}
        />
      )}

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-border/40 bg-card/40 p-12 text-center">
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
              onDeleted={onReload}
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
  const [uploading, setUploading] = useState(false);

  const [images, setImages] = useState<any[]>([]);
  const [video, setVideo] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [expanded, setExpanded] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File, type: "image" | "video" | "file") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    const res = await fetch("/api/community/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    if (images.length + selectedFiles.length > 4) {
      toast.error("Maximum 4 images allowed");
      return;
    }

    setUploading(true);
    try {
      const uploaded = await Promise.all(
        selectedFiles.map((file) => uploadFile(file, "image")),
      );
      setImages((prev) => [...prev, ...uploaded]);
      toast.success(`${uploaded.length} image(s) uploaded`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error("Video too large (max 50MB)");
      return;
    }

    setUploading(true);
    try {
      const uploaded = await uploadFile(file, "video");
      setVideo(uploaded);
      toast.success("Video uploaded");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    if (files.length + selectedFiles.length > 5) {
      toast.error("Maximum 5 files allowed");
      return;
    }

    setUploading(true);
    try {
      const uploaded = await Promise.all(
        selectedFiles.map((file) => uploadFile(file, "file")),
      );
      setFiles((prev) => [...prev, ...uploaded]);
      toast.success(`${uploaded.length} file(s) uploaded`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeVideo = () => setVideo(null);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    const hasMedia = images.length > 0 || video || files.length > 0;
    if (!content.trim() && !hasMedia) {
      toast.error("Add content or media");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/community/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          community_id: community.id,
          content: content.trim(),
          image_urls: images.map((i) => i.url),
          video_url: video?.url || null,
          file_urls: files.map((f) => ({
            url: f.url,
            name: f.name,
            size: f.size,
            type: f.type,
          })),
          visibility,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed");
      } else {
        toast.success("Posted!");
        setContent("");
        setImages([]);
        setVideo(null);
        setFiles([]);
        setExpanded(false);
        onPosted?.();
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  const hasContent =
    content.trim() || images.length > 0 || video || files.length > 0;

  return (
    <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-4">
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
            onFocus={() => setExpanded(true)}
            placeholder="What are you building today?"
            rows={expanded ? 3 : 1}
            maxLength={2000}
            className="w-full bg-transparent border-0 focus:outline-none text-sm resize-none"
          />

          {images.length > 0 && (
            <div
              className={cn(
                "mt-3 grid gap-2",
                images.length === 1 && "grid-cols-1",
                images.length === 2 && "grid-cols-2",
                images.length >= 3 && "grid-cols-2",
              )}
            >
              {images.map((img, i) => (
                <div
                  key={i}
                  className="relative group rounded-lg overflow-hidden bg-muted"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt=""
                    className="w-full h-48 object-cover"
                  />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {video && (
            <div className="mt-3 relative group rounded-lg overflow-hidden bg-black">
              <video src={video.url} controls className="w-full max-h-96" />
              <button
                onClick={removeVideo}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2 bg-muted/40 rounded-lg group"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    onClick={() => removeFile(i)}
                    className="w-6 h-6 rounded-full hover:bg-red-500/10 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {(expanded || hasContent) && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t flex-wrap gap-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploading || images.length >= 4}
                  className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center text-blue-500 disabled:opacity-30 transition-colors"
                  title="Add images (max 4)"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />

                <button
                  onClick={() => videoInputRef.current?.click()}
                  disabled={uploading || !!video}
                  className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center text-purple-500 disabled:opacity-30 transition-colors"
                  title="Add video (max 50MB)"
                >
                  <VideoIcon className="w-5 h-5" />
                </button>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || files.length >= 5}
                  className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center text-orange-500 disabled:opacity-30 transition-colors"
                  title="Attach files (max 5)"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <button
                  disabled
                  className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center text-yellow-500 disabled:opacity-30"
                  title="Emoji (coming soon)"
                >
                  <Smile className="w-5 h-5" />
                </button>

                <div className="w-px h-6 bg-border mx-1" />

                {isCreator ? (
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as any)}
                    className="text-xs px-2 py-1 bg-muted/30 border rounded-lg"
                  >
                    <option value="public">🌍 Public</option>
                    <option value="members_only">🔒 Members</option>
                  </select>
                ) : (
                  <span className="text-xs text-muted-foreground flex items-center gap-1 px-2">
                    <Globe className="w-3 h-3" /> Public
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">
                  {content.length}/2000
                </span>
                {uploading && (
                  <span className="text-[10px] text-blue-500 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Uploading...
                  </span>
                )}
                <Button
                  size="sm"
                  onClick={handlePost}
                  disabled={!hasContent || sending || uploading}
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
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const authorId = post.author_id || post.user_id;
  const canDelete = authorId === currentUserId || isCreator;
  const isPrivate = post.visibility === "members_only";

  const images =
    post.image_urls?.length > 0
      ? post.image_urls
      : post.image_url
        ? [post.image_url]
        : [];

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
    <>
      <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-4 relative">
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

        {post.content && (
          <div className="mt-3 whitespace-pre-wrap text-sm">{post.content}</div>
        )}

        {images.length > 0 && (
          <div
            className={cn(
              "mt-3 grid gap-2 rounded-lg overflow-hidden",
              images.length === 1 && "grid-cols-1",
              images.length === 2 && "grid-cols-2",
              images.length === 3 && "grid-cols-3",
              images.length === 4 && "grid-cols-2",
            )}
          >
            {images.slice(0, 4).map((url: string, i: number) => (
              <button
                key={i}
                onClick={() => setLightboxImage(url)}
                className="relative overflow-hidden hover:opacity-90 transition-opacity"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  className={cn(
                    "w-full object-cover",
                    images.length === 1 ? "max-h-96" : "h-48",
                  )}
                />
              </button>
            ))}
          </div>
        )}

        {post.video_url && (
          <div className="mt-3 rounded-lg overflow-hidden bg-black">
            <video src={post.video_url} controls className="w-full max-h-96" />
          </div>
        )}

        {post.file_urls?.length > 0 && (
          <div className="mt-3 space-y-2">
            {post.file_urls.map((file: any, i: number) => (
              <a
                key={i}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg hover:bg-muted/60 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileIcon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Download className="w-4 h-4 text-muted-foreground" />
              </a>
            ))}
          </div>
        )}
      </div>

      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxImage}
            alt=""
            className="max-w-full max-h-full object-contain"
          />
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </>
  );
}

// ==================== CHAT SECTION (with WhatsApp-style Delete) ====================

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
  const [uploading, setUploading] = useState(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [deleteModalMessage, setDeleteModalMessage] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [preview, setPreview] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const decryptViaApi = useCallback(
    async (encryptedContent: string) => {
      if (!encryptedContent) return "";
      try {
        const res = await fetch("/api/community/decrypt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: encryptedContent,
            community_id: community.id,
          }),
        });
        const data = await res.json();
        return data.decrypted || encryptedContent;
      } catch (e) {
        return "🔒 [Encrypted]";
      }
    },
    [community.id],
  );

  const loadMessages = useCallback(async () => {
    if (!isMember && !isCreator) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/community/${community.slug}/chat`);
      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages || []);
        setIsPlatformAdmin(data.is_platform_admin || false);
      }
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
          const newMsg = payload.new as any;

          const { data: userData } = await supabase
            .from("community_chat_messages")
            .select(
              "*, users:user_id(id, full_name, username, avatar_url, tagline)",
            )
            .eq("id", newMsg.id)
            .single();

          if (userData) {
            const decryptedContent = userData.content
              ? await decryptViaApi(userData.content)
              : "";

            setMessages((prev) => {
              if (prev.find((m) => m.id === userData.id)) return prev;
              return [
                ...prev,
                {
                  ...userData,
                  content: decryptedContent,
                },
              ];
            });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "community_chat_messages",
          filter: `community_id=eq.${community.id}`,
        },
        async (payload) => {
          const updated = payload.new as any;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === updated.id
                ? {
                    ...m,
                    deleted_for_everyone: updated.deleted_for_everyone,
                    deleted_by_role: updated.deleted_by_role,
                    content: updated.deleted_for_everyone ? null : m.content,
                    media_url: updated.deleted_for_everyone
                      ? null
                      : m.media_url,
                  }
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

  const handleFileSelect = async (
    file: File,
    type: "image" | "video" | "file",
  ) => {
    if (!file) return;

    const limits = { image: 10, video: 50, file: 20 };
    const maxMB = limits[type];
    if (file.size > maxMB * 1024 * 1024) {
      toast.error(`File too large (max ${maxMB}MB)`);
      return;
    }

    setPreview({
      file,
      type,
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      mime: file.type,
    });
  };

  const uploadAndSend = async (mediaData: any) => {
    setUploading(true);

    const formData = new FormData();
    formData.append("file", mediaData.file);
    formData.append("community_id", community.id);
    if (mediaData.duration) {
      formData.append("duration", mediaData.duration.toString());
    }

    try {
      const uploadRes = await fetch("/api/community/chat/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        toast.error(uploadData.error || "Upload failed");
        setUploading(false);
        return null;
      }

      return {
        url: uploadData.url,
        type: uploadData.type,
        size: uploadData.size,
        name: uploadData.name,
        duration: uploadData.duration,
      };
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSendWithMedia = async () => {
    if (!preview) return;

    setSending(true);
    try {
      const media = await uploadAndSend(preview);
      if (!media) {
        setSending(false);
        return;
      }

      const res = await fetch(`/api/community/${community.slug}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim() || null,
          media,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error);
      } else {
        setContent("");
        setPreview(null);
      }
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    if (preview) {
      return handleSendWithMedia();
    }

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

  const handleDelete = async (mode: "for_me" | "for_everyone" | "admin") => {
    if (!deleteModalMessage) return;

    try {
      const res = await fetch(`/api/community/${community.slug}/chat/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message_id: deleteModalMessage.id,
          mode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Delete failed");
        throw new Error(data.error);
      }

      if (mode === "for_me") {
        setMessages((prev) =>
          prev.filter((m) => m.id !== deleteModalMessage.id),
        );
        toast.success("Deleted for you");
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === deleteModalMessage.id
              ? {
                  ...m,
                  deleted_for_everyone: true,
                  deleted_by_role:
                    mode === "admin"
                      ? isPlatformAdmin
                        ? "platform_admin"
                        : "community_creator"
                      : "sender",
                  content: null,
                  media_url: null,
                }
              : m,
          ),
        );
        toast.success(
          mode === "admin"
            ? isPlatformAdmin
              ? "🌟 Removed by platform admin"
              : "👑 Removed by creator"
            : "Deleted for everyone",
        );
      }
    } catch (e) {
      throw e;
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const audioFile = new File(
          [audioBlob],
          `voice-${Date.now()}.${mimeType.includes("webm") ? "webm" : "mp4"}`,
          { type: mimeType },
        );

        setPreview({
          file: audioFile,
          type: "audio",
          url: URL.createObjectURL(audioBlob),
          name: audioFile.name,
          size: audioFile.size,
          mime: mimeType,
          duration: recordingTime,
        });

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (e: any) {
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      const stream = mediaRecorderRef.current.stream;
      stream?.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      setRecordingTime(0);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      audioChunksRef.current = [];
    }
  };

  const cancelPreview = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
    setRecordingTime(0);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isMember && !isCreator) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card/40 p-12 text-center">
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
    <>
      <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm overflow-hidden flex flex-col h-[650px]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border/40 bg-card/60 backdrop-blur flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">{community.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] text-muted-foreground">
                  {messages.length > 0
                    ? `${messages.length} messages`
                    : "Start chatting"}
                </span>
              </div>
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Lock className="w-2.5 h-2.5 text-green-600" />
            <span className="hidden sm:inline">Encrypted</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-muted/10 to-muted/30 dark:from-slate-900/40 dark:to-slate-900/60">
          <div className="px-4 py-6 space-y-2">
            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="flex gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 max-w-[70%]">
                    <div className="h-12 bg-muted/50 rounded-2xl animate-pulse" />
                  </div>
                </div>
              ))
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-4">
                  <MessageCircle className="w-10 h-10 text-primary/40" />
                </div>
                <p className="text-sm font-semibold">No messages yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Be the first to send a message
                </p>
              </div>
            ) : (
              messages.map((msg: any, i: number) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  currentUserId={currentUserId}
                  isCreator={isCreator}
                  isPlatformAdmin={isPlatformAdmin}
                  onDelete={() => setDeleteModalMessage(msg)}
                  previousMessage={i > 0 ? messages[i - 1] : null}
                  nextMessage={i < messages.length - 1 ? messages[i + 1] : null}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Preview Bar */}
        {preview && (
          <div className="border-t border-border/40 bg-muted/30 p-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                {preview.type === "image" && (
                  <img
                    src={preview.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
                {preview.type === "video" && (
                  <VideoIcon className="w-6 h-6 text-purple-500" />
                )}
                {preview.type === "audio" && (
                  <div className="text-center">
                    <span className="text-[8px] block">🎤</span>
                    <span className="text-[9px] font-bold">
                      {formatDuration(preview.duration || 0)}
                    </span>
                  </div>
                )}
                {preview.type === "file" && (
                  <FileIcon className="w-6 h-6 text-orange-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">
                  {preview.type === "audio" ? "Voice message" : preview.name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {(preview.size / 1024).toFixed(1)} KB
                  {preview.duration && ` • ${formatDuration(preview.duration)}`}
                </p>
              </div>
              <button
                onClick={cancelPreview}
                className="w-8 h-8 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Recording Bar */}
        {isRecording && (
          <div className="border-t border-border/40 bg-red-500/10 p-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-red-500">
                  Recording... {formatDuration(recordingTime)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Speak now, tap ✕ to cancel or ➤ to send
                </p>
              </div>
              <button
                onClick={cancelRecording}
                className="w-9 h-9 rounded-full bg-muted hover:bg-red-500/20 text-red-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={stopRecording}
                className="w-9 h-9 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Input Area */}
        {!isRecording && (
          <div className="border-t border-border/40 bg-card/60 backdrop-blur px-3 py-3">
            <div className="flex items-end gap-2">
              <Avatar className="w-8 h-8 flex-shrink-0 mb-1">
                <AvatarImage src={currentUser?.avatar_url} />
                <AvatarFallback className="text-xs bg-primary/10">
                  {currentUser?.full_name?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex items-center gap-0.5 mb-1">
                <button
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploading || !!preview}
                  className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center text-blue-500 disabled:opacity-30 transition-colors"
                  title="Send image"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file, "image");
                    if (imageInputRef.current) imageInputRef.current.value = "";
                  }}
                  className="hidden"
                />

                <button
                  onClick={() => videoInputRef.current?.click()}
                  disabled={uploading || !!preview}
                  className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center text-purple-500 disabled:opacity-30 transition-colors"
                  title="Send video"
                >
                  <VideoIcon className="w-5 h-5" />
                </button>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file, "video");
                    if (videoInputRef.current) videoInputRef.current.value = "";
                  }}
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || !!preview}
                  className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center text-orange-500 disabled:opacity-30 transition-colors"
                  title="Send file"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file, "file");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="hidden"
                />
              </div>

              <div className="flex-1 flex items-end gap-2 bg-muted/50 rounded-3xl px-4 py-2 focus-within:bg-muted/70 transition-colors">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={preview ? "Add a caption..." : "Message..."}
                  rows={1}
                  maxLength={1000}
                  disabled={uploading}
                  className="flex-1 bg-transparent border-0 focus:outline-none text-sm resize-none max-h-32 py-1.5 placeholder:text-muted-foreground/60"
                />
              </div>

              {!content.trim() && !preview ? (
                <Button
                  size="icon"
                  onClick={startRecording}
                  disabled={uploading}
                  className="h-10 w-10 rounded-full flex-shrink-0 bg-primary hover:bg-primary/90"
                  title="Record voice message"
                >
                  <Mic className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={
                    (!content.trim() && !preview) || sending || uploading
                  }
                  className={cn(
                    "h-10 w-10 rounded-full flex-shrink-0 transition-all",
                    content.trim() || preview
                      ? "bg-primary hover:bg-primary/90"
                      : "bg-muted",
                  )}
                >
                  {sending || uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteModalMessage && (
        <DeleteMessageModal
          message={deleteModalMessage}
          currentUserId={currentUserId}
          isPlatformAdmin={isPlatformAdmin}
          isCommunityCreator={isCreator}
          onClose={() => setDeleteModalMessage(null)}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}

// ==================== CHAT MESSAGE (with Delete Menu) ====================

function ChatMessage({
  message,
  currentUserId,
  isCreator,
  isPlatformAdmin,
  onDelete,
  previousMessage,
  nextMessage,
}: any) {
  const isMe = message.user_id === currentUserId;
  const isDeleted = message.deleted_for_everyone;
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const prevSameSender =
    previousMessage && previousMessage.user_id === message.user_id;
  const prevTimeDiff = previousMessage
    ? new Date(message.created_at).getTime() -
      new Date(previousMessage.created_at).getTime()
    : Infinity;
  const isGroupStart = !prevSameSender || prevTimeDiff > 120000;

  const nextSameSender = nextMessage && nextMessage.user_id === message.user_id;
  const nextTimeDiff = nextMessage
    ? new Date(nextMessage.created_at).getTime() -
      new Date(message.created_at).getTime()
    : Infinity;
  const isGroupEnd = !nextSameSender || nextTimeDiff > 120000;

  const showAvatar = !isMe && isGroupEnd;
  const showName = !isMe && isGroupStart;
  const showTime = isGroupEnd;

  const hasMedia = !!message.media_url;
  const hasText = !!message.content;
  const mediaOnly = hasMedia && !hasText;

  const canDelete = !isDeleted && (isMe || isCreator || isPlatformAdmin);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleAudio = () => {
    if (audioRef.current) {
      if (audioPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setAudioPlaying(!audioPlaying);
    }
  };

  const copyText = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      toast.success("Copied to clipboard");
      setShowMenu(false);
    }
  };

  const getDeletedText = () => {
    const type = message.media_type;
    const typeLabel =
      type === "image"
        ? "photo"
        : type === "video"
          ? "video"
          : type === "audio"
            ? "voice message"
            : type === "file"
              ? "file"
              : "message";

    if (message.deleted_by_role === "platform_admin") {
      return `🌟 This ${typeLabel} was removed by admin`;
    }
    if (message.deleted_by_role === "community_creator") {
      return `👑 This ${typeLabel} was removed by creator`;
    }
    return `🚫 This ${typeLabel} was deleted`;
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className={cn(
          "flex gap-2 group",
          isMe ? "flex-row-reverse" : "flex-row",
          isGroupStart ? "mt-3" : "mt-0.5",
        )}
      >
        {!isMe && (
          <div className="w-8 flex-shrink-0">
            {showAvatar ? (
              <Link href={`/profile/${message.users?.username || ""}`}>
                <Avatar className="w-8 h-8 hover:ring-2 hover:ring-primary/40 transition-all cursor-pointer">
                  <AvatarImage src={message.users?.avatar_url} />
                  <AvatarFallback className="text-[10px] bg-primary/10">
                    {message.users?.full_name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
            ) : null}
          </div>
        )}

        <div
          className={cn(
            "flex flex-col max-w-[75%] sm:max-w-[65%]",
            isMe ? "items-end" : "items-start",
          )}
        >
          {showName && (
            <Link
              href={`/profile/${message.users?.username || ""}`}
              className="text-[11px] font-semibold text-primary hover:underline px-3 mb-0.5"
            >
              {message.users?.full_name}
            </Link>
          )}

          <div className="relative group/msg">
            {isDeleted ? (
              <div
                className={cn(
                  "px-4 py-2.5 rounded-2xl text-sm italic border-2 border-dashed",
                  isMe
                    ? "bg-primary/5 border-primary/20 text-primary/70"
                    : "bg-muted/50 border-border text-muted-foreground",
                )}
              >
                <p className="flex items-center gap-2">{getDeletedText()}</p>
              </div>
            ) : (
              <>
                {hasMedia && (
                  <div
                    className={cn(
                      "overflow-hidden shadow-sm",
                      mediaOnly ? "rounded-2xl" : "rounded-t-2xl",
                      message.media_type === "audio" &&
                        (isMe
                          ? "bg-primary text-primary-foreground"
                          : "bg-card border border-border/40"),
                    )}
                  >
                    {message.media_type === "image" && (
                      <button
                        onClick={() => setLightbox(message.media_url)}
                        className="block max-w-xs"
                      >
                        <img
                          src={message.media_url}
                          alt=""
                          className="w-full max-h-80 object-cover"
                        />
                      </button>
                    )}

                    {message.media_type === "video" && (
                      <video
                        src={message.media_url}
                        controls
                        className="max-w-xs max-h-80"
                      />
                    )}

                    {message.media_type === "audio" && (
                      <div className="flex items-center gap-3 px-4 py-3 min-w-[220px]">
                        <button
                          onClick={toggleAudio}
                          className={cn(
                            "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
                            isMe
                              ? "bg-primary-foreground/20 hover:bg-primary-foreground/30"
                              : "bg-primary/10 hover:bg-primary/20 text-primary",
                          )}
                        >
                          {audioPlaying ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4 ml-0.5" />
                          )}
                        </button>
                        <div className="flex-1">
                          <div className="flex items-end gap-0.5 h-6">
                            {[3, 5, 7, 4, 6, 8, 5, 4, 6, 3, 5, 7, 4, 5, 6].map(
                              (h, i) => (
                                <div
                                  key={i}
                                  className={cn(
                                    "w-0.5 rounded-full",
                                    isMe
                                      ? "bg-primary-foreground/60"
                                      : "bg-primary/60",
                                  )}
                                  style={{ height: `${h * 3}px` }}
                                />
                              ),
                            )}
                          </div>
                          <p className="text-[10px] mt-0.5 opacity-70">
                            {formatDuration(message.media_duration || 0)}
                          </p>
                        </div>
                        <audio
                          ref={audioRef}
                          src={message.media_url}
                          onEnded={() => setAudioPlaying(false)}
                        />
                      </div>
                    )}

                    {message.media_type === "file" && (
                      <a
                        href={message.media_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 min-w-[220px] hover:opacity-90 transition-opacity",
                          isMe
                            ? "bg-primary text-primary-foreground"
                            : "bg-card border border-border/40",
                        )}
                      >
                        <div
                          className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                            isMe
                              ? "bg-primary-foreground/20"
                              : "bg-primary/10 text-primary",
                          )}
                        >
                          <FileIcon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {message.media_name || "File"}
                          </p>
                          <p className="text-[10px] opacity-70">
                            {((message.media_size || 0) / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <Download className="w-4 h-4 opacity-70" />
                      </a>
                    )}
                  </div>
                )}

                {hasText && (
                  <div
                    className={cn(
                      "px-3.5 py-2 text-sm break-words shadow-sm",
                      hasMedia
                        ? "rounded-b-2xl"
                        : isGroupStart && isGroupEnd
                          ? isMe
                            ? "rounded-2xl rounded-br-md"
                            : "rounded-2xl rounded-bl-md"
                          : "rounded-2xl",
                      isMe
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border/40",
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words leading-relaxed">
                      {message.content}
                    </p>
                  </div>
                )}
              </>
            )}

            {canDelete && (
              <button
                onClick={() => setShowMenu(!showMenu)}
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-background border border-border shadow-md hover:bg-muted flex items-center justify-center transition-all z-10",
                  showMenu
                    ? "opacity-100"
                    : "opacity-0 group-hover/msg:opacity-100",
                  isMe ? "-left-9" : "-right-9",
                )}
                title="Message options"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            )}

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowMenu(false)}
                />
                <div
                  className={cn(
                    "absolute top-full mt-1 z-40 bg-popover border rounded-lg shadow-xl overflow-hidden min-w-[160px]",
                    isMe ? "right-0" : "left-0",
                  )}
                >
                  {hasText && (
                    <button
                      onClick={copyText}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-muted flex items-center gap-2"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy text
                    </button>
                  )}
                  {hasMedia && (
                    <a
                      href={message.media_url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShowMenu(false)}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-muted flex items-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>
                  )}
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete();
                    }}
                    className="w-full px-3 py-2 text-xs text-left hover:bg-red-500/10 text-red-500 flex items-center gap-2 border-t"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>

          {showTime && (
            <span
              className={cn(
                "text-[10px] text-muted-foreground mt-0.5",
                isMe ? "mr-2" : "ml-2",
              )}
            >
              {format(new Date(message.created_at), "h:mm a")}
            </span>
          )}
        </div>
      </motion.div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt=""
            className="max-w-full max-h-full object-contain"
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </>
  );
}

// ==================== DELETE MESSAGE MODAL ====================

function DeleteMessageModal({
  message,
  currentUserId,
  isPlatformAdmin,
  isCommunityCreator,
  onClose,
  onDelete,
}: any) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const isSender = message.user_id === currentUserId;
  const oneHour = 60 * 60 * 1000;
  const withinHour =
    Date.now() - new Date(message.created_at).getTime() < oneHour;

  useEffect(() => {
    const updateTimer = () => {
      const remaining =
        oneHour - (Date.now() - new Date(message.created_at).getTime());
      setTimeLeft(Math.max(0, remaining));
    };
    updateTimer();
    const interval = setInterval(updateTimer, 30000);
    return () => clearInterval(interval);
  }, [message.created_at, oneHour]);

  const formatTimeLeft = (ms: number) => {
    if (ms <= 0) return "Expired";
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins} min left`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m left`;
  };

  const handleDelete = async (mode: "for_me" | "for_everyone" | "admin") => {
    setDeleting(mode);
    try {
      await onDelete(mode);
      onClose();
    } catch (e) {
      setDeleting(null);
    }
  };

  const getMediaIcon = () => {
    switch (message.media_type) {
      case "image":
        return <ImageIcon className="w-4 h-4" />;
      case "video":
        return <VideoIcon className="w-4 h-4" />;
      case "audio":
        return <Mic className="w-4 h-4" />;
      case "file":
        return <FileIcon className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getMediaLabel = () => {
    switch (message.media_type) {
      case "image":
        return "Photo";
      case "video":
        return "Video";
      case "audio":
        return "Voice message";
      case "file":
        return "File";
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-background border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isPlatformAdmin && !isSender ? (
                <>
                  <ShieldCheck className="w-5 h-5 text-yellow-500" />
                  <h3 className="text-base font-semibold">Platform Admin</h3>
                </>
              ) : isCommunityCreator && !isSender ? (
                <>
                  <Crown className="w-5 h-5 text-yellow-500" />
                  <h3 className="text-base font-semibold">Community Creator</h3>
                </>
              ) : (
                <>
                  <Trash2 className="w-5 h-5 text-red-500" />
                  <h3 className="text-base font-semibold">Delete message?</h3>
                </>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 py-3 bg-muted/30 border-b">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-2">
              Message from {message.users?.full_name || "User"}
            </p>
            <div className="flex items-start gap-2">
              {message.media_type && (
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                  {getMediaIcon()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                {message.media_type && (
                  <p className="text-xs font-medium">{getMediaLabel()}</p>
                )}
                {message.content && (
                  <p className="text-sm line-clamp-2 mt-0.5">
                    {message.content}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(message.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-2">
            {isPlatformAdmin && !isSender && (
              <button
                onClick={() => handleDelete("admin")}
                disabled={!!deleting}
                className="w-full text-left p-4 rounded-xl border-2 border-yellow-500/40 bg-yellow-500/5 hover:bg-yellow-500/10 hover:border-yellow-500 transition-all disabled:opacity-50"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                    {deleting === "admin" ? (
                      <Loader2 className="w-5 h-5 text-yellow-600 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-5 h-5 text-yellow-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">
                      Remove as Platform Admin
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Deletes for all users
                      {message.media_url && " • Removes file from storage"}
                    </p>
                  </div>
                </div>
              </button>
            )}

            {isCommunityCreator && !isPlatformAdmin && !isSender && (
              <button
                onClick={() => handleDelete("admin")}
                disabled={!!deleting}
                className="w-full text-left p-4 rounded-xl border-2 border-yellow-500/40 bg-yellow-500/5 hover:bg-yellow-500/10 hover:border-yellow-500 transition-all disabled:opacity-50"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                    {deleting === "admin" ? (
                      <Loader2 className="w-5 h-5 text-yellow-600 animate-spin" />
                    ) : (
                      <Crown className="w-5 h-5 text-yellow-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">
                      Remove as Community Creator
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Deletes for all members
                      {message.media_url && " • Removes file from storage"}
                    </p>
                  </div>
                </div>
              </button>
            )}

            {isSender && (
              <button
                onClick={() => handleDelete("for_everyone")}
                disabled={!withinHour || !!deleting}
                className={cn(
                  "w-full text-left p-4 rounded-xl border-2 transition-all",
                  withinHour && !deleting
                    ? "border-red-500/40 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500"
                    : "border-border bg-muted/30 opacity-60 cursor-not-allowed",
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                      withinHour ? "bg-red-500/20" : "bg-muted",
                    )}
                  >
                    {deleting === "for_everyone" ? (
                      <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
                    ) : (
                      <Globe
                        className={cn(
                          "w-5 h-5",
                          withinHour ? "text-red-500" : "text-muted-foreground",
                        )}
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          withinHour
                            ? "text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        Delete for everyone
                      </p>
                      <div className="flex items-center gap-1 text-[10px]">
                        <Clock className="w-3 h-3" />
                        <span
                          className={cn(
                            "font-medium",
                            timeLeft > 0 ? "text-orange-500" : "text-red-500",
                          )}
                        >
                          {formatTimeLeft(timeLeft)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {withinHour
                        ? `Removes for all members${message.media_url ? " • Deletes file" : ""}`
                        : "Time limit expired (1 hour)"}
                    </p>
                  </div>
                </div>
              </button>
            )}

            <button
              onClick={() => handleDelete("for_me")}
              disabled={!!deleting}
              className="w-full text-left p-4 rounded-xl border-2 border-border hover:border-primary/40 hover:bg-primary/5 transition-all disabled:opacity-50"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {deleting === "for_me" ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : (
                    <Eye className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Delete for me</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Only you won&apos;t see it. Others still can.
                  </p>
                </div>
              </div>
            </button>

            {message.media_url &&
              (isPlatformAdmin ||
                isCommunityCreator ||
                (isSender && withinHour)) && (
                <div className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-orange-700 dark:text-orange-400">
                    <strong>Warning:</strong> Deleting for everyone will
                    permanently remove the {getMediaLabel()?.toLowerCase()}{" "}
                    file. This cannot be undone.
                  </p>
                </div>
              )}
          </div>

          <div className="px-4 pb-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={!!deleting}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ==================== MEMBERS SECTION ====================

function MembersSection({ members, community }: any) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-6">
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

function EventsSection({
  community,
  events,
  currentUserId,
  isCreator,
  isMember,
  onReload,
}: any) {
  const [showCreate, setShowCreate] = useState(false);

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
      onReload?.();
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

      {events.length === 0 ? (
        <div className="rounded-2xl border border-border/40 bg-card/40 p-12 text-center">
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
          {events.map((event: any) => (
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
            onReload?.();
          }}
        />
      )}
    </div>
  );
}

// ==================== EVENT CARD ====================

function EventCard({ event, isCreator, onDelete }: any) {
  const date = new Date(event.start_time);
  const endDate = event.end_time ? new Date(event.end_time) : null;
  const isPast = endDate ? endDate < new Date() : date < new Date();
  const isLive = date <= new Date() && endDate && endDate > new Date();
  const coverImg = event.banner_url || event.cover_image;

  const eventTypeColors: Record<string, string> = {
    workshop: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    meetup: "bg-green-500/10 text-green-500 border-green-500/20",
    webinar: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    hackathon: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    ama: "bg-pink-500/10 text-pink-500 border-pink-500/20",
    general: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  };

  const typeColor =
    eventTypeColors[event.event_type] || eventTypeColors.general;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm overflow-hidden group hover:border-primary/40 transition-all"
    >
      {coverImg && (
        <div className="relative h-40 md:h-48 bg-muted overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverImg}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {isLive && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-red-500 text-white rounded-full text-[10px] font-bold uppercase tracking-wide">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              Live Now
            </div>
          )}

          {event.is_featured && !isLive && (
            <div className="absolute top-3 left-3 px-2.5 py-1 bg-yellow-500 text-white rounded-full text-[10px] font-bold uppercase tracking-wide flex items-center gap-1">
              ⭐ Featured
            </div>
          )}
        </div>
      )}

      <div className="p-4 relative">
        {isCreator && (
          <button
            onClick={onDelete}
            className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-background/80 backdrop-blur hover:bg-red-500/10 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="flex items-start gap-4">
          {!coverImg && (
            <div
              className={cn(
                "flex-shrink-0 text-center rounded-xl p-3 w-16 border",
                isPast
                  ? "bg-muted border-border"
                  : "bg-primary/10 border-primary/20",
              )}
            >
              <p
                className={cn(
                  "text-2xl font-bold leading-none",
                  isPast ? "text-muted-foreground" : "text-primary",
                )}
              >
                {date.getDate()}
              </p>
              <p
                className={cn(
                  "text-[10px] uppercase mt-1 font-bold",
                  isPast ? "text-muted-foreground" : "text-primary",
                )}
              >
                {format(date, "MMM")}
              </p>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              {event.event_type && (
                <span
                  className={cn(
                    "text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border",
                    typeColor,
                  )}
                >
                  {event.event_type}
                </span>
              )}
              {isPast && (
                <span className="text-[9px] px-2 py-0.5 bg-muted text-muted-foreground rounded-full font-bold uppercase">
                  Ended
                </span>
              )}
            </div>

            <h3 className="font-bold text-base leading-tight line-clamp-2 pr-8">
              {event.title}
            </h3>

            {event.description && (
              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                {event.description}
              </p>
            )}

            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {format(date, "MMM d, h:mm a")}
                {endDate && ` - ${format(endDate, "h:mm a")}`}
              </span>

              {event.is_online ? (
                <span className="text-xs text-blue-500 flex items-center gap-1.5 font-medium">
                  <Globe className="w-3.5 h-3.5" /> Online
                </span>
              ) : (
                event.location && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[200px]">
                      {event.location}
                    </span>
                  </span>
                )
              )}

              {event.max_attendees && (
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {event.attendee_count || 0}/{event.max_attendees}
                </span>
              )}
            </div>

            {(event.meeting_url || event.registration_url) && !isPast && (
              <div className="flex items-center gap-2 mt-3">
                {event.meeting_url && (
                  <a
                    href={event.meeting_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5"
                  >
                    <Video className="w-3 h-3" /> Join
                  </a>
                )}
                {event.registration_url && (
                  <a
                    href={event.registration_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 border border-border rounded-lg font-medium hover:bg-muted transition-colors"
                  >
                    Register
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ==================== CREATE EVENT MODAL ====================

function CreateEventModal({ community, onClose, onCreated }: any) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState("workshop");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [location, setLocation] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [maxAttendees, setMaxAttendees] = useState("");
  const [registrationUrl, setRegistrationUrl] = useState("");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const eventTypes = [
    { value: "workshop", label: "🛠️ Workshop", desc: "Hands-on session" },
    { value: "meetup", label: "☕ Meetup", desc: "Casual gathering" },
    { value: "webinar", label: "🎥 Webinar", desc: "Online talk" },
    { value: "hackathon", label: "⚡ Hackathon", desc: "Build event" },
    { value: "ama", label: "💬 AMA", desc: "Ask me anything" },
    { value: "general", label: "📅 General", desc: "Other" },
  ];

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image too large (max 10MB)");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPG, PNG, or WebP allowed");
      return;
    }

    setUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please login");
        return;
      }

      const ext = file.name.split(".").pop();
      const fileName = `event-${community.id}-${Date.now()}.${ext}`;
      const filePath = `events/${fileName}`;

      const { error } = await supabase.storage
        .from("covers")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("covers").getPublicUrl(filePath);

      setCoverImage(publicUrl);
      toast.success("Cover image uploaded!");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const validate = (): string | null => {
    if (!title.trim()) return "Title is required";
    if (title.length > 200) return "Title too long (max 200)";
    if (!startTime) return "Start time is required";
    if (new Date(startTime) < new Date())
      return "Start time must be in the future";
    if (endTime && new Date(endTime) <= new Date(startTime))
      return "End time must be after start time";
    if (isOnline && meetingUrl && !meetingUrl.match(/^https?:\/\/.+/))
      return "Meeting URL must start with http:// or https://";
    if (!isOnline && !location.trim())
      return "Location required for offline events";
    if (registrationUrl && !registrationUrl.match(/^https?:\/\/.+/))
      return "Registration URL must be valid";
    if (
      maxAttendees &&
      (parseInt(maxAttendees) < 1 || parseInt(maxAttendees) > 10000)
    )
      return "Max attendees must be between 1-10000";
    return null;
  };

  const handleCreate = async () => {
    const error = validate();
    if (error) {
      toast.error(error);
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
          event_type: eventType,
          start_time: new Date(startTime).toISOString(),
          end_time: endTime ? new Date(endTime).toISOString() : null,
          is_online: isOnline,
          location: !isOnline ? location.trim() : null,
          meeting_url: isOnline ? meetingUrl.trim() || null : null,
          max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
          registration_url: registrationUrl.trim() || null,
          banner_url: coverImage,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create event");
      } else {
        toast.success("🎉 Event created!");
        onCreated();
      }
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setCreating(false);
    }
  };

  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const minDateTime = now.toISOString().slice(0, 16);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-background border rounded-2xl shadow-2xl w-full max-w-2xl my-8 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Create Event</h2>
              <p className="text-xs text-muted-foreground">
                Host something amazing for your community
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">
              Cover Image
            </label>
            {coverImage ? (
              <div className="relative rounded-xl overflow-hidden border border-border group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverImage}
                  alt="Cover"
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-white/90 text-black rounded-lg text-sm font-medium hover:bg-white transition-colors"
                  >
                    Change
                  </button>
                  <button
                    onClick={() => setCoverImage(null)}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/30",
                  uploading && "opacity-50 pointer-events-none",
                )}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-8 h-8 mx-auto text-primary animate-spin mb-2" />
                    <p className="text-sm font-medium">Uploading...</p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <ImageIcon className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-sm font-semibold">
                      {dragActive
                        ? "Drop your image here"
                        : "Click or drag & drop"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      JPG, PNG, or WebP • Max 10MB
                    </p>
                  </>
                )}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="hidden"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">
              Event Type
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {eventTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setEventType(type.value)}
                  className={cn(
                    "p-3 rounded-xl border-2 text-left transition-all",
                    eventType === type.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-border/80 hover:bg-muted/30",
                  )}
                >
                  <div className="text-sm font-semibold">{type.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {type.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">
              Event Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Introduction to Machine Learning"
              maxLength={200}
              className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
              autoFocus
            />
            <p className="text-[10px] text-muted-foreground mt-1 text-right">
              {title.length}/200
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell people what this event is about, what to expect, and who should attend..."
              rows={4}
              maxLength={2000}
              className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 resize-none transition-all"
            />
            <p className="text-[10px] text-muted-foreground mt-1 text-right">
              {description.length}/2000
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={startTime}
                min={minDateTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">
                End Time
              </label>
              <input
                type="datetime-local"
                value={endTime}
                min={startTime || minDateTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">
              Location
            </label>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setIsOnline(true)}
                className={cn(
                  "flex-1 py-2.5 px-4 rounded-xl border-2 text-sm font-semibold flex items-center justify-center gap-2 transition-all",
                  isOnline
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:bg-muted/30",
                )}
              >
                <Globe className="w-4 h-4" /> Online
              </button>
              <button
                onClick={() => setIsOnline(false)}
                className={cn(
                  "flex-1 py-2.5 px-4 rounded-xl border-2 text-sm font-semibold flex items-center justify-center gap-2 transition-all",
                  !isOnline
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:bg-muted/30",
                )}
              >
                <MapPin className="w-4 h-4" /> In Person
              </button>
            </div>
            {isOnline ? (
              <input
                type="url"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="Meeting link (Zoom, Meet, etc.) — optional"
                className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
              />
            ) : (
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Physical address"
                className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">
                Max Attendees
              </label>
              <input
                type="number"
                min="1"
                max="10000"
                value={maxAttendees}
                onChange={(e) => setMaxAttendees(e.target.value)}
                placeholder="Unlimited"
                className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">
                Registration URL
              </label>
              <input
                type="url"
                value={registrationUrl}
                onChange={(e) => setRegistrationUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex items-center gap-3 bg-muted/20 flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={creating || uploading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating || uploading || !title.trim() || !startTime}
            className="flex-1"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4 mr-2" />
                Create Event
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ==================== ABOUT SECTION ====================

function AboutSection({ community }: any) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-6 space-y-4">
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
