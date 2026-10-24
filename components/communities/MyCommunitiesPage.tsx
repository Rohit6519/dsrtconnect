"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CreateCommunityModal } from "./CreateCommunityModal";
import { CreatePostModal } from "./CreatePostModal";
import { toast } from "sonner";
import {
  Users,
  Plus,
  MagnifyingGlass,
  X,
  ChatCircle,
  Check,
  Gear,
  PencilSimple,
  Trash,
  Warning,
  DotsThree,
  Eye,
  Heart,
  Star,
  CalendarBlank,
  Lightbulb,
  Bell,
  Clock,
  ArrowUp,
  ArrowDown,
  ChartLineUp,
  SquaresFour,
  List,
  Buildings,
  TrendUp,
} from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/client";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "verified", label: "Verified" },
  { id: "most_members", label: "Most Members" },
  { id: "most_active", label: "Most Active" },
];

const SORT_OPTIONS = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "most_members", label: "Most Members" },
  { id: "most_views", label: "Most Views" },
  { id: "most_likes", label: "Most Likes" },
];

export function MyCommunitiesPage({ currentUser }: any) {
  const supabase = createClient();
  const [data, setData] = useState<any>({
    owned: [],
    stats: {},
    growth: { current: 0, previous: 0, percentage: 0 },
    chart_data: [],
    upcoming_events: [],
    recent_activity: [],
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [communityToDelete, setCommunityToDelete] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/my-communities", { cache: "no-store" });
      const d = await res.json();
      setData({
        owned: d.owned || [],
        stats: d.stats || {},
        growth: d.growth || { current: 0, previous: 0, percentage: 0 },
        chart_data: d.chart_data || [],
        upcoming_events: d.upcoming_events || [],
        recent_activity: d.recent_activity || [],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("my-communities-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "communities" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_members" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_likes" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_activity_signals" },
        () => load(),
      )
      .subscribe();

    const interval = setInterval(load, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id]);

  const handleCreated = () => load();
  const handlePostClick = (community: any) => {
    setSelectedCommunity(community);
    setShowPostModal(true);
  };
  const handlePosted = () => load();
  const handleDeleteClick = (community: any) => {
    setCommunityToDelete(community);
    setShowDeleteModal(true);
  };
  const handleDeleted = () => {
    setShowDeleteModal(false);
    setCommunityToDelete(null);
    load();
  };

  const filtered = data.owned
    .filter((c: any) => {
      if (search && !c.name?.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (activeFilter === "active" && !c.is_active) return false;
      if (activeFilter === "verified" && !c.is_verified) return false;
      if (categoryFilter && c.category !== categoryFilter) return false;
      return true;
    })
    .sort((a: any, b: any) => {
      if (sortBy === "newest")
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      if (sortBy === "oldest")
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      if (sortBy === "most_members")
        return (b.member_count || 0) - (a.member_count || 0);
      if (sortBy === "most_views")
        return (b.view_count || 0) - (a.view_count || 0);
      if (sortBy === "most_likes")
        return (b.like_count || 0) - (a.like_count || 0);
      if (activeFilter === "most_members")
        return (b.member_count || 0) - (a.member_count || 0);
      if (activeFilter === "most_active")
        return (b.post_count || 0) - (a.post_count || 0);
      return 0;
    });

  return (
    <>
      <div className="min-h-screen bg-muted/20">
        <div className="max-w-[1400px] mx-auto p-4 md:p-6">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
            {/* ==================== MAIN COLUMN ==================== */}
            <div className="space-y-4 min-w-0">
              {/* PAGE HEADER */}
              <div className="bg-card border border-border rounded-lg shadow-sm">
                <div className="p-5 border-b border-border">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                        <Buildings
                          className="w-5 h-5 text-white"
                          weight="fill"
                        />
                      </div>
                      <div>
                        <h1 className="text-lg font-semibold text-foreground">
                          My Communities
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Manage and grow your professional communities
                        </p>
                      </div>
                    </div>

                    <Button
                      onClick={() => setShowCreateModal(true)}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="w-4 h-4 mr-1.5" weight="bold" />
                      Create Community
                    </Button>
                  </div>
                </div>

                {/* STATS ROW */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-y md:divide-y-0 divide-border">
                  <StatItem
                    icon={Buildings}
                    label="Communities"
                    value={data.stats.total_communities || 0}
                    sublabel="Created"
                  />
                  <StatItem
                    icon={Users}
                    label="Members"
                    value={data.stats.total_members || 0}
                    growth={data.stats.members_growth}
                  />
                  <StatItem
                    icon={ChatCircle}
                    label="Posts"
                    value={data.stats.total_posts || 0}
                    growth={data.stats.posts_growth}
                  />
                  <StatItem
                    icon={Eye}
                    label="Views"
                    value={data.stats.total_views || 0}
                    growth={data.stats.views_growth}
                  />
                  <StatItem
                    icon={Heart}
                    label="Likes"
                    value={data.stats.total_likes || 0}
                    growth={data.stats.likes_growth}
                  />
                  <StatItem
                    icon={CalendarBlank}
                    label="Events"
                    value={data.stats.upcoming_events || 0}
                    growth={data.stats.events_growth}
                  />
                </div>
              </div>

              {/* SEARCH + FILTERS */}
              <div className="bg-card border border-border rounded-lg shadow-sm p-4 space-y-3">
                {/* Search */}
                <div className="flex items-center gap-2 bg-muted/50 border border-transparent hover:border-border focus-within:border-blue-600 focus-within:bg-background rounded-md px-3 py-1.5 transition-all">
                  <MagnifyingGlass
                    className="w-4 h-4 text-muted-foreground"
                    weight="regular"
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search communities by name..."
                    className="flex-1 bg-transparent border-0 focus:outline-none text-sm placeholder:text-muted-foreground/60"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" weight="bold" />
                    </button>
                  )}
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                    {FILTERS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setActiveFilter(f.id)}
                        className={cn(
                          "px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all",
                          activeFilter === f.id
                            ? "bg-blue-600 text-white"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted",
                        )}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="h-8 px-3 bg-muted/50 border border-transparent hover:border-border rounded-md text-xs font-medium focus:outline-none focus:border-blue-600 transition-all cursor-pointer"
                    >
                      <option value="">All Categories</option>
                      <option value="technology">Technology</option>
                      <option value="ai">AI/ML</option>
                      <option value="design">Design</option>
                      <option value="entrepreneurship">Entrepreneurship</option>
                      <option value="general">General</option>
                    </select>

                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="h-8 px-3 bg-muted/50 border border-transparent hover:border-border rounded-md text-xs font-medium focus:outline-none focus:border-blue-600 transition-all cursor-pointer"
                    >
                      {SORT_OPTIONS.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>

                    <div className="flex bg-muted/50 rounded-md overflow-hidden border border-border">
                      <button
                        onClick={() => setViewMode("grid")}
                        className={cn(
                          "px-2.5 py-1.5 transition-colors",
                          viewMode === "grid"
                            ? "bg-blue-600 text-white"
                            : "hover:bg-muted text-muted-foreground",
                        )}
                        title="Grid view"
                      >
                        <SquaresFour className="w-4 h-4" weight="bold" />
                      </button>
                      <button
                        onClick={() => setViewMode("list")}
                        className={cn(
                          "px-2.5 py-1.5 transition-colors",
                          viewMode === "list"
                            ? "bg-blue-600 text-white"
                            : "hover:bg-muted text-muted-foreground",
                        )}
                        title="List view"
                      >
                        <List className="w-4 h-4" weight="bold" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* RESULTS COUNT */}
              {!loading && filtered.length > 0 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <p>
                    Showing{" "}
                    <span className="font-semibold text-foreground">
                      {filtered.length}
                    </span>{" "}
                    {filtered.length === 1 ? "community" : "communities"}
                  </p>
                </div>
              )}

              {/* COMMUNITY GRID/LIST */}
              {loading ? (
                <div
                  className={cn(
                    viewMode === "grid"
                      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                      : "space-y-3",
                  )}
                >
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        "bg-card border border-border rounded-lg shadow-sm animate-pulse",
                        viewMode === "grid" ? "h-64" : "h-24",
                      )}
                    />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <EmptyState
                  hasSearch={!!search}
                  onCreate={() => setShowCreateModal(true)}
                />
              ) : (
                <div
                  className={cn(
                    viewMode === "grid"
                      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                      : "space-y-3",
                  )}
                >
                  {filtered.map((c: any, i: number) => (
                    <CommunityCard
                      key={c.id}
                      community={c}
                      index={i}
                      viewMode={viewMode}
                      onPostClick={handlePostClick}
                      onDeleteClick={handleDeleteClick}
                    />
                  ))}
                </div>
              )}

              {/* LOAD MORE */}
              {filtered.length > 0 && filtered.length >= 6 && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                  >
                    Load More Communities
                  </Button>
                </div>
              )}
            </div>

            {/* ==================== RIGHT SIDEBAR ==================== */}
            <aside className="space-y-4">
              <GrowthChart data={data.chart_data} growth={data.growth} />
              <UpcomingEvents events={data.upcoming_events} />
              <RecentActivity activity={data.recent_activity} />
              <CommunityTips />
              <FooterLinks />
            </aside>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateCommunityModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleCreated}
      />

      {selectedCommunity && (
        <CreatePostModal
          isOpen={showPostModal}
          onClose={() => {
            setShowPostModal(false);
            setSelectedCommunity(null);
          }}
          community={selectedCommunity}
          onPosted={handlePosted}
        />
      )}

      {communityToDelete && (
        <DeleteCommunityModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setCommunityToDelete(null);
          }}
          community={communityToDelete}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
}

// ==================== STAT ITEM (Inline Row) ====================

function StatItem({ icon: Icon, label, value, sublabel, growth }: any) {
  const formatted =
    typeof value === "number" && value >= 1000
      ? `${(value / 1000).toFixed(1)}K`
      : value?.toLocaleString() || 0;

  return (
    <div className="p-4 hover:bg-muted/30 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-foreground/70" weight="regular" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold tabular-nums leading-tight text-foreground">
            {formatted}
          </p>
          <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
            {label}
          </p>
          {sublabel && (
            <p className="text-[10px] text-muted-foreground/60">{sublabel}</p>
          )}
          {growth !== undefined && growth !== 0 && (
            <div
              className={cn(
                "flex items-center gap-0.5 mt-1",
                growth > 0 ? "text-green-600" : "text-red-600",
              )}
            >
              {growth > 0 ? (
                <ArrowUp className="w-2.5 h-2.5" weight="bold" />
              ) : (
                <ArrowDown className="w-2.5 h-2.5" weight="bold" />
              )}
              <span className="text-[10px] font-semibold">
                {Math.abs(growth)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== COMMUNITY CARD ====================

function CommunityCard({
  community,
  index,
  viewMode,
  onPostClick,
  onDeleteClick,
}: any) {
  const [showMenu, setShowMenu] = useState(false);
  const [starred, setStarred] = useState(false);

  // LIST VIEW
  if (viewMode === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
        className="bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-all group"
      >
        <div className="p-4 flex items-center gap-4">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 relative">
            <span className="text-lg font-semibold text-foreground">
              {community.name?.[0]?.toUpperCase()}
            </span>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/community/${community.slug}`}
                className="text-sm font-semibold text-foreground hover:text-blue-600 hover:underline"
              >
                {community.name}
              </Link>
              <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded font-medium">
                Owner
              </span>
              {community.is_verified && (
                <Check className="w-3.5 h-3.5 text-blue-600" weight="bold" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {community.description || "No description"}
            </p>
            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" weight="fill" />
                {community.member_count || 0}
              </span>
              <span className="flex items-center gap-1">
                <ChatCircle className="w-3 h-3" weight="fill" />
                {community.post_count || 0}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" weight="fill" />
                {community.view_count || 0}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3" weight="fill" />
                {community.like_count || 0}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link href={`/community/${community.slug}`}>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                View
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={() => onPostClick(community)}
              className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              <PencilSimple className="w-3 h-3 mr-1" weight="bold" />
              Post
            </Button>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="w-8 h-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <DotsThree className="w-5 h-5" weight="bold" />
              </button>
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute top-full right-0 mt-1 w-44 bg-popover border rounded-md shadow-lg overflow-hidden z-40">
                    <Link
                      href={`/community/${community.slug}/settings`}
                      className="w-full px-3 py-2 text-xs font-medium hover:bg-muted flex items-center gap-2"
                    >
                      <Gear className="w-3.5 h-3.5" weight="regular" />
                      Settings
                    </Link>
                    <button
                      onClick={() => setStarred(!starred)}
                      className="w-full px-3 py-2 text-xs font-medium hover:bg-muted flex items-center gap-2"
                    >
                      <Star
                        className="w-3.5 h-3.5"
                        weight={starred ? "fill" : "regular"}
                      />
                      {starred ? "Unstar" : "Star"}
                    </button>
                    <div className="border-t" />
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onDeleteClick(community);
                      }}
                      className="w-full px-3 py-2 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 flex items-center gap-2 text-left"
                    >
                      <Trash className="w-3.5 h-3.5" weight="regular" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // GRID VIEW (LinkedIn-style)
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden group"
    >
      {/* Banner */}
      <div className="h-16 bg-gradient-to-r from-blue-600 to-blue-800 relative">
        {/* Menu */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <button
            onClick={() => setStarred(!starred)}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur flex items-center justify-center transition-colors"
            title={starred ? "Unstar" : "Star"}
          >
            <Star
              className={cn(
                "w-3.5 h-3.5",
                starred ? "text-yellow-400" : "text-white",
              )}
              weight={starred ? "fill" : "regular"}
            />
          </button>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur flex items-center justify-center transition-colors"
            >
              <DotsThree className="w-4 h-4 text-white" weight="bold" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute top-full right-0 mt-1 w-44 bg-popover border rounded-md shadow-lg overflow-hidden z-40">
                  <Link
                    href={`/community/${community.slug}`}
                    className="w-full px-3 py-2 text-xs font-medium hover:bg-muted flex items-center gap-2"
                  >
                    <Eye className="w-3.5 h-3.5" weight="regular" />
                    View Community
                  </Link>
                  <Link
                    href={`/community/${community.slug}/settings`}
                    className="w-full px-3 py-2 text-xs font-medium hover:bg-muted flex items-center gap-2"
                  >
                    <Gear className="w-3.5 h-3.5" weight="regular" />
                    Settings
                  </Link>
                  <div className="border-t" />
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDeleteClick(community);
                    }}
                    className="w-full px-3 py-2 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 flex items-center gap-2 text-left"
                  >
                    <Trash className="w-3.5 h-3.5" weight="regular" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pb-5 flex-1 flex flex-col">
        {/* Avatar */}
        <div className="flex items-start justify-between -mt-8 mb-3">
          <div className="w-16 h-16 rounded-lg bg-card border-4 border-card shadow-md flex items-center justify-center relative">
            <div className="w-full h-full rounded bg-muted flex items-center justify-center">
              <span className="text-xl font-semibold text-foreground">
                {community.name?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-card" />
          </div>
          <div className="mt-9 flex items-center gap-1.5">
            <span className="text-[10px] px-2 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded font-semibold">
              Owner
            </span>
          </div>
        </div>

        {/* Name */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Link
            href={`/community/${community.slug}`}
            className="text-base font-semibold text-foreground hover:text-blue-600 hover:underline line-clamp-1"
          >
            {community.name}
          </Link>
          {community.is_verified && (
            <Check className="w-4 h-4 text-blue-600" weight="bold" />
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground line-clamp-2 mt-1 min-h-[32px]">
          {community.description || "No description provided"}
        </p>

        {/* Category */}
        {community.category && (
          <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wide font-semibold mt-2">
            {community.category}
          </p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-border">
          <StatMini
            icon={Users}
            value={community.member_count || 0}
            label="Members"
          />
          <StatMini
            icon={ChatCircle}
            value={community.post_count || 0}
            label="Posts"
          />
          <StatMini
            icon={Eye}
            value={community.view_count || 0}
            label="Views"
          />
          <StatMini
            icon={Heart}
            value={community.like_count || 0}
            label="Likes"
          />
        </div>

        {/* Growth indicator */}
        {community.growth_this_month > 0 && (
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-green-600 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded px-2 py-1">
            <TrendUp className="w-3 h-3" weight="bold" />
            <span className="font-medium">
              +{community.growth_this_month}% growth this month
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 space-y-2 flex-1 flex flex-col justify-end">
          <div className="grid grid-cols-2 gap-2">
            <Link href={`/community/${community.slug}`}>
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs rounded-full border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
              >
                View
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={() => onPostClick(community)}
              className="w-full h-8 text-xs rounded-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <PencilSimple className="w-3 h-3 mr-1" weight="bold" />
              Post
            </Button>
          </div>
          <Link href={`/community/${community.slug}/settings`}>
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs rounded-full text-muted-foreground hover:text-foreground"
            >
              <Gear className="w-3 h-3 mr-1" weight="regular" />
              Manage
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

function StatMini({ icon: Icon, value, label }: any) {
  const formatted =
    value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toLocaleString();

  return (
    <div className="text-center">
      <p className="text-sm font-semibold tabular-nums text-foreground">
        {formatted}
      </p>
      <p className="text-[9px] text-muted-foreground uppercase tracking-wide mt-0.5">
        {label}
      </p>
    </div>
  );
}

// ==================== SIDEBAR: GROWTH CHART ====================

function GrowthChart({ data, growth }: any) {
  const maxValue = Math.max(...(data.map((d: any) => d.value) || [0]), 1);

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">
          Growth Analytics
        </p>
        <select className="text-[10px] px-2 py-1 bg-muted rounded border-0 focus:outline-none cursor-pointer">
          <option>This Month</option>
          <option>Last Month</option>
          <option>Last 6 Months</option>
        </select>
      </div>

      <div className="p-5">
        <div className="flex items-baseline gap-2 mb-1">
          <span
            className={cn(
              "text-2xl font-bold tabular-nums",
              growth.percentage >= 0 ? "text-green-600" : "text-red-600",
            )}
          >
            {growth.percentage >= 0 ? "+" : ""}
            {growth.percentage}%
          </span>
          <span className="text-xs text-muted-foreground">Members</span>
        </div>

        <p className="text-[11px] text-muted-foreground mb-4">
          Compared to last month
        </p>

        {/* Chart */}
        <div className="h-28 relative">
          <svg viewBox="0 0 300 100" className="w-full h-full">
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="rgb(37 99 235)"
                  stopOpacity="0.3"
                />
                <stop
                  offset="100%"
                  stopColor="rgb(37 99 235)"
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>

            {data.length > 0 && (
              <>
                <path
                  d={`M 0 100 ${data
                    .map(
                      (d: any, i: number) =>
                        `L ${(i / (data.length - 1)) * 300} ${100 - (d.value / maxValue) * 80}`,
                    )
                    .join(" ")} L 300 100 Z`}
                  fill="url(#chartGradient)"
                />
                <path
                  d={`M ${data
                    .map(
                      (d: any, i: number) =>
                        `${(i / (data.length - 1)) * 300} ${100 - (d.value / maxValue) * 80}`,
                    )
                    .join(" L ")}`}
                  stroke="rgb(37 99 235)"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
                {data.map((d: any, i: number) => (
                  <circle
                    key={i}
                    cx={(i / (data.length - 1)) * 300}
                    cy={100 - (d.value / maxValue) * 80}
                    r="3"
                    fill="rgb(37 99 235)"
                    className="hover:r-4 transition-all"
                  />
                ))}
              </>
            )}
          </svg>
        </div>

        <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
          {data.map((d: any) => (
            <span key={d.month}>{d.month}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== SIDEBAR: UPCOMING EVENTS ====================

function UpcomingEvents({ events }: any) {
  return (
    <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Upcoming Events</p>
        <button className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline">
          View all
        </button>
      </div>
      {events.length === 0 ? (
        <div className="p-8 text-center">
          <CalendarBlank
            className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2"
            weight="regular"
          />
          <p className="text-xs text-muted-foreground">No upcoming events</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {events.slice(0, 3).map((event: any) => (
            <div
              key={event.id}
              className="px-5 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex-shrink-0 text-center bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-md p-2 w-12">
                <p className="text-sm font-bold text-blue-700 dark:text-blue-400">
                  {new Date(event.start_time).getDate()}
                </p>
                <p className="text-[9px] text-blue-700 dark:text-blue-400 uppercase font-semibold">
                  {new Date(event.start_time).toLocaleString("en", {
                    month: "short",
                  })}
                </p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {event.title}
                </p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                  <Clock className="w-2.5 h-2.5" weight="regular" />
                  {new Date(event.start_time).toLocaleTimeString("en", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {event.attendee_count || 0} registered
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== SIDEBAR: RECENT ACTIVITY ====================

function RecentActivity({ activity }: any) {
  return (
    <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Recent Activity</p>
        <button className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline">
          View all
        </button>
      </div>
      {activity.length === 0 ? (
        <div className="p-8 text-center">
          <Bell
            className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2"
            weight="regular"
          />
          <p className="text-xs text-muted-foreground">No recent activity</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {activity.slice(0, 4).map((a: any, i: number) => (
            <div
              key={i}
              className="px-5 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors"
            >
              <Avatar className="w-8 h-8 border border-border">
                <AvatarImage src={a.users?.avatar_url} />
                <AvatarFallback className="text-[10px] bg-muted">
                  {a.users?.full_name?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground leading-relaxed">
                  <span className="font-semibold">
                    {a.users?.full_name || "Someone"}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    {a.message || "did something"}
                  </span>
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(a.created_at), {
                    addSuffix: false,
                  })}{" "}
                  ago
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== SIDEBAR: TIPS ====================

function CommunityTips() {
  return (
    <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-600" weight="fill" />
          <p className="text-sm font-semibold text-foreground">Growth Tips</p>
        </div>
      </div>
      <div className="p-5">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Engage regularly with your members and create quality content to grow
          your communities faster.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-3 h-8 text-xs w-full rounded-full"
        >
          View All Tips
        </Button>
      </div>
    </div>
  );
}

// ==================== SIDEBAR: FOOTER LINKS ====================

function FooterLinks() {
  return (
    <div className="px-5 py-4 space-y-2">
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <a href="#" className="hover:text-blue-600 hover:underline">
          About
        </a>
        <a href="#" className="hover:text-blue-600 hover:underline">
          Help
        </a>
        <a href="#" className="hover:text-blue-600 hover:underline">
          Privacy
        </a>
        <a href="#" className="hover:text-blue-600 hover:underline">
          Terms
        </a>
      </div>
      <p className="text-[11px] text-muted-foreground font-semibold">
        DSRT Platform © 2025
      </p>
    </div>
  );
}

// ==================== EMPTY STATE ====================

function EmptyState({ hasSearch, onCreate }: any) {
  if (hasSearch) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-sm p-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <MagnifyingGlass
            className="w-7 h-7 text-muted-foreground"
            weight="regular"
          />
        </div>
        <h3 className="font-semibold text-foreground">No matches found</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Try a different search term or filter
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm p-16 text-center">
      <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center mx-auto mb-4">
        <Buildings className="w-8 h-8 text-blue-600" weight="fill" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">
        Start your first community
      </h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
        Bring people together around your passion and build a thriving
        community.
      </p>
      <Button
        onClick={onCreate}
        size="sm"
        className="mt-5 bg-blue-600 hover:bg-blue-700 text-white rounded-full"
      >
        <Plus className="w-4 h-4 mr-2" weight="bold" />
        Create Your First Community
      </Button>
    </div>
  );
}

// ==================== DELETE MODAL ====================

function DeleteCommunityModal({ isOpen, onClose, community, onDeleted }: any) {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== community?.name) {
      toast.error("Community name doesn't match");
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/communities/${community.id}/delete`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        setDeleting(false);
      } else {
        toast.success("Community deleted");
        onDeleted();
      }
    } catch (e: any) {
      toast.error(e.message);
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-background border border-red-200 dark:border-red-900 rounded-lg shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-5 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-900 flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0">
            <Warning className="w-5 h-5 text-red-600" weight="fill" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-red-700 dark:text-red-400">
              Delete Community
            </h2>
            <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-0.5">
              This action cannot be undone
            </p>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-foreground">
            You are about to permanently delete{" "}
            <span className="font-semibold">&quot;{community?.name}&quot;</span>{" "}
            and all its associated data including members, posts, and events.
          </p>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Type{" "}
              <span className="font-mono font-semibold text-foreground">
                {community?.name}
              </span>{" "}
              to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={community?.name}
              className="w-full px-3 py-2 bg-muted/50 border border-border rounded-md text-sm focus:outline-none focus:border-red-600 focus:bg-background transition-all"
            />
          </div>
        </div>
        <div className="p-4 border-t flex gap-2 bg-muted/30">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={deleting}
            className="flex-1"
            size="sm"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting || confirmText !== community?.name}
            className="flex-1"
            size="sm"
          >
            {deleting ? "Deleting..." : "Delete Forever"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
