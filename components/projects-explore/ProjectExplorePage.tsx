"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  MagnifyingGlass,
  Compass,
  X,
  FunnelSimple,
} from "@phosphor-icons/react";

import { ProjectFeaturedCarousel } from "./ProjectFeaturedCarousel";
import { ProjectFilterSidebar } from "./ProjectFilterSidebar";
import { ProjectCard } from "./ProjectCard";
import { ProjectMobileFilterDrawer } from "./ProjectMobileFilterDrawer";
import { ProjectSortDropdown } from "./ProjectSortDropdown";

import { useProjectExploreUrlState } from "@/hooks/useProjectExploreUrlState";
import { useProjectInfiniteFeed } from "@/hooks/useProjectInfiniteFeed";
import { getProjectAffinityLearner } from "@/lib/project-explore/affinity-learner";
import {
  DsrtInput,
  DsrtButton,
  DsrtTabs,
  DsrtEmpty,
  DsrtCardSkeleton,
  DsrtChip,
  DsrtLayoutWithRail,
} from "@/components/dsrt";

const DISCOVERY_TABS = [
  { value: "recommended", label: "Recommended" },
  { value: "all", label: "All Projects" },
  { value: "rising", label: "Rising" },
  { value: "new", label: "New" },
];

export function ProjectExplorePage() {
  const { filters, activeTab, setFilters, setActiveTab, clearFilters } =
    useProjectExploreUrlState();

  const [banners, setBanners] = useState<any[]>([]);
  const [searchInput, setSearchInput] = useState(filters.search || "");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    setSearchInput(filters.search || "");
  }, [filters.search]);

  useEffect(() => {
    fetch("/api/projects/explore/banners")
      .then((r) => r.json())
      .then((d) => setBanners(d.banners || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const flush = () => getProjectAffinityLearner().flushImmediate();
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });
    return () => window.removeEventListener("beforeunload", flush);
  }, []);

  const fetcher = useCallback(
    async (cursor?: string) => {
      const params = new URLSearchParams();
      const sid = getProjectAffinityLearner().getSessionId();
      if (sid) params.set("session_id", sid);

      if (filters.search) params.set("q", filters.search);
      if (filters.domains?.length)
        params.set("domain", filters.domains.join(","));
      if (filters.technologies?.length)
        params.set("tech", filters.technologies.join(","));
      if (filters.stages?.length) params.set("stage", filters.stages.join(","));
      if (filters.project_types?.length)
        params.set("ptype", filters.project_types.join(","));
      if (filters.locations?.length)
        params.set("location", filters.locations.join(","));
      if (filters.licenses?.length)
        params.set("license", filters.licenses.join(","));
      if (filters.is_open_source) params.set("oss", "1");
      if (filters.is_hiring) params.set("hiring", "1");
      if (filters.is_looking_for_collaborators) params.set("collab", "1");
      if (filters.is_verified) params.set("verified", "1");
      if (filters.is_newly_launched) params.set("fresh", "1");
      if (filters.has_repository) params.set("repo", "1");
      if (filters.sort && filters.sort !== "recommended")
        params.set("sort", filters.sort);
      params.set("ptab", activeTab);
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(
        `/api/projects/explore/feed?${params.toString()}`,
      );
      if (!res.ok) throw new Error("Failed to load project feed");
      return await res.json();
    },
    [filters, activeTab],
  );

  const { modules, loading, loadingMore, error, sentinelRef, removeItem } =
    useProjectInfiniteFeed({
      fetcher,
      deps: [
        filters.search,
        filters.domains?.join(","),
        filters.technologies?.join(","),
        filters.stages?.join(","),
        filters.project_types?.join(","),
        filters.locations?.join(","),
        filters.licenses?.join(","),
        filters.is_open_source,
        filters.is_hiring,
        filters.is_looking_for_collaborators,
        filters.is_verified,
        filters.is_newly_launched,
        filters.has_repository,
        filters.sort,
        activeTab,
      ],
    });

  const executeSearch = () => setFilters({ ...filters, search: searchInput });
  const clearSearch = () => {
    setSearchInput("");
    setFilters({ ...filters, search: "" });
  };

  const isFiltered = !!(
    filters.search ||
    filters.domains?.length ||
    filters.technologies?.length ||
    filters.stages?.length ||
    filters.project_types?.length ||
    filters.locations?.length ||
    filters.licenses?.length ||
    filters.is_open_source ||
    filters.is_hiring ||
    filters.is_looking_for_collaborators ||
    filters.is_verified ||
    filters.is_newly_launched ||
    filters.has_repository
  );

  const activeFilterChips = useMemo(() => {
    const chips: { label: string; remove: () => void }[] = [];

    (filters.domains || []).forEach((d) =>
      chips.push({
        label: d,
        remove: () =>
          setFilters({
            ...filters,
            domains: filters.domains?.filter((x) => x !== d),
          }),
      }),
    );
    (filters.technologies || []).forEach((t) =>
      chips.push({
        label: t,
        remove: () =>
          setFilters({
            ...filters,
            technologies: filters.technologies?.filter((x) => x !== t),
          }),
      }),
    );
    (filters.stages || []).forEach((s) =>
      chips.push({
        label: `Stage: ${s}`,
        remove: () =>
          setFilters({
            ...filters,
            stages: filters.stages?.filter((x) => x !== s),
          }),
      }),
    );
    (filters.project_types || []).forEach((t) =>
      chips.push({
        label: `Type: ${t}`,
        remove: () =>
          setFilters({
            ...filters,
            project_types: filters.project_types?.filter((x) => x !== t),
          }),
      }),
    );
    (filters.licenses || []).forEach((l) =>
      chips.push({
        label: `License: ${l}`,
        remove: () =>
          setFilters({
            ...filters,
            licenses: filters.licenses?.filter((x) => x !== l),
          }),
      }),
    );
    (filters.locations || []).forEach((loc) =>
      chips.push({
        label: loc,
        remove: () =>
          setFilters({
            ...filters,
            locations: filters.locations?.filter((x) => x !== loc),
          }),
      }),
    );

    if (filters.is_open_source)
      chips.push({
        label: "Open source",
        remove: () => setFilters({ ...filters, is_open_source: false }),
      });
    if (filters.is_looking_for_collaborators)
      chips.push({
        label: "Collaborators",
        remove: () =>
          setFilters({ ...filters, is_looking_for_collaborators: false }),
      });
    if (filters.is_hiring)
      chips.push({
        label: "Hiring",
        remove: () => setFilters({ ...filters, is_hiring: false }),
      });
    if (filters.is_verified)
      chips.push({
        label: "Verified",
        remove: () => setFilters({ ...filters, is_verified: false }),
      });
    if (filters.is_newly_launched)
      chips.push({
        label: "Newly launched",
        remove: () => setFilters({ ...filters, is_newly_launched: false }),
      });
    if (filters.has_repository)
      chips.push({
        label: "Has repository",
        remove: () => setFilters({ ...filters, has_repository: false }),
      });

    return chips;
  }, [filters, setFilters]);

  const primaryModule = modules[0];

  return (
    <div className="space-y-6 w-full">
      <div className="space-y-4 pt-2">
        <DsrtInput
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && executeSearch()}
          placeholder="Search projects, PyTorch, robotics, open source, research..."
          icon={<MagnifyingGlass size={16} />}
          sizeVariant="lg"
          rightSlot={
            <div className="flex items-center gap-1">
              {searchInput && (
                <button
                  onClick={clearSearch}
                  className="p-1 text-white/40 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
              <DsrtButton size="xs" variant="primary" onClick={executeSearch}>
                Search
              </DsrtButton>
            </div>
          }
        />

        {activeFilterChips.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">
              Active:
            </span>
            {activeFilterChips.map((chip, i) => (
              <DsrtChip key={i} onRemove={chip.remove} tone="accent" size="sm">
                {chip.label}
              </DsrtChip>
            ))}
            <button
              onClick={clearFilters}
              className="text-[11px] font-mono text-white/50 hover:text-white underline ml-1"
            >
              Clear all
            </button>
          </div>
        )}

        {/* 🎯 ফিক্সড: ব্যানার এখন সবগুলো ট্যাবে এবং ফিল্টারিং করলেও সবসময় ওপরে দৃশ্যমান থাকবে */}
        <div className="rounded-2xl overflow-hidden border border-white/[0.08] shadow-lg">
          <ProjectFeaturedCarousel banners={banners} />
        </div>
      </div>

      <DsrtLayoutWithRail
        railPosition="left"
        railBreakpoint="lg"
        rail={
          <ProjectFilterSidebar
            filters={filters}
            onFilterChange={setFilters}
            onClearFilters={clearFilters}
          />
        }
      >
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
            <div>
              <h3 className="text-[16px] font-semibold text-white tracking-tight">
                {primaryModule?.title || "Explore Projects"}
              </h3>
              {primaryModule?.subtitle && (
                <p className="text-[12px] text-white/50 mt-0.5">
                  {primaryModule.subtitle}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 flex-wrap">
              <DsrtTabs
                variant="segmented"
                tabs={DISCOVERY_TABS}
                activeValue={activeTab}
                onValueChange={(val) => setActiveTab(val)}
              />

              <div className="flex items-center gap-2">
                <ProjectSortDropdown
                  value={filters.sort || "recommended"}
                  onChange={(v) => setFilters({ ...filters, sort: v as any })}
                />

                <DsrtButton
                  size="sm"
                  variant="outline"
                  className="lg:hidden"
                  onClick={() => setMobileFiltersOpen(true)}
                >
                  <FunnelSimple size={14} />
                  Filters
                  {activeFilterChips.length > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/20 text-white">
                      {activeFilterChips.length}
                    </span>
                  )}
                </DsrtButton>
              </div>
            </div>
          </div>

          {loading ? (
            <DsrtCardSkeleton count={6} />
          ) : error ? (
            <DsrtEmpty title="Something went wrong" description={error} />
          ) : modules.length === 0 ||
            modules.every((m) => m.items.length === 0) ? (
            <DsrtEmpty
              icon={Compass}
              title="No projects match these filters"
              description="Try broadening your search criteria or clearing filters."
              action={
                <DsrtButton variant="outline" onClick={clearFilters}>
                  Clear all filters
                </DsrtButton>
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {modules
                  .flatMap((m) => m.items)
                  .map((project, idx) => (
                    <ProjectCard
                      key={`${project.id}-${idx}`}
                      project={project}
                      position={idx}
                      moduleType={modules[0]?.type}
                      onNotInterested={removeItem}
                    />
                  ))}
              </div>

              <div
                ref={sentinelRef}
                className="py-8 flex items-center justify-center min-h-[60px]"
              >
                {loadingMore && (
                  <span className="text-[11px] font-mono uppercase tracking-wider text-white/40 flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Discovering more projects...
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </DsrtLayoutWithRail>

      <ProjectMobileFilterDrawer
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        filters={filters}
        onFilterChange={setFilters}
        onClearFilters={clearFilters}
        activeCount={activeFilterChips.length}
      />
    </div>
  );
}
