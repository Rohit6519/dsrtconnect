"use client";

import { useState, useEffect, useCallback, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// Create Project Modal Component
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { ProjectExplorePage } from "@/components/projects-explore/ProjectExplorePage";

import {
  Plus,
  CircleNotch,
  CaretDown,
  WarningCircle,
  Heart,
  Briefcase,
  DotsThree,
  MapPin,
  Users,
  ArrowRight,
  BookmarkSimple,
  Wrench,
  GitBranch,
  CheckCircle,
  Eye,
  Clock,
  FolderOpen,
  RocketLaunch,
  Check,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  slug: string;
  name: string;
  tagline?: string | null;
  short_description?: string | null;
  description?: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  stage?: string;
  status?: string;
  industry?: string | null;
  location?: string | null;
  project_number?: string | null;
  project_type?: string | null;
  is_open_source?: boolean;
  is_dsrt_verified?: boolean;
  is_hiring?: boolean;
  team_size?: number;
  open_roles?: number;
  follower_count?: number;
  view_count?: number;
  tech_stack?: string[];
  category?: string[];
  updated_at?: string;
  created_at?: string;
  last_activity_at?: string;
}

type TabId = "my-projects" | "explore" | "following" | "applications";
type QuickStatus = "all" | "active" | "completed" | "archived";
type SortOption = "updated" | "created" | "name" | "stage";

const TABS = [
  { id: "my-projects", label: "Workspace" },
  { id: "explore", label: "Explore" },
  { id: "following", label: "Following" },
  { id: "applications", label: "Applications" },
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

function timeAgo(iso?: string | null): string {
  if (!iso) return "";
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export function ProjectsDashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050505] text-white p-10 flex items-center justify-center">
          <CircleNotch size={24} className="animate-spin text-zinc-500 mr-2" />
          <span className="text-[13px] text-zinc-500 font-medium tracking-wide">
            Loading workspace...
          </span>
        </div>
      }
    >
      <ProjectsDashboardContent />
    </Suspense>
  );
}

function ProjectsDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const tab = searchParams.get("tab");
    if (tab === "explore" || tab === "following" || tab === "applications")
      return tab;
    return "my-projects";
  });

  const [user, setUser] = useState<any>(null);
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [drafts, setDrafts] = useState<Project[]>([]);
  const [followingProjects, setFollowingProjects] = useState<Project[]>([]);
  const [draftLimitInfo, setDraftLimitInfo] = useState<{
    count: number;
    limit: number;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [quickStatus, setQuickStatus] = useState<QuickStatus>("all");
  const [sortOption, setSortOption] = useState<SortOption>("updated");
  const [sortOpen, setSortOpen] = useState(false);

  const [deleteModalProject, setDeleteModalProject] = useState<Project | null>(
    null,
  );
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);

  const loadWorkspaceData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase
          .from("users")
          .select("full_name, avatar_url, username")
          .eq("id", authUser.id)
          .maybeSingle();
        setUser(profile ? { ...authUser, profile } : authUser);
      }

      const [dashRes, draftCountRes] = await Promise.all([
        fetch("/api/projects/dashboard"),
        fetch("/api/projects/drafts/count")
          .then((r) => r.json())
          .catch(() => null),
      ]);

      if (dashRes.ok) {
        const data = await dashRes.json();
        setMyProjects(data.projects || []);
        setDrafts(
          (data.drafts || []).map((d: any) => ({ ...d, status: "draft" })),
        );
        setFollowingProjects(data.following || []);
      } else {
        setError(true);
      }

      if (draftCountRes && typeof draftCountRes.count === "number") {
        setDraftLimitInfo({
          count: draftCountRes.count,
          limit: draftCountRes.limit || 10,
        });
      }
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  useEffect(() => {
    if (activeTab === "following") {
      fetch("/api/projects/dashboard")
        .then((r) => r.json())
        .then((d) => setFollowingProjects(d.following || []))
        .catch(() => {});
    }
  }, [activeTab]);

  const handleConfirmDelete = async () => {
    if (
      !deleteModalProject ||
      deleteConfirmInput.trim() !== deleteModalProject.name.trim()
    ) {
      toast.error("Project name does not match");
      return;
    }

    setDeleting(true);
    try {
      const isDraft = deleteModalProject.status === "draft";
      const endpoint = isDraft
        ? `/api/projects/draft/${deleteModalProject.id}`
        : `/api/projects/${deleteModalProject.slug}`;

      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok)
        throw new Error(
          isDraft ? "Failed to delete draft" : "Failed to archive project",
        );

      toast.success(isDraft ? "Draft deleted" : "Project archived");

      setMyProjects((prev) =>
        prev.filter((p) => p.id !== deleteModalProject.id),
      );
      setDrafts((prev) => prev.filter((p) => p.id !== deleteModalProject.id));
      setDeleteModalProject(null);
      setDeleteConfirmInput("");

      if (isDraft && draftLimitInfo) {
        setDraftLimitInfo((prev) =>
          prev ? { ...prev, count: Math.max(0, prev.count - 1) } : null,
        );
      }
    } catch (e: any) {
      toast.error(e.message || "Action failed");
    } finally {
      setDeleting(false);
    }
  };

  const sortedProjects = useMemo(() => {
    return [...myProjects].sort((a, b) => {
      if (sortOption === "created")
        return (
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
        );
      if (sortOption === "name") return a.name.localeCompare(b.name);
      if (sortOption === "stage")
        return (a.stage || "").localeCompare(b.stage || "");
      return (
        new Date(
          b.last_activity_at || b.updated_at || b.created_at || 0,
        ).getTime() -
        new Date(
          a.last_activity_at || a.updated_at || a.created_at || 0,
        ).getTime()
      );
    });
  }, [myProjects, sortOption]);

  const filteredByStatus = useMemo(() => {
    if (quickStatus === "all") return sortedProjects;
    if (quickStatus === "active")
      return sortedProjects.filter(
        (p) => p.status !== "archived" && p.status !== "completed",
      );
    if (quickStatus === "completed")
      return sortedProjects.filter((p) => p.status === "completed");
    if (quickStatus === "archived")
      return sortedProjects.filter((p) => p.status === "archived");
    return sortedProjects;
  }, [sortedProjects, quickStatus]);

  const statusCounts = useMemo(
    () => ({
      all: sortedProjects.length,
      active: sortedProjects.filter(
        (p) => p.status !== "archived" && p.status !== "completed",
      ).length,
      completed: sortedProjects.filter((p) => p.status === "completed").length,
      archived: sortedProjects.filter((p) => p.status === "archived").length,
    }),
    [sortedProjects],
  );

  const sections = useMemo(() => {
    const actively_building = filteredByStatus.filter((p) => {
      const activeStages = [
        "idea",
        "planning",
        "prototype",
        "development",
        "building",
        "testing",
        "mvp",
      ];
      return (
        activeStages.includes(p.stage || "") &&
        p.status !== "archived" &&
        p.status !== "completed"
      );
    });

    const research_and_experiments = filteredByStatus.filter((p) => {
      const isResearch =
        p.project_type === "research" ||
        p.project_type === "experiment" ||
        p.stage === "research";
      return isResearch && !actively_building.some((x) => x.id === p.id);
    });

    const open_source = filteredByStatus.filter((p) => {
      return (
        p.is_open_source &&
        !actively_building.some((x) => x.id === p.id) &&
        !research_and_experiments.some((x) => x.id === p.id)
      );
    });

    const shownIds = new Set([
      ...actively_building.map((p) => p.id),
      ...research_and_experiments.map((p) => p.id),
      ...open_source.map((p) => p.id),
    ]);

    const other = filteredByStatus.filter((p) => !shownIds.has(p.id));

    return { actively_building, research_and_experiments, open_source, other };
  }, [filteredByStatus]);

  const firstName =
    user?.profile?.full_name?.split(" ")[0] ||
    user?.user_metadata?.full_name?.split(" ")[0] ||
    "Builder";

  return (
    <div className="flex-1 min-h-screen bg-[#050505] text-white pb-24 font-sans w-full antialiased selection:bg-[#38bdf8] selection:text-black">
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8 pt-10 w-full">
        {/* ── HEADER ────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="text-[32px] sm:text-[38px] font-extrabold tracking-tight text-white leading-tight">
              {greeting()},{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#38bdf8] to-[#818cf8]">
                {firstName}.
              </span>
            </h1>
            <p className="text-[14.5px] text-zinc-400 mt-2 font-medium max-w-lg leading-relaxed">
              Manage your engineering projects, track milestones, and showcase
              your open source contributions.
            </p>
          </div>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="group relative inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full bg-white text-black text-[14px] font-bold transition-all hover:scale-[1.02] active:scale-95 shrink-0 shadow-[0_0_20px_rgba(255,255,255,0.1)] overflow-hidden cursor-pointer"
          >
            <Plus size={16} weight="bold" /> New Project
          </button>
        </div>

        {/* ── TABS ─────────────────────────────────────── */}
        <div className="mb-10 flex gap-2 overflow-x-auto scrollbar-hide p-1 bg-white/[0.02] border border-white/[0.05] rounded-xl w-fit">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabId)}
                className={cn(
                  "px-5 py-2 rounded-lg text-[13px] font-semibold transition-all whitespace-nowrap outline-none cursor-pointer",
                  active
                    ? "bg-white/[0.08] text-white shadow-sm border border-white/[0.05]"
                    : "bg-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02] border border-transparent",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── DRAFT LIMIT WARNING BANNER ─────────────────── */}
        {draftLimitInfo && draftLimitInfo.count >= 8 && (
          <div className="mb-8 px-5 py-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-center gap-3 backdrop-blur-md">
            <WarningCircle size={20} weight="fill" className="text-amber-400" />
            <p className="text-[14px] text-amber-200/80 font-medium">
              {draftLimitInfo.count >= draftLimitInfo.limit ? (
                <>
                  Draft limit reached ({draftLimitInfo.count}/
                  {draftLimitInfo.limit}). Publish or delete an existing draft
                  to create new ones.
                </>
              ) : (
                <>
                  You have {draftLimitInfo.count} of {draftLimitInfo.limit}{" "}
                  active draft projects.
                </>
              )}
            </p>
          </div>
        )}

        {/* ── MY PROJECTS TAB ───────────────────────────── */}
        {activeTab === "my-projects" && (
          <div className="flex flex-col gap-12 w-full min-w-0">
            {/* Drafts Strip */}
            {drafts.length > 0 && (
              <section className="w-full">
                <h2 className="text-[13px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  Drafts{" "}
                  <span className="bg-white/10 text-white px-2 py-0.5 rounded-full text-[10px]">
                    {drafts.length}
                  </span>
                </h2>
                <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                  {drafts.map((d) => (
                    <ProjectDraftCard
                      key={d.id}
                      project={d}
                      onDeleteRequest={setDeleteModalProject}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Active Projects Area */}
            <section className="flex flex-col gap-8 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Segmented Control Filter */}
                <div className="flex items-center gap-1">
                  {(
                    ["all", "active", "completed", "archived"] as QuickStatus[]
                  ).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setQuickStatus(tab)}
                      className={cn(
                        "px-4 py-2 rounded-full text-[13px] font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap border cursor-pointer",
                        quickStatus === tab
                          ? "bg-white text-black border-white"
                          : "bg-transparent text-zinc-500 hover:text-zinc-300 border-transparent hover:bg-white/[0.04]",
                      )}
                    >
                      <span className="capitalize">{tab}</span>
                      {statusCounts[tab] > 0 && (
                        <span
                          className={cn(
                            "text-[11px] font-mono",
                            quickStatus === tab
                              ? "text-zinc-600"
                              : "text-zinc-500",
                          )}
                        >
                          {statusCounts[tab]}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Modern Sort Dropdown */}
                <div className="relative shrink-0">
                  <button
                    onClick={() => setSortOpen(!sortOpen)}
                    className="flex items-center gap-2 text-[13px] font-semibold text-white bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] px-4 py-2.5 rounded-xl transition-all h-full cursor-pointer"
                  >
                    Sort:{" "}
                    <span className="text-zinc-400 capitalize">
                      {sortOption.replace("-", " ")}
                    </span>
                    <CaretDown
                      size={14}
                      weight="bold"
                      className="text-zinc-500"
                    />
                  </button>

                  {sortOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setSortOpen(false)}
                      />
                      <div className="absolute right-0 top-full mt-2 w-48 bg-[#121215] border border-white/[0.1] rounded-2xl shadow-2xl z-20 py-2 backdrop-blur-xl">
                        {[
                          { id: "updated", label: "Last updated" },
                          { id: "created", label: "Recently created" },
                          { id: "name", label: "Name (A–Z)" },
                          { id: "stage", label: "Stage" },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => {
                              setSortOption(opt.id as SortOption);
                              setSortOpen(false);
                            }}
                            className={cn(
                              "w-full text-left px-4 py-2.5 text-[13px] transition-colors flex items-center justify-between cursor-pointer",
                              sortOption === opt.id
                                ? "bg-white/[0.06] text-white font-semibold"
                                : "text-zinc-400 hover:text-white hover:bg-white/[0.03]",
                            )}
                          >
                            {opt.label}
                            {sortOption === opt.id && (
                              <CheckCircle
                                size={14}
                                className="text-[#38bdf8]"
                              />
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Loader / Empty / Content */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-[90px] rounded-xl bg-white/[0.02] border border-white/[0.04] p-3.5 animate-pulse flex gap-3.5 w-full items-center"
                    >
                      <div className="w-11 h-11 rounded-lg bg-white/[0.04]" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-36 bg-white/[0.04] rounded" />
                        <div className="h-3 w-48 bg-white/[0.04] rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="p-10 border border-red-500/20 bg-red-500/5 rounded-2xl text-center space-y-3 w-full">
                  <WarningCircle
                    size={32}
                    weight="fill"
                    className="text-red-400 mx-auto"
                  />
                  <h3 className="text-[17px] font-semibold text-white">
                    Unable to load projects
                  </h3>
                  <button
                    onClick={loadWorkspaceData}
                    className="px-5 py-2.5 mt-2 bg-white text-black rounded-full text-[13.5px] font-semibold hover:bg-zinc-200 transition-colors cursor-pointer"
                  >
                    Try again
                  </button>
                </div>
              ) : filteredByStatus.length === 0 ? (
                <div className="p-16 border border-white/[0.05] rounded-3xl bg-gradient-to-b from-white/[0.02] to-transparent text-center w-full">
                  <div className="w-16 h-16 bg-white/[0.03] border border-white/[0.08] rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                    <RocketLaunch size={24} className="text-zinc-500" />
                  </div>
                  <h3 className="text-[20px] font-semibold text-white tracking-tight">
                    No projects found
                  </h3>
                  <p className="text-[14.5px] text-zinc-500 mt-2 mb-8 max-w-sm mx-auto">
                    {quickStatus === "all"
                      ? "You haven't started any projects yet. Time to build something amazing."
                      : `No ${quickStatus} projects available.`}
                  </p>
                  {quickStatus === "all" ? (
                    <button
                      onClick={() => setCreateModalOpen(true)}
                      className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-white text-black hover:bg-zinc-200 text-[14px] font-bold transition-transform hover:scale-105 cursor-pointer"
                    >
                      <Plus size={16} weight="bold" /> Start Building
                    </button>
                  ) : (
                    <button
                      onClick={() => setQuickStatus("all")}
                      className="text-[14px] font-semibold text-zinc-400 hover:text-white underline underline-offset-4 cursor-pointer"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-10 w-full min-w-0">
                  <ProjectSectionRow
                    title="Actively Building"
                    projects={sections.actively_building}
                    onDeleteRequest={setDeleteModalProject}
                  />
                  <ProjectSectionRow
                    title="Research & Experiments"
                    projects={sections.research_and_experiments}
                    onDeleteRequest={setDeleteModalProject}
                  />
                  <ProjectSectionRow
                    title="Open Source"
                    projects={sections.open_source}
                    onDeleteRequest={setDeleteModalProject}
                  />
                  <ProjectSectionRow
                    title="Other Projects"
                    projects={sections.other}
                    onDeleteRequest={setDeleteModalProject}
                  />
                </div>
              )}
            </section>
          </div>
        )}

        {/* ── EXPLORE TAB ──────────────────────────────── */}
        {activeTab === "explore" && (
          <div className="pt-2">
            <ProjectExplorePage />
          </div>
        )}

        {/* ── 🎯 FOLLOWING TAB (COMPACT 3-COLUMN GRID) ── */}
        {activeTab === "following" && (
          <div className="w-full">
            {followingProjects.length === 0 ? (
              <div className="rounded-3xl border border-white/[0.06] p-16 text-center bg-gradient-to-b from-white/[0.02] to-transparent max-w-4xl mx-auto mt-6">
                <div className="w-16 h-16 bg-white/[0.03] border border-white/[0.08] rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                  <Heart size={24} weight="regular" className="text-zinc-400" />
                </div>
                <h3 className="text-[20px] font-semibold text-white mb-2 tracking-tight">
                  Not following any projects
                </h3>
                <p className="text-[14.5px] text-zinc-500 mb-8 max-w-md mx-auto">
                  Follow projects in Explore to track their updates and
                  milestones directly in your feed.
                </p>
                <button
                  onClick={() => setActiveTab("explore")}
                  className="inline-flex items-center h-11 px-6 rounded-full bg-white text-black hover:bg-zinc-200 text-[14px] font-bold transition-transform hover:scale-105 shadow-md cursor-pointer"
                >
                  Explore projects
                </button>
              </div>
            ) : (
              <div className="space-y-6 w-full">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[16px] font-bold text-white tracking-tight flex items-center gap-2">
                    Projects You Follow
                    <span className="text-[12px] font-semibold text-zinc-400 bg-white/[0.05] border border-white/10 px-2.5 py-0.5 rounded-full">
                      {followingProjects.length}
                    </span>
                  </h2>
                </div>
                {/* 🎯 SLEEK COMPACT 3-COLUMN GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 w-full">
                  {followingProjects.map((p) => (
                    <ProjectCompactCard
                      key={p.id}
                      project={p}
                      onDeleteRequest={setDeleteModalProject}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── APPLICATIONS TAB ─────────────────────────── */}
        {activeTab === "applications" && (
          <div className="rounded-3xl border border-white/[0.06] p-16 text-center bg-gradient-to-b from-white/[0.02] to-transparent max-w-4xl mx-auto mt-6">
            <div className="w-16 h-16 bg-white/[0.03] border border-white/[0.08] rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
              <Briefcase size={24} weight="regular" className="text-zinc-400" />
            </div>
            <h3 className="text-[20px] font-semibold text-white mb-2 tracking-tight">
              Applications Workspace
            </h3>
            <p className="text-[14.5px] text-zinc-500 mb-8 max-w-md mx-auto">
              Applications and hiring are managed via the canonical Looking For
              system.
            </p>
            <Link
              href="/looking-for"
              className="inline-flex items-center h-11 px-6 rounded-full bg-white text-black hover:bg-zinc-200 text-[14px] font-bold transition-transform hover:scale-105 shadow-md cursor-pointer"
            >
              Open Looking For
            </Link>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteModalProject && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setDeleteModalProject(null)}
        >
          <div
            className="bg-[#0d0d10] border border-white/[0.12] rounded-2xl w-full max-w-md overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[18px] font-bold text-white tracking-tight">
              {deleteModalProject.status === "draft"
                ? "Delete Draft"
                : "Archive Project"}
            </h3>
            <p className="text-[14px] text-zinc-400">
              {deleteModalProject.status === "draft"
                ? `Permanently delete draft "${deleteModalProject.name}"?`
                : `Archive "${deleteModalProject.name}"? It will be hidden from Explore.`}
            </p>
            <input
              type="text"
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              placeholder={`Type "${deleteModalProject.name}"`}
              className="w-full h-11 px-4 bg-white/[0.03] border border-white/[0.12] rounded-xl text-[14px] text-white focus:outline-none focus:border-red-500/50 transition-colors"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setDeleteModalProject(null);
                  setDeleteConfirmInput("");
                }}
                className="px-5 h-10 text-[14px] font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={
                  deleting ||
                  deleteConfirmInput.trim() !== deleteModalProject.name.trim()
                }
                className="px-5 h-10 bg-red-500 text-white font-bold rounded-xl text-[14px] disabled:opacity-50 transition-colors flex items-center gap-2 hover:bg-red-600 cursor-pointer"
              >
                {deleting ? (
                  <>
                    <CircleNotch size={14} className="animate-spin" />{" "}
                    Processing
                  </>
                ) : (
                  "Confirm"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
  );
}

/* 🎯 COMPACT SLEEK CARD FOR FOLLOWING LIST */
function ProjectCompactCard({
  project,
  onDeleteRequest,
}: {
  project: Project;
  onDeleteRequest: (v: Project) => void;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleCardClick = () => router.push(`/projects/${project.slug}`);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(
      `${window.location.origin}/projects/${project.slug}`,
    );
    toast.success("Link copied");
    setMenuOpen(false);
  };

  const logoImg = project.logo_url || project.cover_image_url || null;

  return (
    <div
      onClick={handleCardClick}
      className="group relative bg-[#0d0d10] border border-white/[0.08] hover:border-white/[0.18] rounded-xl p-3.5 flex items-center gap-3.5 cursor-pointer transition-all hover:bg-white/[0.02] shadow-sm w-full"
    >
      {/* Sleek Square Logo */}
      <div className="w-11 h-11 rounded-lg border border-white/[0.08] bg-zinc-900 overflow-hidden flex-shrink-0 flex items-center justify-center">
        {logoImg ? (
          <img src={logoImg} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-[12px] font-bold text-zinc-400">
            {(project.name || "?").slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[14px] font-semibold text-white truncate group-hover:text-[#38bdf8] transition-colors">
            {project.name}
          </h3>

          <div className="relative shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className="w-6 h-6 rounded text-zinc-500 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors cursor-pointer"
            >
              <DotsThree size={18} weight="bold" />
            </button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                  }}
                />
                <div className="absolute right-0 top-full mt-1 z-40 w-40 bg-[#121215] border border-white/[0.1] rounded-xl shadow-2xl p-1.5 backdrop-blur-xl">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/projects/${project.slug}`);
                    }}
                    className="w-full text-left px-3 py-1.5 text-[12.5px] font-medium text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer"
                  >
                    Open project
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="w-full text-left px-3 py-1.5 text-[12.5px] font-medium text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer"
                  >
                    Copy link
                  </button>
                  <div className="h-px bg-white/[0.06] my-1" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onDeleteRequest(project);
                    }}
                    className="w-full text-left px-3 py-1.5 text-[12.5px] font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                  >
                    Archive
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {project.short_description || project.tagline ? (
          <p className="text-[12px] text-zinc-400 truncate mt-0.5">
            {project.tagline || project.short_description}
          </p>
        ) : null}

        <div className="mt-1.5 flex items-center gap-2.5 text-[11px] text-zinc-500 font-medium">
          <span className="flex items-center gap-1">
            <Clock size={12} />{" "}
            {timeAgo(project.updated_at || project.created_at)}
          </span>
          {project.stage && (
            <span className="capitalize bg-white/[0.04] px-1.5 py-0.5 rounded text-zinc-400 text-[10px]">
              {project.stage.replace("-", " ")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ProjectHorizontalCard({
  project,
  onDeleteRequest,
}: {
  project: Project;
  onDeleteRequest: (v: Project) => void;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleCardClick = () => router.push(`/projects/${project.slug}`);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(
      `${window.location.origin}/projects/${project.slug}`,
    );
    toast.success("Link copied");
    setMenuOpen(false);
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.15] hover:bg-white/[0.03] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row gap-5 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-[#38bdf8]/5 w-full overflow-hidden hover:-translate-y-0.5"
    >
      {/* Premium 16:9 Thumbnail */}
      <div className="w-full sm:w-[220px] h-[140px] sm:h-[120px] rounded-xl bg-[#09090b] border border-white/[0.08] overflow-hidden flex-shrink-0 relative">
        {project.cover_image_url ? (
          <img
            src={project.cover_image_url}
            alt=""
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-900/50">
            <Wrench size={32} weight="duotone" className="text-zinc-700" />
          </div>
        )}

        {/* Overlaid Logo */}
        {project.logo_url && (
          <div className="absolute bottom-2 left-2 w-10 h-10 rounded-lg border border-white/[0.15] shadow-lg bg-[#0d0d10] overflow-hidden z-10">
            <img
              src={project.logo_url}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
        <div className="flex items-start justify-between gap-4 mb-1.5">
          <div className="min-w-0">
            <h3 className="text-[17px] font-bold text-white truncate group-hover:text-[#38bdf8] transition-colors tracking-tight flex items-center gap-1.5">
              {project.name}
              {project.is_dsrt_verified && (
                <CheckCircle
                  size={14}
                  weight="fill"
                  className="text-[#38bdf8] shrink-0"
                />
              )}
            </h3>
            {project.tagline && (
              <p className="text-[13px] font-medium text-zinc-400 truncate mt-0.5">
                {project.tagline}
              </p>
            )}
          </div>

          <div className="relative shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className="w-8 h-8 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.08] flex items-center justify-center transition-colors cursor-pointer"
            >
              <DotsThree size={24} weight="bold" />
            </button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                  }}
                />
                <div className="absolute right-0 top-full mt-2 z-40 w-44 bg-[#121215] border border-white/[0.1] rounded-xl shadow-2xl p-1.5 backdrop-blur-xl">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/projects/${project.slug}`);
                    }}
                    className="w-full text-left px-3 py-2 text-[13px] font-medium text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer"
                  >
                    Open project
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/projects/${project.slug}?tab=settings`);
                    }}
                    className="w-full text-left px-3 py-2 text-[13px] font-medium text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer"
                  >
                    Settings
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="w-full text-left px-3 py-2 text-[13px] font-medium text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer"
                  >
                    Copy link
                  </button>
                  <div className="h-px bg-white/[0.06] my-1" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onDeleteRequest(project);
                    }}
                    className="w-full text-left px-3 py-2 text-[13px] font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                  >
                    Archive
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {project.short_description && !project.tagline && (
          <p className="text-[13px] text-zinc-500 line-clamp-1 mb-2 font-medium">
            {project.short_description}
          </p>
        )}

        <div className="mt-3 flex items-center gap-4 text-[12px] text-zinc-500 font-medium">
          <span className="flex items-center gap-1.5">
            <Clock size={14} />{" "}
            {timeAgo(project.updated_at || project.created_at)}
          </span>
          {project.stage && (
            <span className="capitalize bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.08] text-zinc-400">
              {project.stage.replace("-", " ")}
            </span>
          )}
          {project.is_open_source && (
            <span className="flex items-center gap-1.5 text-zinc-400">
              <GitBranch size={14} /> OSS
            </span>
          )}
        </div>
      </div>

      {/* Subtle hover arrow */}
      <div className="hidden lg:flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:-translate-x-2 transition-all duration-300 text-zinc-500">
        <ArrowRight size={20} />
      </div>
    </div>
  );
}

function ProjectDraftCard({
  project,
  onDeleteRequest,
}: {
  project: Project;
  onDeleteRequest: (v: Project) => void;
}) {
  const router = useRouter();
  return (
    <div
      onClick={() => router.push(`/projects/create?continue=${project.slug}`)}
      className="w-[280px] flex-shrink-0 bg-gradient-to-br from-white/[0.03] to-transparent border border-white/[0.08] hover:border-white/[0.2] rounded-2xl p-5 cursor-pointer transition-all shadow-sm hover:shadow-xl hover:-translate-y-1 relative group"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-white/[0.05] px-2.5 py-1 rounded-full border border-white/[0.08]">
          Draft
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteRequest(project);
          }}
          className="w-7 h-7 rounded-full text-zinc-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
        >
          <Wrench size={14} weight="fill" />
        </button>
      </div>
      <h4 className="text-[16px] font-bold text-white truncate mb-1">
        {project.name || "Untitled Project"}
      </h4>
      <p className="text-[13px] text-zinc-500 font-medium">
        Edited {timeAgo(project.updated_at || project.created_at)}
      </p>
    </div>
  );
}

function ProjectSectionRow({ title, projects, onDeleteRequest }: any) {
  if (projects.length === 0) return null;
  return (
    <section className="w-full">
      <div className="flex items-center gap-3 mb-5">
        <h2 className="text-[16px] font-bold text-white tracking-tight">
          {title}
        </h2>
        <span className="text-[12px] font-semibold text-zinc-500 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">
          {projects.length}
        </span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full">
        {projects.map((p: any) => (
          <ProjectHorizontalCard
            key={p.id}
            project={p}
            onDeleteRequest={onDeleteRequest}
          />
        ))}
      </div>
    </section>
  );
}
