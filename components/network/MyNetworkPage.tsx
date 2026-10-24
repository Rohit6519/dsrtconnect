"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  Handshake,
  Heart,
  MagnifyingGlass,
  X,
  MapPin,
  Sparkle,
  Check,
  Clock,
  Buildings,
  UsersThree,
  ArrowRight,
  Star,
  ChatCircle,
  DotsThreeVertical,
  ShieldCheck,
  TrendUp,
  PaperPlaneTilt,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";

const MATCH_REASON_LABELS: Record<string, { label: string }> = {
  shared_interests: { label: "Shared interests" },
  shared_skills: { label: "Similar skills" },
  same_institution: { label: "Same institution" },
  mutual_connections: { label: "Mutual connections" },
  shared_communities: { label: "Same community" },
  same_location: { label: "Same location" },
  popular: { label: "Popular in your field" },
};

type TabId =
  | "suggested"
  | "connections"
  | "following"
  | "followers"
  | "communities"
  | "pending";

export function MyNetworkPage({ currentUser }: any) {
  const supabase = createClient();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabId>("suggested");
  const [data, setData] = useState<any>({
    following: [],
    followers: [],
    connections: [],
    pending_sent: [],
    pending_received: [],
    suggested: [],
    communities: [],
    recent_activity: [],
    people_you_may_know: [],
    counts: {
      following: 0,
      followers: 0,
      connections: 0,
      pending: 0,
      communities: 0,
      total: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("relevance");
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());
  const [showAllSuggested, setShowAllSuggested] = useState(false);
  const [messagingIds, setMessagingIds] = useState<Set<string>>(new Set()); // ✨ NEW

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/my-network", { cache: "no-store" });
      const d = await res.json();
      setData(d);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel("my-network-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "follows" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "builder_connections" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_members" },
        () => load(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id]);

  useEffect(() => {
    setShowAllSuggested(false);
  }, [activeTab, search]);

  const handleConnect = async (userId: string) => {
    setConnectedIds((prev) => new Set(prev).add(userId));
    const res = await fetch("/api/community/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient_id: userId }),
    });
    if (res.ok) {
      toast.success("Connection request sent");
      load();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed");
      setConnectedIds((prev) => {
        const n = new Set(prev);
        n.delete(userId);
        return n;
      });
    }
  };

  // ✨ NEW: Handle message
  const handleMessage = async (userId: string, userName?: string) => {
    if (messagingIds.has(userId)) return;

    setMessagingIds((prev) => new Set(prev).add(userId));

    try {
      const res = await fetch("/api/messages/dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient_id: userId }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to open chat");
        return;
      }

      toast.success(`Opening chat with ${userName || "user"}...`);
      router.push(`/messages/${data.conversation_id}`);
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setMessagingIds((prev) => {
        const n = new Set(prev);
        n.delete(userId);
        return n;
      });
    }
  };

  const handleDismiss = async (userId: string) => {
    setData((prev: any) => ({
      ...prev,
      suggested: prev.suggested.filter((p: any) => p.id !== userId),
    }));
  };

  const handleAccept = async (connectionId: string) => {
    await fetch("/api/invitations/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invitation_type: "connection",
        invitation_id: connectionId,
        action: "accept",
      }),
    });
    toast.success("Connection accepted");
    load();
  };

  const tabs = [
    {
      id: "suggested",
      label: "Suggested",
      icon: Sparkle,
      count: data.suggested?.length || 0,
    },
    {
      id: "connections",
      label: "Connections",
      icon: Handshake,
      count: data.counts.connections,
    },
    {
      id: "following",
      label: "Following",
      icon: Heart,
      count: data.counts.following,
    },
    {
      id: "followers",
      label: "Followers",
      icon: Users,
      count: data.counts.followers,
    },
    {
      id: "communities",
      label: "Communities",
      icon: Buildings,
      count: data.counts.communities,
    },
    {
      id: "pending",
      label: "Pending",
      icon: Clock,
      count: data.counts.pending,
    },
  ];

  const currentList = (() => {
    if (activeTab === "suggested") return data.suggested;
    if (activeTab === "connections") return data.connections;
    if (activeTab === "following") return data.following;
    if (activeTab === "followers") return data.followers;
    if (activeTab === "communities") return data.communities;
    if (activeTab === "pending")
      return [
        ...(data.pending_received || []).map((p: any) => ({
          ...p.requester,
          _type: "received",
          _connId: p.id,
        })),
        ...(data.pending_sent || []).map((p: any) => ({
          ...p.recipient,
          _type: "sent",
          _connId: p.id,
        })),
      ];
    return [];
  })();

  const sorted = [...currentList].sort((a: any, b: any) => {
    if (sortBy === "newest") {
      return (
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
      );
    }
    if (sortBy === "mutual") {
      return (b.mutual_connections || 0) - (a.mutual_connections || 0);
    }
    return (b.match_score || 0) - (a.match_score || 0);
  });

  const filtered = search
    ? sorted.filter((p: any) => {
        const s = search.toLowerCase();
        if (p.full_name)
          return (
            p.full_name?.toLowerCase().includes(s) ||
            p.tagline?.toLowerCase().includes(s)
          );
        if (p.name) return p.name?.toLowerCase().includes(s);
        return false;
      })
    : sorted;

  const displayList =
    activeTab === "suggested" && !showAllSuggested && !search
      ? filtered.slice(0, 5)
      : filtered;

  // ✨ NEW: Determine if user can be messaged (connections/followers/following)
  const canMessage = (person: any) => {
    return activeTab === "connections" || activeTab === "followers" || activeTab === "following";
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="max-w-[1400px] mx-auto p-4 md:p-6">
        <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr_320px] gap-5">
          {/* ==================== LEFT SIDEBAR ==================== */}
          <aside className="hidden xl:block space-y-4">
            <ProfileCard currentUser={currentUser} counts={data.counts} />
            <QuickStatsCard counts={data.counts} />
          </aside>

          {/* ==================== MAIN COLUMN ==================== */}
          <div className="space-y-4 min-w-0">
            {/* PAGE HEADER */}
            <div className="bg-card border border-border rounded-lg shadow-sm">
              <div className="p-5 border-b border-border">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" weight="fill" />
                    </div>
                    <div>
                      <h1 className="text-lg font-semibold text-foreground">
                        My Network
                      </h1>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Manage connections and grow your network
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link href="/messages">
                      <Button size="sm" variant="outline">
                        <ChatCircle className="w-4 h-4 mr-1.5" weight="bold" />
                        Messages
                      </Button>
                    </Link>
                    <Link href="/community">
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <UserPlus className="w-4 h-4 mr-1.5" weight="bold" />
                        Find People
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex items-center overflow-x-auto scrollbar-hide border-b border-border">
                {tabs.map((t) => {
                  const Icon = t.icon;
                  const isActive = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id as TabId)}
                      className={cn(
                        "flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-all relative border-b-2",
                        isActive
                          ? "text-blue-600 border-blue-600"
                          : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/40",
                      )}
                    >
                      <Icon
                        className="w-4 h-4"
                        weight={isActive ? "fill" : "regular"}
                      />
                      {t.label}
                      {t.count > 0 && (
                        <span
                          className={cn(
                            "text-[11px] px-1.5 py-0.5 rounded-full font-semibold min-w-[20px] text-center",
                            isActive
                              ? "bg-blue-600/10 text-blue-600"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {t.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Search + Sort */}
              <div className="px-5 py-3 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-muted/50 border border-transparent hover:border-border focus-within:border-blue-600 focus-within:bg-background rounded-md px-3 py-1.5 transition-all">
                  <MagnifyingGlass
                    className="w-4 h-4 text-muted-foreground"
                    weight="regular"
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, skills, or company"
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

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="h-8 px-3 bg-muted/50 border border-transparent hover:border-border rounded-md text-xs font-medium focus:outline-none focus:border-blue-600 transition-all cursor-pointer"
                >
                  <option value="relevance">Sort: Relevance</option>
                  <option value="newest">Sort: Newest</option>
                  <option value="mutual">Sort: Mutual</option>
                </select>
              </div>
            </div>

            {/* Suggested heading */}
            {activeTab === "suggested" && data.suggested.length > 0 && (
              <div className="bg-card border border-border rounded-lg shadow-sm px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Sparkle className="w-5 h-5 text-blue-600" weight="fill" />
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">
                      Suggested for you
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Based on your profile and activity
                    </p>
                  </div>
                </div>
                {data.suggested.length > 5 && !search && (
                  <button
                    onClick={() => setShowAllSuggested(!showAllSuggested)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 transition-colors"
                  >
                    {showAllSuggested ? (
                      <>Show less</>
                    ) : (
                      <>See all {data.suggested.length}</>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* CARDS GRID */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="h-[380px] bg-card border border-border rounded-lg shadow-sm animate-pulse"
                  />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState activeTab={activeTab} search={search} />
            ) : (
              <div
                className={cn(
                  "grid gap-4 auto-rows-fr",
                  activeTab === "suggested"
                    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
                )}
              >
                {displayList.map((item: any, i: number) =>
                  activeTab === "communities" ? (
                    <CommunityCard
                      key={item.id || i}
                      community={item}
                      index={i}
                    />
                  ) : activeTab === "suggested" ? (
                    <SuggestedPersonCard
                      key={item.id || i}
                      person={item}
                      index={i}
                      onConnect={() => handleConnect(item.id)}
                      onMessage={() =>
                        handleMessage(item.id, item.full_name)
                      }
                      onDismiss={() => handleDismiss(item.id)}
                      isConnecting={connectedIds.has(item.id)}
                      isMessaging={messagingIds.has(item.id)}
                    />
                  ) : (
                    <PersonCard
                      key={item.id || i}
                      person={item}
                      index={i}
                      tab={activeTab}
                      onConnect={() => handleConnect(item.id)}
                      onMessage={() =>
                        handleMessage(item.id, item.full_name)
                      }
                      onAccept={
                        item._connId
                          ? () => handleAccept(item._connId)
                          : undefined
                      }
                      isConnecting={connectedIds.has(item.id)}
                      isMessaging={messagingIds.has(item.id)}
                      canMessage={canMessage(item)}
                    />
                  ),
                )}
              </div>
            )}

            {/* Show all bottom */}
            {activeTab === "suggested" &&
              !showAllSuggested &&
              !search &&
              data.suggested.length > 5 && (
                <div className="flex justify-center">
                  <button
                    onClick={() => setShowAllSuggested(true)}
                    className="text-sm font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 flex items-center gap-2 transition-colors px-6 py-2.5 rounded-full border border-blue-600"
                  >
                    Show all {data.suggested.length} suggestions
                    <ArrowRight className="w-4 h-4" weight="bold" />
                  </button>
                </div>
              )}

            {/* Grow your network */}
            <div className="bg-card border border-border rounded-lg shadow-sm">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <TrendUp className="w-4 h-4 text-blue-600" weight="bold" />
                  Grow your network
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Actions to expand your professional connections
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-border">
                <ActionCard
                  icon={UserPlus}
                  title="Find People"
                  desc="Search and connect with professionals"
                  href="/community"
                />
                <ActionCard
                  icon={Buildings}
                  title="Join Communities"
                  desc="Engage with like-minded people"
                  href="/community"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-border border-t border-border">
                <ActionCard
                  icon={UsersThree}
                  title="Invite Friends"
                  desc="Bring your friends to DSRT"
                  href="/invite"
                />
                <ActionCard
                  icon={Star}
                  title="Complete Profile"
                  desc="Get better suggestions"
                  href={
                    currentUser?.username
                      ? `/profile/${currentUser.username}`
                      : "/settings"
                  }
                  showProgress={75}
                />
              </div>
            </div>
          </div>

          {/* ==================== RIGHT SIDEBAR ==================== */}
          <aside className="space-y-4">
            <NetworkInsights counts={data.counts} />
            <RecentActivity activity={data.recent_activity} />
            <PeopleYouMayKnow
              people={data.people_you_may_know}
              onConnect={handleConnect}
              onMessage={handleMessage}
              connectedIds={connectedIds}
              messagingIds={messagingIds}
            />
            <FooterLinks />
          </aside>
        </div>
      </div>
    </div>
  );
}

// ==================== LEFT SIDEBAR ====================

function ProfileCard({ currentUser, counts }: any) {
  return (
    <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
      <div className="h-14 bg-gradient-to-r from-blue-600 to-blue-800" />
      <div className="p-4 -mt-8 relative">
        <Link
          href={
            currentUser?.username
              ? `/profile/${currentUser.username}`
              : "/settings"
          }
        >
          <Avatar className="w-16 h-16 border-4 border-card mx-auto">
            <AvatarImage src={currentUser?.avatar_url} />
            <AvatarFallback className="bg-muted text-lg font-semibold">
              {currentUser?.full_name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>

        <div className="text-center mt-3">
          <Link
            href={
              currentUser?.username
                ? `/profile/${currentUser.username}`
                : "/settings"
            }
            className="text-sm font-semibold text-foreground hover:underline"
          >
            {currentUser?.full_name || "Your Name"}
          </Link>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {currentUser?.tagline || "Builder on DSRT"}
          </p>
        </div>
      </div>

      <div className="px-4 pb-4 space-y-1 border-t border-border pt-3">
        <Link
          href={
            currentUser?.username
              ? `/profile/${currentUser.username}`
              : "/settings"
          }
          className="flex items-center justify-between text-xs hover:bg-muted/40 px-2 py-1.5 rounded transition-colors"
        >
          <span className="text-muted-foreground">Profile viewers</span>
          <span className="font-semibold text-blue-600">-</span>
        </Link>
        <Link
          href="/my-network"
          className="flex items-center justify-between text-xs hover:bg-muted/40 px-2 py-1.5 rounded transition-colors"
        >
          <span className="text-muted-foreground">Connections</span>
          <span className="font-semibold text-blue-600">
            {counts.connections}
          </span>
        </Link>
        <Link
          href="/messages"
          className="flex items-center justify-between text-xs hover:bg-muted/40 px-2 py-1.5 rounded transition-colors"
        >
          <span className="text-muted-foreground">Messages</span>
          <ChatCircle className="w-3.5 h-3.5 text-blue-600" weight="fill" />
        </Link>
      </div>
    </div>
  );
}

function QuickStatsCard({ counts }: any) {
  const items = [
    { icon: Handshake, label: "Connections", value: counts.connections },
    { icon: Heart, label: "Following", value: counts.following },
    { icon: Users, label: "Followers", value: counts.followers },
    { icon: Buildings, label: "Communities", value: counts.communities },
    { icon: Clock, label: "Pending", value: counts.pending },
  ];

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm">
      <div className="px-4 py-3 border-b border-border">
        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
          Your Network
        </p>
      </div>
      <div className="p-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center justify-between px-3 py-2 hover:bg-muted/40 rounded-md transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className="w-4 h-4 text-muted-foreground"
                  weight="regular"
                />
                <span className="text-xs text-foreground">{item.label}</span>
              </div>
              <span className="text-xs font-semibold text-foreground tabular-nums">
                {item.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================== SUGGESTED PERSON CARD (with Message) ====================

function SuggestedPersonCard({
  person,
  index,
  onConnect,
  onMessage,
  onDismiss,
  isConnecting,
  isMessaging,
}: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-all relative flex flex-col overflow-hidden group"
    >
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 w-7 h-7 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors z-10 opacity-0 group-hover:opacity-100"
      >
        <X className="w-4 h-4" weight="bold" />
      </button>

      <div className="h-16 bg-gradient-to-br from-blue-500/20 via-purple-500/10 to-blue-600/20 border-b border-border" />

      <div className="px-4 pb-4 flex-1 flex flex-col">
        <div className="flex justify-center -mt-10 mb-2 relative">
          <Link href={person.username ? `/profile/${person.username}` : "#"}>
            <Avatar className="w-20 h-20 border-4 border-card">
              <AvatarImage src={person.avatar_url} />
              <AvatarFallback className="text-lg font-semibold bg-muted">
                {person.full_name?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          <span className="absolute bottom-1 right-[calc(50%-38px)] w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-card" />
        </div>

        <div className="text-center">
          <Link
            href={person.username ? `/profile/${person.username}` : "#"}
            className="text-sm font-semibold text-foreground hover:underline hover:text-blue-600 line-clamp-1 inline-flex items-center gap-1"
          >
            {person.full_name}
            {person.match_score > 70 && (
              <ShieldCheck
                className="w-3.5 h-3.5 text-blue-600"
                weight="fill"
              />
            )}
          </Link>

          <p className="text-xs text-foreground/80 mt-1 line-clamp-1 min-h-[16px] px-2">
            {person.role || person.tagline || "Builder"}
          </p>

          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 min-h-[14px] px-2 flex items-center justify-center gap-1">
            {person.location ? (
              <>
                <MapPin className="w-2.5 h-2.5" weight="regular" />
                {person.location}
              </>
            ) : (
              person.company || "DSRT Platform"
            )}
          </p>
        </div>

        {person.match_score > 30 && (
          <div className="mt-3 flex items-center justify-center gap-1.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-md px-2.5 py-1">
            <TrendUp className="w-3 h-3 text-blue-600" weight="fill" />
            <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-400">
              {Math.min(99, Math.round(person.match_score))}% profile match
            </span>
          </div>
        )}

        <div className="mt-3 text-center">
          {person.mutual_connections > 0 ? (
            <div className="flex items-center justify-center gap-1.5">
              <div className="flex -space-x-1">
                {[1, 2, 3]
                  .slice(0, Math.min(3, person.mutual_connections))
                  .map((_, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded-full bg-muted border border-card"
                    />
                  ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {person.mutual_connections}
                </span>{" "}
                mutual connection{person.mutual_connections !== 1 && "s"}
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              No mutual connections
            </p>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center justify-start mt-3 gap-1.5 min-h-[32px]">
          {person.match_reasons?.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-center">
              {person.match_reasons.slice(0, 2).map((r: string) => {
                const reason = MATCH_REASON_LABELS[r];
                if (!reason) return null;
                return (
                  <span
                    key={r}
                    className="text-[10px] px-2 py-0.5 bg-muted text-muted-foreground rounded-md font-medium"
                  >
                    {reason.label}
                  </span>
                );
              })}
            </div>
          )}

          {person.shared_skills?.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-center">
              {person.shared_skills.slice(0, 3).map((skill: string) => (
                <span
                  key={skill}
                  className="text-[10px] px-2 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded-md font-medium border border-blue-100 dark:border-blue-900"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ✨ NEW: Action buttons with Message */}
        <div className="mt-4 space-y-2">
          <Button
            size="sm"
            onClick={onConnect}
            disabled={isConnecting}
            variant={isConnecting ? "secondary" : "default"}
            className={cn(
              "w-full h-9 text-sm font-semibold rounded-full",
              !isConnecting &&
                "bg-transparent border-2 border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30",
            )}
          >
            {isConnecting ? (
              <>
                <Check className="w-4 h-4 mr-1.5" weight="bold" /> Pending
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-1.5" weight="bold" /> Connect
              </>
            )}
          </Button>

          {/* ✨ NEW: Message button */}
          <Button
            size="sm"
            onClick={onMessage}
            disabled={isMessaging}
            variant="outline"
            className="w-full h-9 text-sm font-semibold rounded-full border border-border hover:bg-muted"
          >
            {isMessaging ? (
              <>
                <div className="w-3 h-3 mr-1.5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                Opening...
              </>
            ) : (
              <>
                <ChatCircle className="w-4 h-4 mr-1.5" weight="bold" />{" "}
                Message
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ==================== PERSON CARD (Regular) ====================

function PersonCard({
  person,
  index,
  tab,
  onConnect,
  onMessage,
  onAccept,
  isConnecting,
  isMessaging,
  canMessage,
}: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden"
    >
      <div className="h-14 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900" />

      <div className="px-4 pb-4 flex-1 flex flex-col">
        <div className="flex justify-between items-start -mt-8 mb-2">
          <Link href={person.username ? `/profile/${person.username}` : "#"}>
            <Avatar className="w-16 h-16 border-4 border-card">
              <AvatarImage src={person.avatar_url} />
              <AvatarFallback className="bg-muted font-semibold">
                {person.full_name?.[0]}
              </AvatarFallback>
            </Avatar>
          </Link>
          <button className="mt-8 w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground">
            <DotsThreeVertical className="w-5 h-5" weight="bold" />
          </button>
        </div>

        <div className="flex-1">
          <Link
            href={person.username ? `/profile/${person.username}` : "#"}
            className="text-sm font-semibold text-foreground hover:underline hover:text-blue-600 truncate block"
          >
            {person.full_name}
          </Link>
          <p className="text-xs text-foreground/80 mt-0.5 line-clamp-1">
            {person.tagline || "Builder"}
          </p>
          {person.location && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1.5">
              <MapPin className="w-3 h-3" weight="regular" />
              {person.location}
            </p>
          )}
        </div>

        {/* ✨ UPDATED: Actions with Message */}
        <div className="mt-4 flex gap-2">
          {person._type === "received" && onAccept ? (
            <>
              <Button
                size="sm"
                className="flex-1 h-8 text-xs rounded-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={onAccept}
              >
                <Check className="w-3.5 h-3.5 mr-1" /> Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs rounded-full px-3"
                onClick={onMessage}
                disabled={isMessaging}
                title="Send message"
              >
                <ChatCircle className="w-3.5 h-3.5" weight="bold" />
              </Button>
            </>
          ) : person._type === "sent" ? (
            <Button
              size="sm"
              variant="secondary"
              disabled
              className="flex-1 h-8 text-xs rounded-full"
            >
              <Clock className="w-3.5 h-3.5 mr-1" /> Pending
            </Button>
          ) : (
            <>
              <Link
                href={person.username ? `/profile/${person.username}` : "#"}
                className="flex-1"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-xs rounded-full border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                >
                  View Profile
                </Button>
              </Link>
              {canMessage && (
                <Button
                  size="sm"
                  variant="default"
                  className="h-8 text-xs rounded-full px-3 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={onMessage}
                  disabled={isMessaging}
                  title="Send message"
                >
                  {isMessaging ? (
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ChatCircle
                        className="w-3.5 h-3.5 mr-1"
                        weight="bold"
                      />
                      Message
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ==================== COMMUNITY CARD ====================

function CommunityCard({ community, index }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col"
    >
      <div className="h-16 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-b border-border" />
      <div className="p-4 -mt-8 relative flex-1 flex flex-col">
        <div className="w-14 h-14 rounded-lg border-4 border-card bg-blue-600 flex items-center justify-center mb-3 shadow-sm">
          <span className="text-lg font-semibold text-white">
            {community.name?.[0]?.toUpperCase()}
          </span>
        </div>
        <Link
          href={`/community/${community.slug}`}
          className="text-sm font-semibold text-foreground hover:underline hover:text-blue-600 line-clamp-1"
        >
          {community.name}
        </Link>
        {community.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1 flex-1">
            {community.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border text-[11px] text-muted-foreground">
          <Users className="w-3 h-3" weight="fill" />
          <span>{community.member_count?.toLocaleString() || 0} members</span>
          <span className="text-muted-foreground/40 ml-auto">·</span>
          <span className="capitalize font-medium text-foreground/70">
            {community.role}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ==================== ACTION CARD ====================

function ActionCard({ icon: Icon, title, desc, href, showProgress }: any) {
  return (
    <Link href={href}>
      <div className="p-5 flex items-start gap-3 hover:bg-muted/40 transition-colors cursor-pointer h-full">
        <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-blue-600" weight="fill" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {desc}
          </p>
        </div>
        {showProgress ? (
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs font-semibold text-blue-600">
              {showProgress}%
            </span>
            <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600"
                style={{ width: `${showProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <ArrowRight
            className="w-4 h-4 text-muted-foreground flex-shrink-0"
            weight="bold"
          />
        )}
      </div>
    </Link>
  );
}

// ==================== SIDEBAR ====================

function NetworkInsights({ counts }: any) {
  const total = counts.total || 1;

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm">
      <div className="px-5 py-4 border-b border-border">
        <p className="text-sm font-semibold text-foreground">
          Network insights
        </p>
      </div>

      <div className="p-5">
        <div className="text-center mb-4">
          <p className="text-3xl font-bold text-foreground tabular-nums">
            {counts.total}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Total in your network
          </p>
        </div>

        <div className="space-y-3">
          <StatRow
            label="Connections"
            value={counts.connections}
            total={total}
            color="bg-blue-600"
          />
          <StatRow
            label="Following"
            value={counts.following}
            total={total}
            color="bg-purple-600"
          />
          <StatRow
            label="Followers"
            value={counts.followers}
            total={total}
            color="bg-pink-600"
          />
          <StatRow
            label="Communities"
            value={counts.communities}
            total={total}
            color="bg-green-600"
          />
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value, total, color }: any) {
  const percent = (value / total) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold text-foreground tabular-nums">
          {value}
        </span>
      </div>
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all", color)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function RecentActivity({ activity }: any) {
  return (
    <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Recent activity</p>
        <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline">
          See all
        </button>
      </div>
      {activity.length === 0 ? (
        <div className="p-8 text-center">
          <Clock className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground">No recent activity</p>
        </div>
      ) : (
        <div>
          {activity.map((a: any, i: number) => (
            <div
              key={i}
              className="px-5 py-3 flex items-start gap-3 hover:bg-muted/40 transition-colors border-b border-border last:border-b-0"
            >
              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center flex-shrink-0">
                {a.type === "started_following" ? (
                  <Heart className="w-4 h-4 text-blue-600" weight="fill" />
                ) : (
                  <Buildings className="w-4 h-4 text-blue-600" weight="fill" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground leading-relaxed">
                  {a.type === "started_following" ? (
                    <>
                      You started following{" "}
                      <span className="font-semibold">{a.user_name}</span>
                    </>
                  ) : (
                    <>
                      You joined{" "}
                      <span className="font-semibold">{a.community_name}</span>
                    </>
                  )}
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

// ==================== ✨ UPDATED: PEOPLE YOU MAY KNOW (with Message) ====================

function PeopleYouMayKnow({
  people,
  onConnect,
  onMessage,
  connectedIds,
  messagingIds,
}: any) {
  return (
    <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">
          People you may know
        </p>
        <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline">
          See all
        </button>
      </div>
      {people.length === 0 ? (
        <div className="p-8 text-center">
          <Users className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground">
            Complete your profile for suggestions
          </p>
        </div>
      ) : (
        <div>
          {people.slice(0, 5).map((p: any) => (
            <div
              key={p.id}
              className="px-5 py-3 flex items-center gap-3 hover:bg-muted/40 transition-colors border-b border-border last:border-b-0"
            >
              <Link href={p.username ? `/profile/${p.username}` : "#"}>
                <Avatar className="w-10 h-10 border border-border">
                  <AvatarImage src={p.avatar_url} />
                  <AvatarFallback className="bg-muted text-xs">
                    {p.full_name?.[0]}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  href={p.username ? `/profile/${p.username}` : "#"}
                  className="text-xs font-semibold text-foreground truncate hover:text-blue-600 hover:underline block"
                >
                  {p.full_name}
                </Link>
                <p className="text-[11px] text-muted-foreground truncate">
                  {p.role || p.tagline || "Builder"}
                </p>
                {p.match_reasons?.[0] &&
                  MATCH_REASON_LABELS[p.match_reasons[0]] && (
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                      {MATCH_REASON_LABELS[p.match_reasons[0]].label}
                    </p>
                  )}
              </div>
              {/* ✨ NEW: Icon buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onMessage(p.id, p.full_name)}
                  disabled={messagingIds?.has(p.id)}
                  className="w-7 h-7 rounded-full border border-border hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-600 hover:text-blue-600 flex items-center justify-center transition-colors disabled:opacity-50"
                  title="Send message"
                >
                  {messagingIds?.has(p.id) ? (
                    <div className="w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ChatCircle className="w-3.5 h-3.5" weight="bold" />
                  )}
                </button>
                {connectedIds.has(p.id) ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled
                    className="h-7 text-[11px] px-3 rounded-full"
                  >
                    Sent
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => onConnect(p.id)}
                    variant="outline"
                    className="h-7 text-[11px] px-3 rounded-full border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                  >
                    Connect
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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

function EmptyState({ activeTab, search }: any) {
  if (search) {
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
          Try a different search term
        </p>
      </div>
    );
  }

  const messages: Record<string, any> = {
    suggested: {
      title: "No suggestions yet",
      desc: "Complete your profile to see people you may know",
      icon: Sparkle,
    },
    connections: {
      title: "No connections yet",
      desc: "Start connecting with builders in your network",
      icon: Handshake,
    },
    following: {
      title: "Not following anyone",
      desc: "Follow builders to see their updates in your feed",
      icon: Heart,
    },
    followers: {
      title: "No followers yet",
      desc: "Keep building to attract followers to your profile",
      icon: Users,
    },
    communities: {
      title: "No communities yet",
      desc: "Discover and join communities that match your interests",
      icon: Buildings,
    },
    pending: {
      title: "No pending requests",
      desc: "Connection requests will appear here",
      icon: Clock,
    },
  };

  const msg = messages[activeTab] || messages.suggested;
  const Icon = msg.icon;

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm p-16 text-center">
      <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-7 h-7 text-blue-600" weight="fill" />
      </div>
      <h3 className="font-semibold text-foreground text-base">{msg.title}</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
        {msg.desc}
      </p>
      <Link href="/community">
        <Button className="mt-5 bg-blue-600 hover:bg-blue-700 text-white rounded-full">
          <UserPlus className="w-4 h-4 mr-2" weight="bold" /> Discover People
        </Button>
      </Link>
    </div>
  );
}