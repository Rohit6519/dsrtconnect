"use client";

import Link from "next/link";
import { Settings, Users } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { MyCommunityItem } from "@/hooks/useMyCommunities";

const ROLE_META: Record<string, { label: string; className: string }> = {
  OWNER: {
    label: "Owner",
    className: "text-[#057642] bg-[#057642]/15 border-[#057642]/25",
  },
  ADMIN: {
    label: "Admin",
    className: "text-[#0a66c2] bg-[#0a66c2]/15 border-[#0a66c2]/25",
  },
  MODERATOR: {
    label: "Moderator",
    className: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  },
  MEMBER: {
    label: "Member",
    className: "text-zinc-400 bg-white/[0.04] border-white/[0.08]",
  },
};

function safeJoinedTime(dateStr?: string | null): string {
  if (!dateStr) return "recently";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "recently";
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return "recently";
  }
}

export function MyCommunityRow({
  item,
  isLast = false,
}: {
  item: MyCommunityItem;
  isLast?: boolean;
}) {
  const c = item.community;
  const role = ROLE_META[item.top_role] ?? ROLE_META.MEMBER;
  const canManage = item.top_role === "OWNER" || item.top_role === "ADMIN";
  const thumb =
    (c as any).logo_url || c.cover_url || (c as any).banner_url || null;

  return (
    <div
      className={cn(
        "group flex items-start sm:items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 hover:bg-white/[0.02] transition-colors",
        !isLast && "border-b border-white/[0.06]",
      )}
    >
      {/* Logo — LinkedIn size ~56px */}
      <Link
        href={`/community/${c.slug}`}
        className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg border border-white/[0.08] bg-zinc-900 overflow-hidden flex items-center justify-center"
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-[13px] font-semibold text-zinc-400">
            {(c.name || "?").slice(0, 2).toUpperCase()}
          </span>
        )}
      </Link>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/community/${c.slug}`}
            className="text-[15px] font-semibold text-white hover:text-[#70b5f9] hover:underline underline-offset-2 transition-colors truncate max-w-full"
          >
            {c.name}
          </Link>
          <span
            className={cn(
              "shrink-0 text-[11px] font-semibold px-1.5 py-0.5 rounded border leading-none",
              role.className,
            )}
          >
            {role.label}
          </span>
        </div>

        {c.short_description && (
          <p className="mt-0.5 text-[13px] text-zinc-400 line-clamp-2 sm:line-clamp-1 leading-snug">
            {c.short_description}
          </p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-zinc-500">
          <span className="inline-flex items-center gap-1">
            <Users className="w-3 h-3" strokeWidth={1.75} />
            {formatNumber(c.member_count)}{" "}
            {c.member_count === 1 ? "member" : "members"}
          </span>
          <span className="text-zinc-700">·</span>
          <span>Joined {safeJoinedTime(item.joined_at)}</span>
          {c.category && (
            <>
              <span className="text-zinc-700 hidden sm:inline">·</span>
              <span className="hidden sm:inline capitalize">{c.category}</span>
            </>
          )}
        </div>
      </div>

      {/* Actions — LinkedIn pill buttons */}
      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 sm:gap-2 shrink-0 pt-0.5">
        {canManage && (
          <Link
            href={`/community/${c.slug}/studio`}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-white/15 text-[12.5px] font-semibold text-white hover:bg-white/[0.06] hover:border-white/25 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" strokeWidth={1.75} />
            Manage
          </Link>
        )}
        <Link
          href={`/community/${c.slug}`}
          className="inline-flex items-center justify-center h-8 px-3.5 rounded-full border border-[#0a66c2] text-[12.5px] font-semibold text-[#70b5f9] hover:bg-[#0a66c2]/15 hover:border-[#70b5f9] transition-colors"
        >
          View
        </Link>
      </div>
    </div>
  );
}
