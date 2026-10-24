"use client";

import Link from "next/link";
import { ShieldCheck, Users, MapPin, Globe, Settings } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { CommunityHeaderActions } from "./CommunityHeaderActions";
import type { CommunityDetail } from "@/hooks/useCommunityDetail";
import { DsrtPanel, DsrtButton, DsrtChip } from "@/components/dsrt";

interface Props {
  detail: CommunityDetail;
  onChanged?: () => void;
}

const POLICY_LABEL: Record<string, string> = {
  OPEN: "Open to join",
  APPROVAL_REQUIRED: "Approval required",
  INVITE_ONLY: "Invite only",
  CLOSED: "Closed",
};

const VISIBILITY_LABEL: Record<string, string> = {
  PUBLIC: "Public",
  PRIVATE: "Private",
  UNLISTED: "Unlisted",
};

export function CommunityHeader({ detail, onChanged }: Props) {
  const c = detail.community;
  const caps = detail.capabilities;

  // Cover & Logo image mapping with fallbacks
  const coverImg = c.banner_url || c.cover_url || null;
  const logoImg =
    c.logo_url ||
    (c.cover_url && c.cover_url !== coverImg ? c.cover_url : null);

  return (
    <DsrtPanel variant="default" padding="none" className="overflow-hidden">
      {/* Cover Banner */}
      <div className="relative h-32 sm:h-40 md:h-52 bg-gradient-to-br from-[#0f172a] via-[#0a0a0f] to-[#1e3a5f] overflow-hidden">
        {coverImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImg}
            alt=""
            className="w-full h-full object-cover opacity-90"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-[#1e3a5f]/40 to-[#0f172a]/60" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#05070D] via-[#05070D]/40 to-transparent" />
      </div>

      <div className="px-4 sm:px-6 md:px-8 pb-5 sm:pb-6 -mt-12 sm:-mt-14 relative">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 sm:gap-5">
          <div className="flex items-end gap-3 sm:gap-4 md:gap-5 min-w-0">
            {/* Logo */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-2xl border-2 border-[#05070D] bg-gradient-to-br from-[#1e3a5f] to-[#0f172a] overflow-hidden flex items-center justify-center flex-shrink-0 shadow-2xl z-10">
              {logoImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoImg}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[18px] sm:text-[22px] font-bold text-white/80">
                  {(c.name || "?").slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            <div className="min-w-0 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-[20px] sm:text-[22px] md:text-[26px] font-bold text-white tracking-tight leading-tight">
                  {c.name}
                </h1>
                {c.is_verified && (
                  <ShieldCheck
                    className="w-4 h-4 text-[#93c5fd]"
                    strokeWidth={1.75}
                  />
                )}
                {c.community_type && (
                  <DsrtChip size="sm" tone="neutral">
                    {c.community_type.replace(/_/g, " ")}
                  </DsrtChip>
                )}
              </div>

              <div className="mt-2 flex items-center gap-2 flex-wrap text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-white/40">
                <span>{c.category || "general"}</span>
                <span className="opacity-40">·</span>
                <span>{VISIBILITY_LABEL[c.visibility] || "Public"}</span>
                <span className="opacity-40">·</span>
                <span>{POLICY_LABEL[c.join_policy] || "Open"}</span>
              </div>

              {c.short_description && (
                <p className="mt-2.5 sm:mt-3 text-[13px] text-white/70 leading-relaxed max-w-2xl line-clamp-3 sm:line-clamp-none">
                  {c.short_description}
                </p>
              )}

              <div className="mt-2.5 sm:mt-3 flex items-center gap-3 sm:gap-4 text-[11px] sm:text-[11.5px] text-white/45 flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <Users className="w-3 h-3" strokeWidth={1.75} />
                  {formatNumber(c.member_count)} members
                </span>
                {c.location_text && (
                  <span className="inline-flex items-center gap-1 min-w-0">
                    <MapPin className="w-3 h-3 shrink-0" strokeWidth={1.75} />
                    <span className="truncate max-w-[180px] sm:max-w-[220px]">
                      {c.location_text}
                    </span>
                  </span>
                )}
                {c.website && (
                  <a
                    href={c.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:text-white transition-colors min-w-0"
                  >
                    <Globe className="w-3 h-3 shrink-0" strokeWidth={1.75} />
                    <span className="truncate max-w-[160px] sm:max-w-[220px]">
                      {c.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </span>
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap w-full md:w-auto">
            {caps.can_manage_settings && (
              <DsrtButton
                asChild
                size="sm"
                variant="outline"
                className="flex-1 md:flex-none"
              >
                <Link href={`/community/${c.slug}/studio`}>
                  <Settings className="w-3.5 h-3.5" strokeWidth={1.75} />
                  Manage
                </Link>
              </DsrtButton>
            )}
            <div className="flex-1 md:flex-none min-w-0">
              <CommunityHeaderActions
                communityId={c.id}
                slug={c.slug}
                name={c.name}
                joinPolicy={c.join_policy}
                membershipStatus={caps.membership_status}
                isMember={caps.is_member}
                isOwner={caps.is_owner}
                onChanged={onChanged}
              />
            </div>
          </div>
        </div>
      </div>
    </DsrtPanel>
  );
}
