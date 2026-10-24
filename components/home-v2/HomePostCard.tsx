"use client";

import Link from "next/link";
import { useState, useRef, useLayoutEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Heart,
  ChatCircle,
  ArrowsClockwise,
  BookmarkSimple,
  ShareNetwork,
  CheckCircle,
  DotsThree,
  ThumbsUp,
  Lightbulb,
  Confetti,
  HandsClapping,
  Question,
} from "@phosphor-icons/react";
import { ReactionPicker } from "./interactions/ReactionPicker";
import { RepostMenu } from "./interactions/RepostMenu";
import { ShareModal } from "./interactions/ShareModal";
import { QuotePostModal } from "./interactions/QuotePostModal";
import { CommentPanel } from "./interactions/CommentPanel";
import { PostMoreMenu } from "./PostMoreMenu";
import { usePostDwellTracker } from "@/hooks/useTracking";
import { DsrtPanel, DsrtAvatar } from "@/components/dsrt";

function sanitizePostHTML(html: string): string {
  if (!html) return "";
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    return html
      .split("\n")
      .map((line) => (line.trim() ? `<p>${escapeHTML(line)}</p>` : "<br/>"))
      .join("");
  }
  let clean = html
    .replace(/<\?xml[^>]*>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\s+style="[^"]*"/gi, "")
    .replace(/\s+class="[^"]*"/gi, "")
    .replace(/<pre[^>]*>/gi, "<p>")
    .replace(/<\/pre>/gi, "</p>")
    .replace(/<code[^>]*>/gi, "<span>")
    .replace(/<\/code>/gi, "</span>")
    .replace(/<font[^>]*>/gi, "<span>")
    .replace(/<\/font>/gi, "</span>")
    .replace(/<span[^>]*>/gi, "<span>")
    .replace(/\s{2,}/g, " ");
  return clean.trim();
}

function escapeHTML(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface Props {
  post: any;
  currentUser: any;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  update: {
    label: "Update",
    color: "text-[#93c5fd] bg-[#1e3a5f]/40 border-[#2c5282]/40",
  },
  milestone: {
    label: "Milestone",
    color: "text-amber-300 bg-amber-500/10 border-amber-500/20",
  },
  idea: {
    label: "Idea",
    color: "text-purple-300 bg-purple-500/10 border-purple-500/20",
  },
  looking_for: {
    label: "Looking For",
    color: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
  },
  build_log: {
    label: "Build Log",
    color: "text-cyan-300 bg-cyan-500/10 border-cyan-500/20",
  },
  launch: {
    label: "Launch",
    color: "text-orange-300 bg-orange-500/10 border-orange-500/20",
  },
  discussion: {
    label: "Discussion",
    color: "text-indigo-300 bg-indigo-500/10 border-indigo-500/20",
  },
  question: {
    label: "Question",
    color: "text-pink-300 bg-pink-500/10 border-pink-500/20",
  },
  problem: {
    label: "Problem",
    color: "text-red-300 bg-red-500/10 border-red-500/20",
  },
};

const REACTION_ICON: Record<string, any> = {
  like: ThumbsUp,
  love: Heart,
  insightful: Lightbulb,
  celebrate: Confetti,
  support: HandsClapping,
  curious: Question,
};

const REACTION_COLOR: Record<string, string> = {
  like: "text-blue-400",
  love: "text-pink-400",
  insightful: "text-amber-400",
  celebrate: "text-purple-400",
  support: "text-emerald-400",
  curious: "text-cyan-400",
};

const MAX_CONTENT_HEIGHT = 135;

export function HomePostCard({ post, currentUser }: Props) {
  const postRef = usePostDwellTracker(post.id, post.tags || []);
  const contentWrapperRef = useRef<HTMLDivElement>(null);

  const [isHidden, setIsHidden] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useLayoutEffect(() => {
    if (
      contentWrapperRef.current &&
      contentWrapperRef.current.scrollHeight > MAX_CONTENT_HEIGHT
    ) {
      setIsOverflowing(true);
    }
  }, [post.content]);

  const [reactionType, setReactionType] = useState<string | null>(
    post.is_reacted ? "like" : null,
  );
  const [reactionCount, setReactionCount] = useState(
    post.reaction_count ?? post.like_count ?? 0,
  );
  const [commentCount, setCommentCount] = useState(post.comment_count || 0);
  const [repostCount, setRepostCount] = useState(post.repost_count || 0);
  const [bookmarked, setBookmarked] = useState(post.is_bookmarked || false);
  const [reposted, setReposted] = useState(post.is_reposted || false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showRepostMenu, setShowRepostMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  if (isHidden) return null;
  const publisher = post.publisher;
  if (!publisher) return null;

  const publisherHref =
    publisher.type === "venture"
      ? `/ventures/${publisher.slug}`
      : publisher.type === "project"
        ? `/projects/${publisher.slug}`
        : publisher.type === "community"
          ? `/community/${publisher.slug}`
          : `/profile/${publisher.handle}`;

  const typeMeta = TYPE_LABELS[post.type];

  const handleReaction = async (type: string) => {
    setShowReactionPicker(false);
    const wasReacted = !!reactionType;
    if (reactionType === type) {
      setReactionType(null);
      setReactionCount((n: number) => Math.max(0, n - 1));
      try {
        await fetch(`/api/posts/${post.id}/react`, { method: "DELETE" });
      } catch {
        setReactionType(type);
        setReactionCount((n: number) => n + 1);
      }
    } else {
      setReactionType(type);
      if (!wasReacted) setReactionCount((n: number) => n + 1);
      try {
        await fetch(`/api/posts/${post.id}/react`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reaction_type: type }),
        });
      } catch {
        setReactionType(wasReacted ? "like" : null);
        if (!wasReacted) setReactionCount((n: number) => n - 1);
      }
    }
  };

  const handleQuickReaction = async () =>
    reactionType ? handleReaction(reactionType) : handleReaction("like");

  const startHoverTimer = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => setShowReactionPicker(true), 500);
  };
  const clearHoverTimer = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
  };

  const handleBookmark = async () => {
    const was = bookmarked;
    setBookmarked(!was);
    try {
      await fetch(`/api/posts/${post.id}/bookmark`, {
        method: was ? "DELETE" : "POST",
      });
    } catch {
      setBookmarked(was);
    }
  };

  const handleRepost = async () => {
    setShowRepostMenu(false);
    const was = reposted;
    setReposted(!was);
    setRepostCount((n: number) => (was ? n - 1 : n + 1));
    try {
      if (was) {
        await fetch(
          `/api/posts/${post.id}/repost?publisher_type=person&publisher_id=${currentUser.id}`,
          { method: "DELETE" },
        );
      } else {
        await fetch(`/api/posts/${post.id}/repost`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            publisher_type: "person",
            publisher_id: currentUser.id,
          }),
        });
      }
    } catch {
      setReposted(was);
      setRepostCount((n: number) => (was ? n + 1 : n - 1));
    }
  };

  const timeAgo = post.created_at
    ? formatDistanceToNow(new Date(post.created_at), { addSuffix: false })
    : "";
  const ActiveReactionIcon = reactionType ? REACTION_ICON[reactionType] : Heart;
  const activeColorClass = reactionType ? REACTION_COLOR[reactionType] : "";

  return (
    <>
      <DsrtPanel
        ref={postRef as any}
        variant="default"
        padding="md"
        className="group w-full max-w-full overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3 mb-4 min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Link href={publisherHref} className="shrink-0">
              <DsrtAvatar
                src={publisher.avatar_url}
                name={publisher.name}
                size="md"
                className={
                  publisher.type !== "person" ? "rounded-xl" : "rounded-full"
                }
              />
            </Link>
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="flex items-center gap-1.5 min-w-0">
                <Link
                  href={publisherHref}
                  className="text-[14px] sm:text-[15px] font-bold text-white hover:underline truncate tracking-tight min-w-0"
                >
                  {publisher.name}
                </Link>
                {publisher.is_verified && (
                  <CheckCircle
                    size={14}
                    weight="fill"
                    className="text-blue-400 shrink-0"
                  />
                )}
                {publisher.type === "venture" && (
                  <span className="text-[9px] font-bold uppercase tracking-[0.08em] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/50 border border-white/[0.08] shrink-0">
                    Venture
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[12px] text-white/40 mt-0.5 min-w-0">
                <span className="truncate">@{publisher.handle}</span>
                <span className="shrink-0">·</span>
                <span className="shrink-0">{timeAgo}</span>
                {publisher.tagline && (
                  <>
                    <span className="hidden sm:inline shrink-0">·</span>
                    <span className="truncate hidden sm:inline min-w-0">
                      {publisher.tagline}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="relative z-10 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMoreMenu(!showMoreMenu);
              }}
              className="w-8 h-8 rounded-full text-white/40 hover:text-white hover:bg-white/[0.08] flex items-center justify-center transition-colors"
            >
              <DotsThree size={20} weight="bold" />
            </button>
            {showMoreMenu && (
              <PostMoreMenu
                post={post}
                currentUser={currentUser}
                onClose={() => setShowMoreMenu(false)}
                onHide={() => setIsHidden(true)}
              />
            )}
          </div>
        </div>

        {(typeMeta || post.title) && (
          <div className="mb-3 flex flex-col gap-2 min-w-0">
            {typeMeta && (
              <span
                className={cn(
                  "inline-flex w-fit items-center h-[22px] px-2 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                  typeMeta.color,
                )}
              >
                {typeMeta.label}
              </span>
            )}
            {post.title && (
              <h2 className="text-[15px] sm:text-[16px] font-semibold text-white tracking-tight leading-snug break-words [word-break:break-word]">
                {post.title}
              </h2>
            )}
          </div>
        )}

               {post.content && (
          <div
            className={cn(
              'relative mb-3 min-w-0 max-w-full overflow-hidden transition-all',
              isOverflowing && 'cursor-pointer'
            )}
            onClick={(e) => {
              // লিংকে ক্লিক করলে যেন লিংক ওপেন হয়, পোস্ট টগল না হয়
              if ((e.target as HTMLElement).tagName === 'A') return
              if (isOverflowing) {
                setIsExpanded((prev) => !prev)
              }
            }}
          >
            <div
              ref={contentWrapperRef}
              className={cn(
                'min-w-0 max-w-full overflow-hidden font-sans',
                'text-[12.5px] sm:text-[14px] text-white/80 leading-[1.45] sm:leading-[1.55]',
                'break-words [word-break:break-word]',
                'prose prose-invert max-w-none',
                // 🎯 FORCE UNIFORM SANS-SERIF FONT FOR ALL POSTS & COPIED TEXT
                '[&_*]:!font-sans [&_*]:max-w-full [&_*]:break-words',
                'prose-p:text-[12.5px] sm:prose-p:text-[14px] prose-p:leading-[1.45] sm:prose-p:leading-[1.55] prose-p:text-white/80 prose-p:!font-sans',
                'prose-headings:text-[13.5px] sm:prose-headings:text-[15px] prose-headings:font-semibold prose-headings:text-white/90 prose-headings:!font-sans',
                'prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-a:!font-sans',
                'prose-strong:text-white/90 prose-strong:font-semibold prose-strong:!font-sans',
                'prose-code:!font-sans prose-code:text-white/80 prose-code:bg-transparent prose-code:p-0',
                '[&_p]:mb-1.5 sm:[&_p]:mb-2.5 [&_p]:last:mb-0',
                '[&_pre]:overflow-x-auto [&_pre]:max-w-full [&_pre]:whitespace-pre-wrap [&_pre]:text-[12.5px] sm:[&_pre]:text-[14px] [&_pre]:!font-sans [&_pre]:bg-transparent [&_pre]:p-0',
                '[&_code]:break-words [&_code]:whitespace-pre-wrap [&_code]:text-[12.5px] sm:[&_code]:text-[14px] [&_code]:!font-sans',
                '[&_a]:break-all',
                '[&_img]:max-w-full [&_img]:h-auto rounded-lg my-2',
                '[&_table]:block [&_table]:overflow-x-auto [&_table]:max-w-full',
                '[&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0.5 [&_li]:!font-sans',
                !isExpanded && isOverflowing ? 'max-h-[135px] overflow-hidden' : ''
              )}
              dangerouslySetInnerHTML={{ __html: sanitizePostHTML(post.content) }}
            />

            {/* READ MORE VISUAL INDICATOR (Clicking text box toggles automatically) */}
            {!isExpanded && isOverflowing && (
              <div className="absolute bottom-0 left-0 right-0 h-[50px] bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/90 to-transparent flex items-end justify-start pt-4 pointer-events-none">
                <span className="text-[12px] font-bold text-[#38bdf8] pb-0.5 bg-[#0a0a0f]/80 px-1 rounded">
                  Read more
                </span>
              </div>
            )}

            {/* SHOW LESS VISUAL INDICATOR */}
            {isExpanded && isOverflowing && (
              <div className="mt-1.5">
                <span className="text-[11.5px] font-medium text-white/50 hover:text-white/80 transition-colors">
                  Show less
                </span>
              </div>
            )}
          </div>
        )}

        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 min-w-0">
            {post.tags.slice(0, 6).map((tag: string) => (
              <Link
                key={tag}
                href={`/search?q=${encodeURIComponent("#" + tag)}`}
                className="text-[12px] font-medium text-[#93c5fd] hover:text-white hover:underline break-all max-w-full"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}

        {(post.image_urls?.length > 0 || post.media_urls?.length > 0) && (
          <PostMedia
            urls={post.image_urls?.length ? post.image_urls : post.media_urls}
          />
        )}
        {post.video_url && (
          <div className="rounded-xl overflow-hidden border border-white/[0.08] mb-4 bg-black max-w-full">
            <video
              src={post.video_url}
              controls
              className="w-full max-h-[500px]"
            />
          </div>
        )}
        {post.link_url && post.link_title && !post.image_urls?.length && (
          <LinkPreview post={post} />
        )}

        <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center gap-1 sm:gap-2 min-w-0">
          <div
            className="relative"
            onMouseEnter={startHoverTimer}
            onMouseLeave={clearHoverTimer}
          >
            <button
              onClick={handleQuickReaction}
              className={cn(
                "inline-flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-lg text-[13px] font-medium transition-colors",
                reactionType
                  ? `${activeColorClass} bg-white/[0.06]`
                  : "text-white/50 hover:text-white hover:bg-white/[0.08]",
              )}
            >
              <ActiveReactionIcon
                size={18}
                weight={reactionType ? "fill" : "regular"}
              />
              {reactionCount > 0 && (
                <span className="tabular-nums">
                  {reactionCount.toLocaleString()}
                </span>
              )}
            </button>
            {showReactionPicker && (
              <ReactionPicker
                currentReaction={reactionType}
                onSelect={handleReaction}
                onClose={() => setShowReactionPicker(false)}
              />
            )}
          </div>

          <button
            onClick={() => setShowComments(true)}
            className="inline-flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-lg text-[13px] font-medium text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <ChatCircle size={18} weight="regular" />
            {commentCount > 0 && (
              <span className="tabular-nums">
                {commentCount.toLocaleString()}
              </span>
            )}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowRepostMenu(true)}
              className={cn(
                "inline-flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-lg text-[13px] font-medium transition-colors",
                reposted
                  ? "text-emerald-400 bg-emerald-500/10"
                  : "text-white/50 hover:text-white hover:bg-white/[0.08]",
              )}
            >
              <ArrowsClockwise
                size={18}
                weight={reposted ? "bold" : "regular"}
              />
              {repostCount > 0 && (
                <span className="tabular-nums">
                  {repostCount.toLocaleString()}
                </span>
              )}
            </button>
            {showRepostMenu && (
              <RepostMenu
                hasReposted={reposted}
                onRepost={handleRepost}
                onQuote={() => {
                  setShowRepostMenu(false);
                  setShowQuoteModal(true);
                }}
                onClose={() => setShowRepostMenu(false)}
              />
            )}
          </div>

          <div className="ml-auto flex items-center gap-1 shrink-0">
            <button
              onClick={handleBookmark}
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                bookmarked
                  ? "text-amber-400 bg-amber-500/10"
                  : "text-white/50 hover:text-white hover:bg-white/[0.08]",
              )}
              aria-label="Bookmark"
            >
              <BookmarkSimple
                size={18}
                weight={bookmarked ? "fill" : "regular"}
              />
            </button>
            <button
              onClick={() => setShowShareModal(true)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors"
              aria-label="Share"
            >
              <ShareNetwork size={18} weight="regular" />
            </button>
          </div>
        </div>
      </DsrtPanel>

      {showShareModal && (
        <ShareModal post={post} onClose={() => setShowShareModal(false)} />
      )}
      {showQuoteModal && (
        <QuotePostModal
          post={post}
          currentUser={currentUser}
          onClose={() => setShowQuoteModal(false)}
          onSuccess={() => {
            setShowQuoteModal(false);
            setRepostCount((n: number) => n + 1);
          }}
        />
      )}
      {showComments && (
        <CommentPanel
          postId={post.id}
          currentUser={currentUser}
          onClose={() => setShowComments(false)}
          onCommentCountChange={(delta) =>
            setCommentCount((n: number) => Math.max(0, n + delta))
          }
        />
      )}
    </>
  );
}

function PostMedia({ urls }: { urls: string[] }) {
  const displayUrls = urls.slice(0, 4);
  if (displayUrls.length === 1) {
    return (
      <div className="rounded-xl overflow-hidden border border-white/[0.08] mb-4 bg-black max-w-full">
        <img
          src={displayUrls[0]}
          alt=""
          className="w-full max-w-full object-cover max-h-[560px]"
          loading="lazy"
        />
      </div>
    );
  }
  return (
    <div
      className={cn(
        "grid gap-1 rounded-xl overflow-hidden border border-white/[0.08] mb-4 bg-black max-w-full",
        displayUrls.length === 2
          ? "grid-cols-2 max-h-[320px]"
          : displayUrls.length === 3
            ? "grid-cols-2 grid-rows-2 max-h-[420px]"
            : "grid-cols-2 max-h-[420px]",
      )}
    >
      {displayUrls.map((url, i) => (
        <div
          key={i}
          className={cn(
            "overflow-hidden bg-white/[0.04] min-w-0",
            displayUrls.length === 3 && i === 0 && "row-span-2",
          )}
        >
          <img
            src={url}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
}

function LinkPreview({ post }: { post: any }) {
  let hostname = "";
  try {
    hostname = new URL(post.link_url).hostname.replace("www.", "");
  } catch {}
  return (
    <a
      href={post.link_url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl overflow-hidden border border-white/[0.08] hover:border-white/[0.12] transition-colors mb-4 bg-white/[0.02] max-w-full"
    >
      {post.link_image && (
        <div className="aspect-[21/9] overflow-hidden bg-black">
          <img
            src={post.link_image}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <div className="p-4 min-w-0">
        <div className="text-[10px] font-mono uppercase tracking-wider text-white/40 mb-1 truncate">
          {hostname}
        </div>
        <div className="text-[14px] font-medium text-white line-clamp-2 mb-1 leading-tight break-words [word-break:break-word]">
          {post.link_title}
        </div>
        {post.link_description && (
          <p className="text-[12px] text-white/50 line-clamp-2 leading-relaxed break-words [word-break:break-word]">
            {post.link_description}
          </p>
        )}
      </div>
    </a>
  );
}
