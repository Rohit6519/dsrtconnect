"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Users, MapPin, ShieldCheck } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { JoinPill } from "./JoinPill";
import { FollowPill } from "./FollowPill";
import { CommunityCardMenu } from "./CommunityCardMenu";
import { trackDiscoverEvents } from "@/hooks/useCommunityDiscover";
import type { DiscoverCommunityCard } from "@/hooks/useCommunityDiscover";
import { DsrtPanel, DsrtChip } from "@/components/dsrt";

interface CommunityCardProps {
  community: DiscoverCommunityCard;
  surface: string;
  variant?: "grid" | "horizontal" | "compact";
  onDismiss?: (id: string) => void;
}

// 🎯 অটোমেটিক ক্যাটাগরি ব্যানার ব্যাকআপ (যদি DB-তে ছবি না থাকে)
function getFallbackCover(category?: string | null, name?: string): string {
  const cat = (category || name || "").toLowerCase();
  if (
    cat.includes("ai") ||
    cat.includes("machine") ||
    cat.includes("intelligence")
  ) {
    return "https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=800&q=80";
  }
  if (
    cat.includes("tech") ||
    cat.includes("code") ||
    cat.includes("developer")
  ) {
    return "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80";
  }
  if (
    cat.includes("business") ||
    cat.includes("startup") ||
    cat.includes("finance")
  ) {
    return "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=800&q=80";
  }
  if (cat.includes("cyber") || cat.includes("security")) {
    return "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80";
  }
  if (cat.includes("health") || cat.includes("medical")) {
    return "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80";
  }
  return "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80";
}

export function CommunityCard({
  community,
  surface,
  variant = "grid",
  onDismiss,
}: CommunityCardProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;
    let sent = false;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !sent) {
            sent = true;
            trackDiscoverEvents([
              { community_id: community.id, event_type: "IMPRESSION", surface },
            ]);
            io.disconnect();
          }
        });
      },
      { threshold: 0.5 },
    );
    io.observe(rootRef.current);
    return () => io.disconnect();
  }, [community.id, surface]);

  const handleClick = () => {
    trackDiscoverEvents([
      { community_id: community.id, event_type: "CLICK", surface },
    ]);
  };

  // Cover & Logo Resolutions
  const cover =
    community.banner_url ||
    community.cover_url ||
    getFallbackCover(community.category, community.name);
  const logo = (community as any).logo_url || null;

  // Horizontal / compact variant
  if (variant === "horizontal" || variant === "compact") {
    return (
      <div
        ref={rootRef}
        className="group relative flex-shrink-0 w-[260px] sm:w-[280px]"
      >
        <DsrtPanel
          padding="none"
          variant="default"
          className="overflow-hidden hover:border-white/[0.16] transition-all h-full flex flex-col shadow-lg"
        >
          <Link
            href={`/community/${community.slug}`}
            onClick={handleClick}
            className="block flex-1"
          >
            <div className="relative h-24 bg-[#0a0a0f] overflow-hidden">
              <img
                src={cover}
                alt=""
                className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#05070D] via-transparent to-transparent" />
            </div>

            <div className="px-3 pb-2 pt-0 space-y-2 relative">
              {/* Logo Avatar */}
              <div className="-mt-6 mb-1 flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl border-2 border-[#05070D] bg-gradient-to-br from-[#1e3a5f] to-[#0f172a] overflow-hidden flex items-center justify-center shrink-0 shadow-md z-10">
                  {logo ? (
                    <img
                      src={logo}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[11px] font-bold text-white tracking-wider">
                      {(community.name || "?").slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-white truncate flex items-center gap-1">
                  {community.name}
                  {community.is_verified && (
                    <ShieldCheck
                      className="w-3 h-3 text-[#93c5fd] flex-shrink-0"
                      strokeWidth={1.75}
                    />
                  )}
                </p>
                <p className="text-[10px] text-white/40 truncate mt-0.5 font-mono uppercase tracking-wider">
                  {community.category || "general"} ·{" "}
                  {formatNumber(community.member_count)} members
                </p>
              </div>

              {community.short_description && (
                <p className="text-[12px] text-white/60 line-clamp-2 leading-snug">
                  {community.short_description}
                </p>
              )}
            </div>
          </Link>

          <div className="px-3 pb-3 pt-2 flex items-center justify-between gap-2 mt-auto border-t border-white/[0.04]">
            <JoinPill community={community} surface={surface} compact />
            <div className="flex items-center gap-1.5">
              <FollowPill community={community} surface={surface} />
              <CommunityCardMenu community={community} onDismiss={onDismiss} />
            </div>
          </div>
        </DsrtPanel>
      </div>
    );
  }

  // Grid variant
  return (
    <div ref={rootRef} className="group relative h-full">
      <DsrtPanel
        padding="none"
        variant="default"
        className="overflow-hidden hover:border-white/[0.16] transition-all h-full flex flex-col shadow-lg"
      >
        <Link
          href={`/community/${community.slug}`}
          onClick={handleClick}
          className="block flex-1"
        >
          {/* Cover Banner */}
          <div className="relative h-28 bg-[#0a0a0f] overflow-hidden">
            <img
              src={cover}
              alt=""
              className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#05070D] via-[#05070D]/20 to-transparent" />
          </div>

          <div className="px-4 pb-4 pt-0 space-y-3 relative">
            {/* Overlapping Logo Avatar */}
            <div className="-mt-7 mb-1 flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl border-2 border-[#05070D] bg-gradient-to-br from-[#1e3a5f] to-[#0f172a] overflow-hidden flex items-center justify-center shrink-0 shadow-lg z-10">
                {logo ? (
                  <img
                    src={logo}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[13px] font-bold text-white tracking-wider">
                    {(community.name || "?").slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[14px] font-semibold text-white truncate">
                  {community.name}
                </p>
                {community.is_verified && (
                  <ShieldCheck
                    className="w-3.5 h-3.5 text-[#93c5fd] flex-shrink-0"
                    strokeWidth={1.75}
                  />
                )}
              </div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-white/40 mt-0.5">
                {community.category || "general"}
                {community.location_text && (
                  <>
                    <span className="mx-1.5 opacity-40">·</span>
                    <span>{community.location_text}</span>
                  </>
                )}
              </p>
            </div>

            {community.short_description && (
              <p className="text-[12.5px] text-white/60 line-clamp-2 leading-relaxed">
                {community.short_description}
              </p>
            )}

            {community.reason_text && (
              <DsrtChip size="sm" tone="accent" className="max-w-full">
                <span className="truncate">{community.reason_text}</span>
              </DsrtChip>
            )}

            <div className="flex items-center gap-3 text-[11px] text-white/45 pt-0.5">
              <span className="inline-flex items-center gap-1">
                <Users className="w-3 h-3" strokeWidth={1.75} />
                {formatNumber(community.member_count)} members
              </span>
              {community.location_text && (
                <span className="inline-flex items-center gap-1 min-w-0">
                  <MapPin className="w-3 h-3 shrink-0" strokeWidth={1.75} />
                  <span className="truncate max-w-[100px]">
                    {community.location_text}
                  </span>
                </span>
              )}
            </div>
          </div>
        </Link>

        <div className="px-4 pb-4 flex items-center justify-between gap-2 border-t border-white/[0.04] pt-3 mt-auto">
          <JoinPill community={community} surface={surface} />
          <div className="flex items-center gap-1.5">
            <FollowPill community={community} surface={surface} />
            <CommunityCardMenu community={community} onDismiss={onDismiss} />
          </div>
        </div>
      </DsrtPanel>
    </div>
  );
}
