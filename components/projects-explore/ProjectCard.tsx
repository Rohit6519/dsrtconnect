"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DotsThree,
  MapPin,
  Users,
  CheckCircle,
  EyeSlash,
  BookmarkSimple,
  GitBranch,
  ShareNetwork,
  Plus,
  Check,
  UserPlus,
  UserCheck,
} from "@phosphor-icons/react";
import { ExploreProjectCard } from "@/lib/project-explore/types";
import { getProjectAffinityLearner } from "@/lib/project-explore/affinity-learner";
import { DsrtPanel, DsrtAvatar, DsrtChip } from "@/components/dsrt";

interface ProjectCardProps {
  project: ExploreProjectCard;
  onNotInterested?: (id: string) => void;
  position?: number;
  moduleType?: string;
}

export function ProjectCard({
  project,
  onNotInterested,
  position = 0,
  moduleType,
}: ProjectCardProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(project.is_saved || false);
  const [isFollowing, setIsFollowing] = useState(project.is_following || false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const impressionFiredRef = useRef(false);
  const longViewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const domainSlugs = [
    ...(project.domains || []),
    ...(project.technologies || []),
    project.industry,
    project.sector,
  ]
    .filter(Boolean)
    .map((s) => (s as string).toLowerCase());

  useEffect(() => {
    if (!cardRef.current || impressionFiredRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !impressionFiredRef.current) {
          impressionFiredRef.current = true;

          fetch("/api/projects/explore/impression", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              project_id: project.id,
              module_type: moduleType || "recommended",
              position,
              session_id: getProjectAffinityLearner().getSessionId(),
            }),
            keepalive: true,
          }).catch(() => {});

          getProjectAffinityLearner().track({
            project_id: project.id,
            action: "view",
            domain_slugs: domainSlugs,
          });

          longViewTimerRef.current = setTimeout(() => {
            getProjectAffinityLearner().track({
              project_id: project.id,
              action: "long_view",
              domain_slugs: domainSlugs,
            });
          }, 3000);
        }

        if (!entry.isIntersecting && longViewTimerRef.current) {
          clearTimeout(longViewTimerRef.current);
          longViewTimerRef.current = null;
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(cardRef.current);
    return () => {
      observer.disconnect();
      if (longViewTimerRef.current) clearTimeout(longViewTimerRef.current);
    };
  }, [project.id, position, moduleType]);

  const handleCardClick = () => {
    getProjectAffinityLearner().track({
      project_id: project.id,
      action: "click",
      domain_slugs: domainSlugs,
    });
    router.push(`/projects/${project.slug}`);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/projects/${project.slug}`;
    await navigator.clipboard.writeText(url);
    toast.success("Project link copied");
    setMenuOpen(false);
    getProjectAffinityLearner().track({
      project_id: project.id,
      action: "share",
      domain_slugs: domainSlugs,
    });
  };

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const wasSaved = isSaved;
    setIsSaved(!wasSaved);

    try {
      await fetch("/api/projects/save", {
        method: wasSaved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: project.id }),
      });
      toast.success(wasSaved ? "Removed from saved" : "Saved to your library");

      if (!wasSaved) {
        getProjectAffinityLearner().track({
          project_id: project.id,
          action: "save",
          domain_slugs: domainSlugs,
        });
      }
    } catch {
      setIsSaved(wasSaved);
      toast.error("Could not update saved status");
    }
  };

  // 🎯 Follow / Unfollow Logic
  const handleToggleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFollowLoading) return;

    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setIsFollowLoading(true);

    try {
      const res = await fetch(`/api/projects/${project.slug}/follow`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to follow");

      toast.success(
        wasFollowing
          ? `Unfollowed ${project.name}`
          : `Following ${project.name}`,
      );

      if (!wasFollowing) {
        getProjectAffinityLearner().track({
          project_id: project.id,
          action: "click",
          domain_slugs: domainSlugs,
        });
      }
    } catch {
      setIsFollowing(wasFollowing);
      toast.error("Could not update follow status");
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleDismiss = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    onNotInterested?.(project.id);

    getProjectAffinityLearner().track({
      project_id: project.id,
      action: "dismiss",
      domain_slugs: domainSlugs,
    });

    try {
      await fetch("/api/projects/explore/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: project.id,
          reason: "not_relevant",
        }),
      });
      toast.info("Project hidden from recommendations");
    } catch {}
  };

  const domainTags = (project.domains || []).slice(0, 2);
  const techTags = (project.technologies || project.tech_stack || []).slice(
    0,
    3,
  );

  return (
    <DsrtPanel
      ref={cardRef as any}
      padding="none"
      variant="default"
      className="group cursor-pointer hover:border-white/[0.14] transition-all flex flex-col overflow-hidden relative"
      onClick={handleCardClick}
    >
      {/* Cover / Thumbnail */}
      <div className="relative w-full aspect-[16/9] bg-[#05070D] border-b border-white/[0.06] overflow-hidden">
        {project.cover_image_url ? (
          <img
            src={project.cover_image_url}
            alt={project.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-85 group-hover:opacity-100"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0f172a] to-[#0a0a0f]">
            <span className="text-3xl font-bold text-white/20">
              {project.name[0]?.toUpperCase()}
            </span>
          </div>
        )}

        {/* Logo overlay */}
        <div className="absolute bottom-3 left-3 w-10 h-10 rounded-xl bg-[#05070D] border border-white/[0.12] p-0.5 shadow-lg overflow-hidden z-10">
          {project.logo_url ? (
            <img
              src={project.logo_url}
              alt=""
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <div className="w-full h-full bg-white/[0.04] rounded-lg flex items-center justify-center text-xs font-bold text-white">
              {project.name[0]?.toUpperCase()}
            </div>
          )}
        </div>

        {project.reason_label && (
          <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md border border-white/10 text-[9px] font-mono text-white/80 uppercase tracking-wider z-10">
            {project.reason_label}
          </div>
        )}

        {/* Top-Right Save Button Only */}
        <div className="absolute top-2.5 right-2.5 z-20">
          <button
            type="button"
            onClick={handleToggleSave}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all backdrop-blur-md cursor-pointer ${
              isSaved
                ? "bg-amber-500 text-black border border-amber-400"
                : "bg-black/70 text-white hover:bg-white hover:text-black border border-white/20"
            }`}
            aria-label={isSaved ? "Unsave" : "Save"}
          >
            <BookmarkSimple size={14} weight={isSaved ? "fill" : "bold"} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h3 className="text-[15px] font-bold text-white truncate tracking-tight group-hover:text-[#38bdf8] transition-colors">
                  {project.name}
                </h3>
                {project.is_dsrt_verified && (
                  <CheckCircle
                    size={14}
                    weight="fill"
                    className="text-[#93c5fd] shrink-0"
                  />
                )}
              </div>
            </div>

            <div className="relative shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                className="w-7 h-7 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08] flex items-center justify-center transition-colors"
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
                  <div className="absolute right-0 top-full mt-1 z-40 w-44 bg-[#0a0f1a] border border-white/[0.1] rounded-xl shadow-2xl p-1 space-y-0.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCardClick();
                      }}
                      className="w-full text-left px-3 py-1.5 text-[12px] font-medium text-white/80 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
                    >
                      Open project
                    </button>
                    <button
                      type="button"
                      onClick={handleToggleFollow}
                      className="w-full text-left px-3 py-1.5 text-[12px] font-medium text-white/80 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      {isFollowing ? (
                        <UserCheck size={12} />
                      ) : (
                        <UserPlus size={12} />
                      )}
                      {isFollowing ? "Unfollow project" : "Follow project"}
                    </button>
                    <button
                      type="button"
                      onClick={handleShare}
                      className="w-full text-left px-3 py-1.5 text-[12px] font-medium text-white/80 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <ShareNetwork size={12} /> Share link
                    </button>
                    <div className="h-px bg-white/[0.06] my-1" />
                    <button
                      type="button"
                      onClick={handleDismiss}
                      className="w-full text-left px-3 py-1.5 text-[12px] font-medium text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <EyeSlash size={12} /> Not interested
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {(project.tagline || project.short_description) && (
            <p className="text-[12.5px] text-white/60 line-clamp-2 leading-relaxed">
              {project.tagline || project.short_description}
            </p>
          )}

          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            {domainTags.map((d, i) => (
              <DsrtChip key={`d-${i}`} size="sm" tone="accent">
                {d}
              </DsrtChip>
            ))}
            {project.stage && (
              <DsrtChip size="sm" tone="neutral">
                {project.stage}
              </DsrtChip>
            )}
            {project.location && (
              <span className="text-[10px] text-white/40 flex items-center gap-1">
                <MapPin size={10} /> {project.location.split(",")[0]}
              </span>
            )}
          </div>

          {techTags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap pt-0.5">
              {techTags.map((t, i) => (
                <span
                  key={`t-${i}`}
                  className="text-[10px] font-mono text-white/40 bg-white/[0.03] px-1.5 py-0.5 rounded border border-white/[0.04]"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 🎯 Footer: Founder Info + Badges + Follow Button */}
        <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-white/40 gap-2">
          {project.founder ? (
            <Link
              href={`/profile/${project.founder.username}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 hover:text-white transition-colors min-w-0"
            >
              <DsrtAvatar
                src={project.founder.avatar_url}
                name={project.founder.full_name}
                size="xs"
              />
              <span className="truncate text-zinc-300 font-medium">
                {project.founder.full_name}
              </span>
            </Link>
          ) : (
            <span className="flex items-center gap-1 font-mono">
              <Users size={12} /> {project.team_size || 1}
            </span>
          )}

          <div className="flex items-center gap-2 shrink-0">
            {project.is_open_source && (
              <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-white/70 font-mono text-[9px] border border-white/[0.08] hidden sm:flex items-center gap-1">
                <GitBranch size={9} /> OSS
              </span>
            )}

            {/* 🎯 Follow Button in Footer */}
            <button
              type="button"
              onClick={handleToggleFollow}
              disabled={isFollowLoading}
              className={`h-7 px-3 rounded-full flex items-center gap-1 text-[11.5px] font-semibold transition-all cursor-pointer ${
                isFollowing
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                  : "bg-white text-black hover:bg-zinc-200 border border-white"
              }`}
            >
              {isFollowing ? (
                <>
                  <Check size={12} weight="bold" /> Following
                </>
              ) : (
                <>
                  <Plus size={12} weight="bold" /> Follow
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </DsrtPanel>
  );
}
