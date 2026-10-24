"use client";

import Link from "next/link";
import { ShieldCheck, Users, MapPin, ArrowUpRight, Clock } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Community {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  logo_url?: string | null;
  cover_url: string | null;
  banner_url?: string | null;
  category: string | null;
  member_count: number;
  is_verified: boolean;
  location_text: string | null;
}

interface Props {
  community: Community;
  roleKeys?: string[];
  joinedAt?: string;
  leftAt?: string;
  pastStatus?: string;
  followedAt?: string;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MODERATOR: "Moderator",
  MEMBER: "Member",
};

function safeFormatDistance(dateStr?: string | null): string {
  if (!dateStr) return "recently";
  try {
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) return "recently";
    return formatDistanceToNow(parsed, { addSuffix: true });
  } catch {
    return "recently";
  }
}

export function CommunityBucketRow({
  community,
  roleKeys,
  joinedAt,
  leftAt,
  pastStatus,
  followedAt,
  actions,
  meta,
}: Props) {
  const topRole = roleKeys?.find((k) => k !== "MEMBER") || roleKeys?.[0];

  // Priority: logo_url -> cover_url -> banner_url -> fallback
  const thumbImage =
    community.logo_url || community.cover_url || community.banner_url || null;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-white/[0.01] hover:border-white/[0.12] transition-colors">
      <div className="flex items-center gap-4 p-4">
        {/* Thumbnail Box: Prioritizes logo_url */}
        <Link
          href={`/community/${community.slug}`}
          className="flex-shrink-0 w-14 h-14 rounded-xl border border-white/[0.08] bg-gradient-to-br from-[#1e3a5f]/40 to-[#0a0a0f] overflow-hidden relative group flex items-center justify-center shadow-md"
        >
          {thumbImage ? (
            <img
              src={thumbImage}
              alt=""
              className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[14px] font-bold text-white/70 tracking-wider">
              {(community.name || "?").slice(0, 2).toUpperCase()}
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/community/${community.slug}`}
              className="text-[14px] font-semibold text-white truncate hover:underline"
            >
              {community.name}
            </Link>
            {community.is_verified && (
              <ShieldCheck
                className="w-3.5 h-3.5 text-[#93c5fd] flex-shrink-0"
                strokeWidth={1.75}
              />
            )}
            {topRole && (
              <span className="ml-1 text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-white/[0.08] text-white/70 leading-none">
                {ROLE_LABELS[topRole] ?? topRole}
              </span>
            )}
            {pastStatus && (
              <span className="ml-1 text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-white/[0.04] text-white/50 leading-none">
                {pastStatus}
              </span>
            )}
          </div>

          {community.short_description && (
            <p className="mt-1 text-[12.5px] text-white/55 line-clamp-1 leading-relaxed">
              {community.short_description}
            </p>
          )}

          <div className="mt-2 flex items-center gap-3 text-[11px] text-white/45">
            <span className="inline-flex items-center gap-1">
              <Users className="w-3 h-3" strokeWidth={1.75} />
              {formatNumber(community.member_count)}
            </span>
            {community.location_text && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" strokeWidth={1.75} />
                <span className="truncate max-w-[140px]">
                  {community.location_text}
                </span>
              </span>
            )}
            {(joinedAt || followedAt || leftAt) && (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" strokeWidth={1.75} />
                <span className="truncate">
                  {joinedAt && `Joined ${safeFormatDistance(joinedAt)}`}
                  {followedAt &&
                    `Following since ${safeFormatDistance(followedAt)}`}
                  {leftAt && `Left ${safeFormatDistance(leftAt)}`}
                </span>
              </span>
            )}
            {meta}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
          <Link
            href={`/community/${community.slug}`}
            className={cn(
              "w-9 h-9 rounded-lg border border-white/[0.06] bg-white/[0.02] flex items-center justify-center",
              "text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors",
            )}
            aria-label="Open community"
          >
            <ArrowUpRight className="w-4 h-4" strokeWidth={1.75} />
          </Link>
        </div>
      </div>
    </div>
  );
}
