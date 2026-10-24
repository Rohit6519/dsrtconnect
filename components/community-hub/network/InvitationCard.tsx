"use client";

import { useTransition, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, X, Loader2, Clock, ShieldCheck } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { toast } from "@/components/ui/sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Props {
  invitationId: string;
  message: string | null;
  createdAt: string;
  expiresAt: string;
  roleName: string | null;
  inviter: {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string | null;
  } | null;
  community: {
    id: string;
    slug: string;
    name: string;
    short_description: string | null;
    cover_url: string | null;
    is_verified: boolean;
    member_count: number;
    category: string | null;
  };
  onResolved: (invitationId: string, action: "accepted" | "declined") => void;
}

// 🎯 Safe Date Formatter Helper
function safeFormatDistance(dateStr?: string | null): string {
  if (!dateStr) return "soon";
  try {
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) return "soon";
    return formatDistanceToNow(parsed, { addSuffix: true });
  } catch {
    return "soon";
  }
}

export function InvitationCard({
  invitationId,
  message,
  createdAt,
  expiresAt,
  roleName,
  inviter,
  community,
  onResolved,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [action, setAction] = useState<"accept" | "decline" | null>(null);

  const accept = () => {
    setAction("accept");
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/v1/community/invitations/${invitationId}/accept`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          },
        );
        const json = await res.json();
        if (!res.ok) {
          toast.error(json?.error?.message || "Could not accept invitation");
          setAction(null);
          return;
        }
        toast.success(`Joined ${community.name}`);
        onResolved(invitationId, "accepted");
        const slug = json?.data?.community_slug || community.slug;
        router.push(`/community/${slug}`);
      } catch {
        toast.error("Network error");
        setAction(null);
      }
    });
  };

  const decline = () => {
    setAction("decline");
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/v1/community/invitations/${invitationId}/decline`,
          { method: "POST" },
        );
        const json = await res.json();
        if (!res.ok) {
          toast.error(json?.error?.message || "Could not decline");
          setAction(null);
          return;
        }
        toast.message("Invitation declined");
        onResolved(invitationId, "declined");
      } catch {
        toast.error("Network error");
        setAction(null);
      }
    });
  };

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-white/[0.01] overflow-hidden">
      {community.cover_url && (
        <div className="relative h-20 bg-gradient-to-br from-white/[0.05] to-transparent overflow-hidden">
          <img
            src={community.cover_url}
            alt=""
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
        </div>
      )}

      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl border border-white/[0.08] bg-white/[0.04] flex items-center justify-center text-[13px] font-semibold text-white/70 flex-shrink-0">
            {(community.name || "?").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Link
                href={`/community/${community.slug}`}
                className="text-[14px] font-semibold text-white truncate hover:underline"
              >
                {community.name}
              </Link>
              {community.is_verified && (
                <ShieldCheck
                  className="w-3.5 h-3.5 text-white/70"
                  strokeWidth={1.75}
                />
              )}
            </div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-white/45 mt-0.5">
              {community.category || "general"} ·{" "}
              {formatNumber(community.member_count)} members
            </p>
          </div>
        </div>

        {community.short_description && (
          <p className="text-[12.5px] text-white/60 line-clamp-2 leading-relaxed">
            {community.short_description}
          </p>
        )}

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6 border border-white/[0.08]">
              <AvatarImage src={inviter?.avatar_url ?? undefined} />
              <AvatarFallback className="text-[10px] bg-white/[0.06] text-white/80">
                {(inviter?.full_name || "?").charAt(0)}
              </AvatarFallback>
            </Avatar>
            <p className="text-[12px] text-white/70 min-w-0">
              <span className="font-medium text-white/85">
                {inviter?.full_name || "Someone"}
              </span>
              <span className="text-white/50"> invited you</span>
              {roleName && (
                <span className="text-white/50">
                  {" "}
                  as <span className="text-white/70">{roleName}</span>
                </span>
              )}
            </p>
          </div>
          {message && (
            <p className="text-[12.5px] text-white/60 leading-relaxed italic border-l-2 border-white/[0.08] pl-3">
              &ldquo;{message}&rdquo;
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[10.5px] font-mono uppercase tracking-wider text-white/40">
            <Clock className="w-3 h-3" strokeWidth={1.75} />
            Expires {safeFormatDistance(expiresAt)}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={decline}
              disabled={pending}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] text-white/70",
                "hover:text-white hover:bg-white/[0.06] px-3 py-1.5 text-[12px] font-medium transition-colors cursor-pointer",
                pending && "opacity-70",
              )}
            >
              {pending && action === "decline" ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <X className="w-3 h-3" strokeWidth={1.75} />
              )}
              Decline
            </button>
            <button
              onClick={accept}
              disabled={pending}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full bg-white text-black hover:bg-zinc-100",
                "px-3.5 py-1.5 text-[12px] font-semibold transition-colors cursor-pointer",
                pending && "opacity-70",
              )}
            >
              {pending && action === "accept" ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Check className="w-3 h-3" strokeWidth={1.75} />
              )}
              Accept &amp; join
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
