"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Compass, UsersRound } from "lucide-react";
import { ErrorState } from "@/components/kernel-ui";
import {
  useMyCommunities,
  type MyCommunityItem,
} from "@/hooks/useMyCommunities";
import { MyCommunityRow } from "./MyCommunityRow";
import { DraftsStrip } from "./DraftsStrip";
import { cn } from "@/lib/utils";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "OWNER", label: "Owned" },
  { value: "ADMIN", label: "Admin" },
  { value: "MODERATOR", label: "Moderator" },
  { value: "MEMBER", label: "Member" },
];

export function MyCommunitiesPage() {
  const { items, drafts, loading, error, reload } = useMyCommunities();
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [draftItems, setDraftItems] = useState(drafts);

  useEffect(() => {
    if (!loading) setDraftItems(drafts);
  }, [drafts, loading]);

  const filtered = useMemo(() => {
    let list = items;
    if (filter !== "all") list = list.filter((i) => i.top_role === filter);
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(
        (i) =>
          i.community.name.toLowerCase().includes(s) ||
          i.community.slug.toLowerCase().includes(s) ||
          (i.community.category || "").toLowerCase().includes(s),
      );
    }
    return list;
  }, [items, filter, q]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const it of items) c[it.top_role] = (c[it.top_role] || 0) + 1;
    return c;
  }, [items]);

  return (
    <div className="w-full max-w-[1128px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* LinkedIn-style page header card */}
      <div className="rounded-lg border border-white/[0.08] bg-[#0d0d10] overflow-hidden mb-4">
        <div className="px-5 sm:px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-[20px] sm:text-[22px] font-semibold text-white tracking-tight">
              My Communities
            </h1>
            <p className="mt-1 text-[13px] text-zinc-400 leading-snug">
              Communities you own, manage, or are a member of
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/community"
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full border border-white/15 text-[13px] font-semibold text-white hover:bg-white/[0.06] transition-colors"
            >
              <Compass className="w-4 h-4" strokeWidth={1.75} />
              Discover
            </Link>
            <Link
              href="/studio/community/new"
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[#0a66c2] hover:bg-[#004182] text-white text-[13px] font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" strokeWidth={2.25} />
              Create community
            </Link>
          </div>
        </div>
      </div>

      {/* Drafts */}
      {draftItems.length > 0 && (
        <div className="mb-4">
          <DraftsStrip
            drafts={draftItems}
            onDiscarded={(id) => {
              setDraftItems((prev) => prev.filter((d) => d.id !== id));
              reload();
            }}
          />
        </div>
      )}

      {/* Main list card */}
      <div className="rounded-lg border border-white/[0.08] bg-[#0d0d10] overflow-hidden">
        {/* Toolbar */}
        <div className="px-4 sm:px-5 py-3 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {FILTERS.map((f) => {
              const active = filter === f.value;
              const count =
                f.value === "all" ? items.length : counts[f.value] || 0;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    "inline-flex items-center gap-1 h-8 px-3 rounded-full text-[13px] font-semibold transition-colors whitespace-nowrap cursor-pointer border",
                    active
                      ? "bg-white text-black border-white"
                      : "bg-transparent text-zinc-400 border-white/10 hover:border-white/25 hover:bg-white/[0.04] hover:text-white",
                  )}
                >
                  {f.label}
                  {count > 0 && (
                    <span
                      className={cn(
                        "text-[11px] font-medium tabular-nums",
                        active ? "text-black/50" : "text-zinc-600",
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="relative sm:ml-auto w-full sm:w-56">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none"
              strokeWidth={1.75}
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name"
              className="w-full h-9 pl-9 pr-3 rounded-full border border-white/[0.1] bg-white/[0.03] text-[13px] text-white placeholder:text-zinc-600 outline-none focus:border-[#0a66c2] focus:ring-1 focus:ring-[#0a66c2]/40 transition-all"
            />
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.05] last:border-0 animate-pulse"
              >
                <div className="w-14 h-14 rounded-lg bg-white/[0.05]" />
                <div className="flex-1 space-y-2.5">
                  <div className="h-4 w-44 rounded bg-white/[0.06]" />
                  <div className="h-3 w-72 rounded bg-white/[0.04]" />
                  <div className="h-3 w-28 rounded bg-white/[0.03]" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-8">
            <ErrorState
              title="Could not load communities"
              description="Something went wrong. Please try again."
              errorCode={error}
              onRetry={reload}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-4">
              <UsersRound className="w-6 h-6 text-zinc-500" strokeWidth={1.5} />
            </div>
            <p className="text-[16px] font-semibold text-white mb-1">
              {items.length === 0
                ? "No communities yet"
                : "No matching communities"}
            </p>
            <p className="text-[13px] text-zinc-500 mb-6 max-w-sm mx-auto">
              {items.length === 0
                ? "Join communities that match your interests, or create one for your network."
                : "Try a different filter or search term."}
            </p>
            {items.length === 0 && (
              <div className="flex items-center justify-center gap-2">
                <Link
                  href="/community"
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full border border-white/15 text-[13px] font-semibold text-white hover:bg-white/[0.06] transition-colors"
                >
                  Discover communities
                </Link>
                <Link
                  href="/studio/community/new"
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[#0a66c2] hover:bg-[#004182] text-white text-[13px] font-semibold transition-colors"
                >
                  Create community
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div>
            {filtered.map((item: MyCommunityItem, idx) => (
              <MyCommunityRow
                key={item.membership_id}
                item={item}
                isLast={idx === filtered.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
