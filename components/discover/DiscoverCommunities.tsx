"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  MagnifyingGlass,
  Users,
  Rocket,
  Sparkle,
  TrendUp,
  Compass,
  Globe,
  FunnelSimple,
  Check,
  X,
  Brain,
  Code,
  PaintBrush,
  Heartbeat,
  GraduationCap,
  Briefcase,
  Cpu,
  ChartLineUp,
  Flame,
  Star,
  ShareNetwork,
  Crown,
  Eye,
  Heart,
  ShieldCheck,
  Palette,
  Buildings,
  Bell,
  BookmarkSimple,
  CaretRight,
  CaretLeft,
  Robot,
  Hash,
  Calendar,
  Clock,
  Lightning,
  Plus,
  ChatCircle,
  ArrowLeft,
} from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";
import {
  useViewTracking,
  useHoverTracking,
  trackSignal,
} from "@/hooks/useTracking";
import { LikeButton } from "./LikeButton";
import {
  CommunityCardSkeleton,
  CategoryCardSkeleton,
  SmallCardSkeleton,
  SidebarRowSkeleton,
  StatCardSkeleton,
} from "@/components/ui/skeleton-variants";

const COLOR_MAP: Record<string, any> = {
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    gradient: "from-blue-500 to-blue-600",
    solid: "bg-blue-500",
  },
  purple: {
    bg: "bg-purple-500/10",
    text: "text-purple-500",
    gradient: "from-purple-500 to-purple-600",
    solid: "bg-purple-500",
  },
  orange: {
    bg: "bg-orange-500/10",
    text: "text-orange-500",
    gradient: "from-orange-500 to-orange-600",
    solid: "bg-orange-500",
  },
  green: {
    bg: "bg-green-500/10",
    text: "text-green-500",
    gradient: "from-green-500 to-green-600",
    solid: "bg-green-500",
  },
  pink: {
    bg: "bg-pink-500/10",
    text: "text-pink-500",
    gradient: "from-pink-500 to-pink-600",
    solid: "bg-pink-500",
  },
  yellow: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-500",
    gradient: "from-yellow-500 to-yellow-600",
    solid: "bg-yellow-500",
  },
  red: {
    bg: "bg-red-500/10",
    text: "text-red-500",
    gradient: "from-red-500 to-red-600",
    solid: "bg-red-500",
  },
  cyan: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-500",
    gradient: "from-cyan-500 to-cyan-600",
    solid: "bg-cyan-500",
  },
  gray: {
    bg: "bg-gray-500/10",
    text: "text-gray-500",
    gradient: "from-gray-500 to-gray-600",
    solid: "bg-gray-500",
  },
};

const CATEGORY_ICONS: Record<string, any> = {
  technology: { icon: Cpu, color: "blue" },
  ai: { icon: Brain, color: "purple" },
  security: { icon: ShieldCheck, color: "green" },
  design: { icon: Palette, color: "pink" },
  education: { icon: GraduationCap, color: "cyan" },
  business: { icon: Briefcase, color: "orange" },
  entrepreneurship: { icon: Rocket, color: "orange" },
  research: { icon: MagnifyingGlass, color: "green" },
  health: { icon: Heartbeat, color: "red" },
  general: { icon: Users, color: "blue" },
};

const TABS = [
  { id: "foryou", label: "For You", icon: Star },
  { id: "recommended", label: "Recommended", icon: Sparkle },
  { id: "trending", label: "Trending", icon: TrendUp },
  { id: "newest", label: "Newest", icon: Flame },
  { id: "most_active", label: "Most Active", icon: ChartLineUp },
];

interface DiscoverProps {
  currentUser: any;
}

export function DiscoverCommunities({ currentUser }: DiscoverProps) {
  const supabase = createClient();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("foryou");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortBy, setSortBy] = useState("popular");
  const [stats, setStats] = useState<any>({});
  const [allCommunities, setAllCommunities] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [loadingMain, setLoadingMain] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [search, setSearch] = useState("");

  // 🎯 NEW: View All modes
  const [viewMode, setViewMode] = useState<
    "grid" | "all_featured" | "all_categories" | "category_filter"
  >("grid");
  const [displayLimit, setDisplayLimit] = useState(4);
  const [selectedCategoryData, setSelectedCategoryData] = useState<any>(null);

  const loadAll = useCallback(async () => {
    try {
      const [statsRes, catsRes, topicsRes, eventsRes] = await Promise.all([
        fetch("/api/discover/stats").then((r) => r.json()),
        fetch("/api/discover/categories").then((r) => r.json()),
        fetch("/api/discover/trending-topics").then((r) => r.json()),
        fetch("/api/discover/upcoming-events").then((r) => r.json()),
      ]);
      setStats(statsRes.stats || {});
      setCategories(catsRes.categories || []);
      setTrendingTopics(topicsRes.topics || []);
      setUpcomingEvents(eventsRes.events || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStats(false);
      setLoadingCategories(false);
      setLoadingTopics(false);
      setLoadingEvents(false);
    }
  }, []);

  const loadCommunities = useCallback(async () => {
    setLoadingMain(true);
    try {
      const endpoint =
        activeTab === "trending"
          ? "/api/discover/trending?limit=100"
          : activeTab === "newest"
            ? "/api/discover/newest?limit=100"
            : activeTab === "recommended"
              ? "/api/discover/recommended?limit=100"
              : "/api/discover/foryou";

      const res = await fetch(endpoint);
      const data = await res.json();
      const items =
        activeTab === "foryou"
          ? data.items
              ?.filter((i: any) => i.type === "community")
              .map((i: any) => i.data) || []
          : data.communities || [];
      setAllCommunities(items);
    } catch (e) {
      setAllCommunities([]);
    } finally {
      setLoadingMain(false);
    }
  }, [activeTab]);

  const loadJoined = useCallback(async () => {
    const { data } = await supabase
      .from("community_members")
      .select("community_id")
      .eq("user_id", currentUser.id);
    setJoinedIds(new Set((data || []).map((r) => r.community_id)));

    const { data: bookmarks } = await supabase
      .from("community_bookmarks")
      .select("community_id")
      .eq("user_id", currentUser.id);
    setBookmarkedIds(new Set((bookmarks || []).map((r) => r.community_id)));
  }, [currentUser.id, supabase]);

  useEffect(() => {
    loadAll();
    loadJoined();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadCommunities();
  }, [loadCommunities]);

  useEffect(() => {
    const channel = supabase
      .channel("discover-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "communities" },
        () => loadCommunities(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_likes" },
        () => {
          loadCommunities();
          loadAll();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id]);

  const handleJoin = async (communityId: string) => {
    setJoinedIds((prev) => new Set(prev).add(communityId));
    trackSignal("join", "community", communityId);
    const res = await fetch("/api/discover/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ community_id: communityId }),
    });
    if (res.ok) toast.success("Joined community");
    else {
      setJoinedIds((prev) => {
        const n = new Set(prev);
        n.delete(communityId);
        return n;
      });
      toast.error("Failed to join");
    }
  };

  const handleBookmark = async (communityId: string) => {
    const isBookmarked = bookmarkedIds.has(communityId);
    if (isBookmarked) {
      setBookmarkedIds((prev) => {
        const n = new Set(prev);
        n.delete(communityId);
        return n;
      });
      await fetch(`/api/discover/save?community_id=${communityId}`, {
        method: "DELETE",
      });
      toast.success("Removed from bookmarks");
    } else {
      setBookmarkedIds((prev) => new Set(prev).add(communityId));
      await fetch("/api/discover/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ community_id: communityId }),
      });
      toast.success("Bookmarked");
    }
  };

  // 🎯 View All handlers
  const handleViewAllFeatured = () => {
    setViewMode("all_featured");
    setDisplayLimit(100);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleViewAllCategories = () => {
    setViewMode("all_categories");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCategoryClick = (category: any) => {
    setCategoryFilter(category.slug);
    setSelectedCategoryData(category);
    setViewMode("category_filter");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToGrid = () => {
    setViewMode("grid");
    setDisplayLimit(4);
    setCategoryFilter("");
    setSelectedCategoryData(null);
    setSearch("");
  };

  const format1 = (n: number) => {
    if (!n) return "0";
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M+`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K+`;
    return n.toLocaleString();
  };

  // 🎯 SMART FILTERING & SORTING
  const filteredAndSortedCommunities = useMemo(() => {
    let result = [...allCommunities];

    // Filter by search
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name?.toLowerCase().includes(s) ||
          c.description?.toLowerCase().includes(s) ||
          c.category?.toLowerCase().includes(s) ||
          (Array.isArray(c.tags) &&
            c.tags.some((t: string) => t.toLowerCase().includes(s))),
      );
    }

    // Filter by category
    if (categoryFilter) {
      result = result.filter(
        (c) =>
          c.category?.toLowerCase() === categoryFilter.toLowerCase() ||
          (Array.isArray(c.tags) &&
            c.tags.some(
              (t: string) => t.toLowerCase() === categoryFilter.toLowerCase(),
            )),
      );
    }

    // Sort
    if (sortBy === "newest") {
      result.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    } else if (sortBy === "members") {
      result.sort((a, b) => (b.member_count || 0) - (a.member_count || 0));
    } else if (sortBy === "popular") {
      result.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
    }

    return result;
  }, [allCommunities, search, categoryFilter, sortBy]);

  // What to display
  const displayCommunities =
    viewMode === "grid"
      ? filteredAndSortedCommunities.slice(0, displayLimit)
      : filteredAndSortedCommunities;

  const hasActiveFilters = search || categoryFilter || sortBy !== "popular";

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">
        {/* ==================== MAIN COLUMN ==================== */}
        <div className="space-y-5 min-w-0">
          {/* HEADER */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              {viewMode !== "grid" && (
                <button
                  onClick={handleBackToGrid}
                  className="w-8 h-8 rounded-lg bg-muted/40 hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" weight="bold" />
                </button>
              )}
              <h1 className="text-3xl font-bold tracking-tight">
                {viewMode === "all_featured"
                  ? "All Communities"
                  : viewMode === "all_categories"
                    ? "All Categories"
                    : viewMode === "category_filter"
                      ? selectedCategoryData?.label + " Communities"
                      : "Discover Communities"}
              </h1>
              <Sparkle className="w-6 h-6 text-purple-500" weight="fill" />
            </div>
            <p className="text-sm text-muted-foreground">
              {viewMode === "all_featured"
                ? `Browse all ${filteredAndSortedCommunities.length} communities`
                : viewMode === "all_categories"
                  ? `Explore ${categories.length} different categories`
                  : viewMode === "category_filter"
                    ? `${filteredAndSortedCommunities.length} communities in ${selectedCategoryData?.label}`
                    : "Explore, connect and grow with communities that match your interests."}
            </p>
          </div>

          {/* STATS - Only show on main grid view */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {loadingStats ? (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <StatCardSkeleton key={i} />
                  ))}
                </>
              ) : (
                <>
                  <StatCard
                    icon={Users}
                    color="blue"
                    value={format1(stats.total_communities || 0)}
                    label="Communities"
                    sublabel="Explore all"
                  />
                  <StatCard
                    icon={Sparkle}
                    color="purple"
                    value={format1(stats.total_members || 0)}
                    label="Active Members"
                    sublabel="This month"
                  />
                  <StatCard
                    icon={Rocket}
                    color="orange"
                    value={format1(stats.total_projects || 0)}
                    label="Active Projects"
                    sublabel="Being built"
                  />
                  <StatCard
                    icon={Globe}
                    color="green"
                    value={`${stats.total_countries || 0}+`}
                    label="Countries"
                    sublabel="Worldwide"
                  />
                  <StatCard
                    icon={Star}
                    color="pink"
                    value={stats.avg_rating || "4.5"}
                    label="Avg. Rating"
                    sublabel={`From ${format1(stats.total_reviews || 0)} reviews`}
                  />
                </>
              )}
            </div>
          )}

          {/* SEARCH + FILTERS - Always show */}
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-[300px] bg-card border rounded-xl px-4 py-2.5 flex items-center gap-2">
              <MagnifyingGlass
                className="w-4 h-4 text-muted-foreground"
                weight="bold"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search communities by name, keyword or category..."
                className="flex-1 bg-transparent border-0 focus:outline-none text-sm"
              />
              {search && (
                <button onClick={() => setSearch("")}>
                  <X className="w-4 h-4 text-muted-foreground" weight="bold" />
                </button>
              )}
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                if (e.target.value && viewMode === "grid") {
                  const cat = categories.find((c) => c.slug === e.target.value);
                  if (cat) {
                    setSelectedCategoryData(cat);
                    setViewMode("category_filter");
                  }
                }
              }}
              className="h-11 px-4 bg-card border rounded-xl text-sm font-medium min-w-[160px]"
            >
              <option value="">All Categories</option>
              {categories.map((c: any) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-11 px-4 bg-card border rounded-xl text-sm font-medium min-w-[140px]"
            >
              <option value="popular">Sort: Popular</option>
              <option value="newest">Sort: Newest</option>
              <option value="members">Sort: Members</option>
            </select>
            <button className="h-11 px-4 bg-card border rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-muted">
              <FunnelSimple className="w-4 h-4" weight="bold" />
              Filters
            </button>
          </div>

          {/* Active filters bar */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">
                Active filters:
              </span>
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="text-xs px-2 py-1 bg-blue-500/10 text-blue-500 rounded-lg flex items-center gap-1 hover:bg-blue-500/20"
                >
                  Search: &quot;{search}&quot;
                  <X className="w-3 h-3" weight="bold" />
                </button>
              )}
              {categoryFilter && (
                <button
                  onClick={() => {
                    setCategoryFilter("");
                    setSelectedCategoryData(null);
                  }}
                  className="text-xs px-2 py-1 bg-purple-500/10 text-purple-500 rounded-lg flex items-center gap-1 hover:bg-purple-500/20"
                >
                  Category:{" "}
                  {categories.find((c) => c.slug === categoryFilter)?.label ||
                    categoryFilter}
                  <X className="w-3 h-3" weight="bold" />
                </button>
              )}
              {sortBy !== "popular" && (
                <button
                  onClick={() => setSortBy("popular")}
                  className="text-xs px-2 py-1 bg-green-500/10 text-green-500 rounded-lg flex items-center gap-1 hover:bg-green-500/20"
                >
                  Sort: {sortBy}
                  <X className="w-3 h-3" weight="bold" />
                </button>
              )}
              <button
                onClick={() => {
                  setSearch("");
                  setCategoryFilter("");
                  setSortBy("popular");
                }}
                className="text-xs text-red-500 hover:underline ml-2"
              >
                Clear all
              </button>
            </div>
          )}

          {/* TABS - Show on grid view */}
          {viewMode === "grid" && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide border-b">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-all border-b-2 -mb-px",
                      isActive
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon
                      className="w-4 h-4"
                      weight={isActive ? "fill" : "regular"}
                    />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* ==================== VIEW: ALL CATEGORIES ==================== */}
          {viewMode === "all_categories" && (
            <section>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {loadingCategories
                  ? [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                      <CategoryCardSkeleton key={i} />
                    ))
                  : categories.map((cat: any) => (
                      <CategoryCard
                        key={cat.slug}
                        category={cat}
                        onClick={() => handleCategoryClick(cat)}
                      />
                    ))}
              </div>
            </section>
          )}

          {/* ==================== VIEW: GRID (Main) ==================== */}
          {viewMode === "grid" && (
            <>
              {/* FEATURED COMMUNITIES */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">Featured Communities</h2>
                  <button
                    onClick={handleViewAllFeatured}
                    className="text-xs text-blue-500 hover:underline flex items-center gap-1 font-semibold"
                  >
                    View all <CaretRight className="w-3 h-3" weight="bold" />
                  </button>
                </div>

                {loadingMain ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <CommunityCardSkeleton key={i} />
                    ))}
                  </div>
                ) : displayCommunities.length === 0 ? (
                  <div className="text-center py-12 bg-card border rounded-2xl">
                    <Users
                      className="w-12 h-12 mx-auto text-muted-foreground/30 mb-2"
                      weight="duotone"
                    />
                    <p className="text-sm">No communities found</p>
                    {hasActiveFilters && (
                      <button
                        onClick={() => {
                          setSearch("");
                          setCategoryFilter("");
                          setSortBy("popular");
                        }}
                        className="text-xs text-blue-500 hover:underline mt-2"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {displayCommunities.map((c: any, i: number) => (
                      <FeaturedCommunityCard
                        key={c.id}
                        community={c}
                        index={i}
                        isJoined={joinedIds.has(c.id)}
                        isBookmarked={bookmarkedIds.has(c.id)}
                        onJoin={() => handleJoin(c.id)}
                        onBookmark={() => handleBookmark(c.id)}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* EXPLORE BY CATEGORIES */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">Explore by Categories</h2>
                  <button
                    onClick={handleViewAllCategories}
                    className="text-xs text-blue-500 hover:underline flex items-center gap-1 font-semibold"
                  >
                    View all <CaretRight className="w-3 h-3" weight="bold" />
                  </button>
                </div>
                {loadingCategories ? (
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                      <CategoryCardSkeleton key={i} />
                    ))}
                  </div>
                ) : categories.length === 0 ? (
                  <div className="text-center py-6 bg-card border rounded-2xl">
                    <p className="text-xs text-muted-foreground">
                      No categories available
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {categories.slice(0, 6).map((cat: any) => (
                      <CategoryCard
                        key={cat.slug}
                        category={cat}
                        onClick={() => handleCategoryClick(cat)}
                      />
                    ))}
                    <button
                      onClick={handleViewAllCategories}
                      className="bg-card border rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:border-primary/40 hover:bg-muted/30 transition-all"
                    >
                      <div className="w-11 h-11 rounded-xl bg-muted/60 flex items-center justify-center">
                        <span className="text-xl">···</span>
                      </div>
                      <p className="text-xs font-bold">More</p>
                      <p className="text-[10px] text-muted-foreground">
                        Browse all
                      </p>
                    </button>
                  </div>
                )}
              </section>
            </>
          )}

          {/* ==================== VIEW: ALL FEATURED / CATEGORY FILTER ==================== */}
          {(viewMode === "all_featured" || viewMode === "category_filter") && (
            <section>
              {loadingMain ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <CommunityCardSkeleton key={i} />
                  ))}
                </div>
              ) : displayCommunities.length === 0 ? (
                <div className="text-center py-16 bg-card border rounded-2xl">
                  <Users
                    className="w-16 h-16 mx-auto text-muted-foreground/30 mb-3"
                    weight="duotone"
                  />
                  <p className="text-base font-bold mb-1">
                    No communities found
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {search && `No results for "${search}"`}
                    {categoryFilter &&
                      !search &&
                      `No communities in this category yet`}
                  </p>
                  <div className="flex gap-2 justify-center mt-4">
                    {hasActiveFilters && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearch("");
                          setCategoryFilter("");
                          setSortBy("popular");
                        }}
                      >
                        Clear filters
                      </Button>
                    )}
                    <Button size="sm" onClick={handleBackToGrid}>
                      Back to Discover
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4 text-xs text-muted-foreground">
                    Showing {displayCommunities.length} communities
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {displayCommunities.map((c: any, i: number) => (
                      <FeaturedCommunityCard
                        key={c.id}
                        community={c}
                        index={i}
                        isJoined={joinedIds.has(c.id)}
                        isBookmarked={bookmarkedIds.has(c.id)}
                        onJoin={() => handleJoin(c.id)}
                        onBookmark={() => handleBookmark(c.id)}
                      />
                    ))}
                  </div>
                </>
              )}
            </section>
          )}
        </div>

        {/* ==================== RIGHT SIDEBAR ==================== */}
        <aside className="space-y-4">
          <AICopilotPanel />
          <TrendingTopicsPanel
            topics={trendingTopics}
            loading={loadingTopics}
            onTopicClick={(topic: string) => {
              setSearch(topic);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
          <UpcomingEventsPanel
            events={upcomingEvents}
            loading={loadingEvents}
          />
          <CreateCommunityCTA />
        </aside>
      </div>
    </div>
  );
}

// ==================== STAT CARD ====================

function StatCard({ icon: Icon, color, value, label, sublabel }: any) {
  const colors = COLOR_MAP[color];
  return (
    <div className="bg-card border rounded-2xl p-4 hover:shadow-md transition-all">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0",
            colors.bg,
          )}
        >
          <Icon className={cn("w-5 h-5", colors.text)} weight="fill" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold tabular-nums leading-none">
            {value}
          </p>
          <p className="text-xs font-semibold text-foreground/80 mt-1 truncate">
            {label}
          </p>
          {sublabel && (
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              {sublabel}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== FEATURED COMMUNITY CARD ====================

function FeaturedCommunityCard({
  community,
  index,
  isJoined,
  isBookmarked,
  onJoin,
  onBookmark,
}: any) {
  const router = useRouter();
  const colors = COLOR_MAP[community.icon_color] || COLOR_MAP.blue;
  const viewRef = useViewTracking("community", community.id, true);
  const hoverHandlers = useHoverTracking("community", community.id);

  const handleClick = () => {
    trackSignal("click", "community", community.id);
    router.push(`/community/${community.slug}`);
  };

  const badge = community.is_new
    ? { label: "New", color: "green", emoji: "🆕" }
    : community.view_count > 100
      ? { label: "Trending", color: "orange", emoji: "🔥" }
      : community.is_verified
        ? { label: "Featured", color: "purple", emoji: "⭐" }
        : null;

  return (
    <motion.div
      ref={viewRef}
      {...hoverHandlers}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      className="bg-card border rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-xl transition-all relative group"
    >
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between">
        {badge ? (
          <span
            className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 backdrop-blur",
              COLOR_MAP[badge.color].bg,
              COLOR_MAP[badge.color].text,
            )}
          >
            <span>{badge.emoji}</span>
            {badge.label}
          </span>
        ) : (
          <div />
        )}

        <button
          onClick={onBookmark}
          className="w-7 h-7 rounded-lg bg-black/40 hover:bg-black/60 backdrop-blur flex items-center justify-center transition-colors"
        >
          <BookmarkSimple
            className={cn(
              "w-3.5 h-3.5",
              isBookmarked ? "text-yellow-500" : "text-white",
            )}
            weight={isBookmarked ? "fill" : "regular"}
          />
        </button>
      </div>

      <div className={cn("h-20 bg-gradient-to-br", colors.gradient)}>
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
      </div>

      <div className="p-4 -mt-10 relative">
        <div
          onClick={handleClick}
          className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center border-4 border-background shadow-md cursor-pointer relative mb-3",
            colors.bg,
          )}
        >
          <span className={cn("text-2xl font-bold", colors.text)}>
            {community.name?.[0]?.toUpperCase()}
          </span>
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
        </div>

        <div onClick={handleClick} className="cursor-pointer">
          <div className="flex items-center gap-1 mb-1">
            <h3 className="text-base font-bold truncate group-hover:text-primary transition-colors">
              {community.name}
            </h3>
            {community.is_verified && (
              <Check
                className="w-4 h-4 text-blue-500 flex-shrink-0"
                weight="bold"
              />
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px] mb-2">
          {community.description ||
            "Explore this community and discover amazing content"}
        </p>

        {Array.isArray(community.tags) && community.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {community.tags.slice(0, 2).map((t: string) => (
              <span
                key={t}
                className="text-[10px] px-2 py-0.5 bg-muted rounded font-medium capitalize"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 pt-3 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center gap-0.5 mb-0.5">
              <Users className="w-3 h-3 text-blue-500" weight="fill" />
              <p className="text-sm font-bold tabular-nums">
                {formatNumber(community.member_count || 0)}
              </p>
            </div>
            <p className="text-[9px] text-muted-foreground uppercase">
              Members
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-0.5 mb-0.5">
              <ChatCircle className="w-3 h-3 text-purple-500" weight="fill" />
              <p className="text-sm font-bold tabular-nums">
                {formatNumber(community.post_count || 0)}
              </p>
            </div>
            <p className="text-[9px] text-muted-foreground uppercase">Posts</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-0.5 mb-0.5">
              <Eye className="w-3 h-3 text-orange-500" weight="fill" />
              <p className="text-sm font-bold tabular-nums">
                {formatNumber(community.view_count || 0)}
              </p>
            </div>
            <p className="text-[9px] text-muted-foreground uppercase">Views</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <div className="flex -space-x-2 flex-shrink-0">
            {[...Array(Math.min(4, community.member_count || 0))].map(
              (_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-7 h-7 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold text-white",
                    [
                      "bg-blue-500",
                      "bg-purple-500",
                      "bg-pink-500",
                      "bg-orange-500",
                    ][i],
                  )}
                >
                  {String.fromCharCode(65 + i)}
                </div>
              ),
            )}
            {community.member_count > 4 && (
              <div className="w-7 h-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[9px] font-bold">
                +{community.member_count - 4}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 pt-3 border-t">
          <LikeButton
            communityId={community.id}
            initialCount={community.like_count || 0}
            initialLiked={community.is_liked || false}
            size="sm"
          />
          {isJoined ? (
            <Button
              size="sm"
              variant="secondary"
              disabled
              className="flex-1 h-9 text-xs"
            >
              <Check className="w-3.5 h-3.5 mr-1" weight="bold" />
              Joined
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onJoin}
              className="flex-1 h-9 text-xs bg-primary hover:bg-primary/90"
            >
              Join Community
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ==================== CATEGORY CARD ====================

function CategoryCard({ category, onClick }: any) {
  const info =
    CATEGORY_ICONS[category.slug?.toLowerCase()] || CATEGORY_ICONS.general;
  const Icon = info.icon;
  const colors = COLOR_MAP[info.color];

  return (
    <button
      onClick={onClick}
      className="bg-card border rounded-2xl p-4 flex flex-col items-center gap-2 hover:border-primary/40 hover:shadow-md transition-all"
    >
      <div
        className={cn(
          "w-11 h-11 rounded-xl flex items-center justify-center",
          colors.bg,
        )}
      >
        <Icon className={cn("w-5 h-5", colors.text)} weight="fill" />
      </div>
      <p className="text-xs font-bold text-center">{category.label}</p>
      <p className="text-[10px] text-muted-foreground">
        {category.community_count} Communities
      </p>
    </button>
  );
}

// ==================== SIDEBAR PANELS ====================

function AICopilotPanel() {
  return (
    <div className="bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10 border border-purple-500/20 rounded-2xl p-4 relative overflow-hidden">
      <div className="flex items-center gap-1 mb-3">
        <Sparkle className="w-3 h-3 text-purple-500" weight="fill" />
        <span className="text-[9px] font-bold text-purple-500">
          DSRT Project Assistant
        </span>
        <span className="text-[8px] px-1 py-0.5 bg-purple-500/20 text-purple-500 rounded font-bold">
          BETA
        </span>
      </div>

      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-3 shadow-lg">
          <Robot className="w-8 h-8 text-white" weight="fill" />
        </div>
        <p className="text-sm font-bold mb-1">Your AI Co-pilot for</p>
        <p className="text-base font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent mb-2">
          Building Great Projects.
        </p>
        <p className="text-[10px] text-muted-foreground leading-relaxed mb-3">
          Plan, build, automate and scale — your intelligent project companion.
        </p>
        <Link href="/mentor" className="w-full">
          <Button
            size="sm"
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <Sparkle className="w-3.5 h-3.5 mr-1" weight="fill" />
            Open Assistant
          </Button>
        </Link>
      </div>
    </div>
  );
}

function TrendingTopicsPanel({ topics, loading, onTopicClick }: any) {
  return (
    <div className="bg-card border rounded-2xl overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between">
        <p className="text-sm font-bold">Trending Topics</p>
        <button className="text-xs text-blue-500 hover:underline">
          View all
        </button>
      </div>
      {loading ? (
        <div className="divide-y">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted/40 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-3/4 bg-muted/40 rounded animate-pulse" />
                <div className="h-2 w-1/2 bg-muted/40 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : topics.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          No trending topics yet
        </p>
      ) : (
        <div className="divide-y">
          {topics.slice(0, 5).map((topic: any, i: number) => {
            const colors = [
              "text-blue-500",
              "text-purple-500",
              "text-pink-500",
              "text-orange-500",
              "text-green-500",
            ];
            return (
              <button
                key={topic.slug}
                onClick={() => onTopicClick(topic.tag)}
                className="w-full p-3 flex items-center gap-3 hover:bg-muted/20 cursor-pointer transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-muted/40 flex items-center justify-center flex-shrink-0">
                  <Hash className={cn("w-4 h-4", colors[i])} weight="bold" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{topic.tag}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {topic.count_label} posts
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UpcomingEventsPanel({ events, loading }: any) {
  const months = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];

  return (
    <div className="bg-card border rounded-2xl overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between">
        <p className="text-sm font-bold">Upcoming Events</p>
        <button className="text-xs text-blue-500 hover:underline">
          View all
        </button>
      </div>
      {loading ? (
        <div className="divide-y">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 flex items-start gap-3">
              <div className="w-12 h-14 rounded-lg bg-muted/40 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-3/4 bg-muted/40 rounded animate-pulse" />
                <div className="h-2 w-1/2 bg-muted/40 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="p-6 text-center">
          <Calendar
            className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2"
            weight="duotone"
          />
          <p className="text-xs text-muted-foreground">No upcoming events</p>
        </div>
      ) : (
        <div className="divide-y">
          {events.slice(0, 3).map((event: any) => {
            const date = new Date(event.start_time);
            const day = date.getDate();
            const month = months[date.getMonth()];
            const time = date.toLocaleTimeString("en", {
              hour: "numeric",
              minute: "2-digit",
            });
            const isOnline =
              event.location?.toLowerCase().includes("online") ||
              !event.location;

            return (
              <Link
                key={event.id}
                href={`/community/${event.community_slug}`}
                className="p-3 flex items-start gap-3 hover:bg-muted/20 transition-colors"
              >
                <div className="flex-shrink-0 text-center bg-purple-500/10 rounded-lg p-2 w-12">
                  <p className="text-xs font-bold text-purple-500">{day}</p>
                  <p className="text-[9px] text-purple-500 uppercase">
                    {month}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{event.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {time}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {isOnline ? "💻 Online" : `📍 ${event.location}`}
                    </p>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatNumber(event.attendee_count || 0)} going
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CreateCommunityCTA() {
  return (
    <Link href="/my-communities">
      <div className="bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-500/10 border border-purple-500/20 rounded-2xl p-4 hover:border-purple-500/40 transition-all cursor-pointer">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
            <Plus className="w-5 h-5 text-white" weight="bold" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">Create Your Community</p>
            <p className="text-[10px] text-muted-foreground">
              Start building today
            </p>
          </div>
          <CaretRight className="w-4 h-4 text-muted-foreground" weight="bold" />
        </div>
      </div>
    </Link>
  );
}

function formatNumber(n: number): string {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}
