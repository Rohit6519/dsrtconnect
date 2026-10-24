"use client";

import Link from "next/link";
import { User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { dsrtNavigation } from "@/components/nav/navConfig";
import { useActiveNav } from "@/hooks/useActiveNav";
import { DsrtAvatar } from "@/components/dsrt";
import { DsrtConnectLogo } from "@/components/ui/DsrtConnectLogo";

interface SidebarProps {
  user: any;
  badges: any;
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
}

export function Sidebar({
  user,
  badges,
  isCollapsed,
  isMobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const { activePrimary } = useActiveNav();

  const mainLinks = dsrtNavigation.filter((n) => n.group === "main");
  const openMicLinks = dsrtNavigation.filter((n) => n.group === "open_mic");
  const exploreLinks = dsrtNavigation.filter((n) => n.group === "explore");

  const renderNavGroup = (title: string, links: typeof dsrtNavigation) => (
    <div className="mb-3.5">
      {!isCollapsed && (
        <p className="text-[9.5px] font-mono font-bold uppercase tracking-widest text-white/30 px-3.5 mb-1.5">
          {title}
        </p>
      )}
      <nav className={cn("space-y-0.5", isCollapsed ? "px-2" : "px-2.5")}>
        {links.map((item) => {
          const isActive =
            activePrimary?.id === item.id ||
            (item.id === "open-mic" &&
              typeof window !== "undefined" &&
              window.location.pathname.startsWith("/open-mic"));
          const Icon = item.icon;
          const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={onCloseMobile}
              className={cn(
                "group relative flex items-center rounded-lg transition-all select-none",
                isCollapsed
                  ? "justify-center h-9 w-9 mx-auto"
                  : "justify-between px-3 py-2",
                isActive
                  ? "bg-white/[0.08] text-white font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  : "text-white/60 hover:bg-white/[0.04] hover:text-white font-medium",
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  weight="regular"
                  className={cn(
                    "w-[17px] h-[17px] flex-shrink-0 transition-colors",
                    isActive
                      ? "text-white"
                      : "text-white/60 group-hover:text-white",
                  )}
                >
                  {item.id === "coco" && !item.icon ? "C" : ""}
                </Icon>
                {!isCollapsed && (
                  <span className="text-[13px] tracking-tight truncate">
                    {item.label}
                  </span>
                )}
              </div>

              {!isCollapsed && badgeCount > 0 && (
                <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/10 text-white leading-none tabular-nums">
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              )}

              {isCollapsed && badgeCount > 0 && (
                <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#93c5fd] shadow-[0_0_8px_rgba(147,197,253,0.8)]" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  const navContent = (
    <>
      {/* Profile Card */}
      <div
        className={cn("mb-3 transition-all", isCollapsed ? "px-2" : "px-2.5")}
      >
        <Link
          href={`/profile/${user?.username}`}
          onClick={onCloseMobile}
          className={cn(
            "flex items-center gap-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.06] hover:border-white/[0.08] transition-colors",
            isCollapsed ? "justify-center p-1.5" : "p-2.5",
          )}
          title={isCollapsed ? user?.full_name : undefined}
        >
          <DsrtAvatar
            src={user?.avatar_url}
            name={user?.full_name || user?.username}
            size={isCollapsed ? "xs" : "sm"}
            className="shrink-0"
          />
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-white truncate leading-tight tracking-tight">
                {user?.full_name || "Builder"}
              </p>
              <p className="text-[10.5px] text-[#93c5fd] font-mono truncate mt-0.5">
                {user?.tagline || "Builder"}
              </p>
            </div>
          )}
        </Link>
      </div>

      {renderNavGroup("MAIN", mainLinks)}
      {renderNavGroup("COCO", openMicLinks)}
      {renderNavGroup("EXPLORE", exploreLinks)}

      <div className="mt-auto pt-2">
        <div
          className={cn(
            "border-t border-white/[0.06] pt-2",
            isCollapsed ? "px-2" : "px-2.5",
          )}
        >
          <Link
            href={`/profile/${user?.username}`}
            onClick={onCloseMobile}
            className={cn(
              "group flex items-center gap-2.5 rounded-lg transition-all",
              isCollapsed ? "justify-center h-9 w-9 mx-auto" : "px-3 py-2",
              "text-white/60 hover:bg-white/[0.04] hover:text-white font-medium",
            )}
            title={isCollapsed ? "My Profile" : undefined}
          >
            <User
              className="w-[17px] h-[17px] shrink-0 text-white/60 group-hover:text-white"
              strokeWidth={2.2}
            />
            {!isCollapsed && (
              <span className="text-[13px] tracking-tight">My Profile</span>
            )}
          </Link>

          {!isCollapsed && (
            <div className="px-3 py-2 mt-0.5">
              <p className="text-[9.5px] text-white/20 font-mono italic leading-snug">
                dedicated to my beautiful wife hajra
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );

  const desktopRail = (
    <aside
      className={cn(
        "hidden lg:flex flex-col sticky top-[var(--dsrt-nav-h)] z-30 transition-all duration-300 ease-in-out shrink-0",
        isCollapsed ? "w-[72px]" : "w-[232px]",
        "h-[calc(100vh-var(--dsrt-nav-h))] bg-[#05070D] border-r border-white/[0.06] overflow-y-auto scrollbar-hide pt-3 pb-4",
      )}
    >
      {navContent}
    </aside>
  );

  const mobileDrawer = isMobileOpen ? (
    <div
      className="lg:hidden fixed inset-0 z-[100] flex"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
    >
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onCloseMobile}
      />

      <aside
        className={cn(
          "relative w-[280px] max-w-[85vw] h-full bg-[#0a0a0f] border-r border-white/[0.08]",
          "shadow-[0_0_60px_rgba(0,0,0,0.6)] flex flex-col",
          "animate-in slide-in-from-left duration-250 ease-out",
        )}
      >
        <div className="flex items-center justify-between px-4 h-[64px] border-b border-white/[0.06] flex-shrink-0">
          <Link
            href="/home"
            onClick={onCloseMobile}
            className="flex items-center gap-2.5 group"
          >
            <DsrtConnectLogo
              size={26}
              className="transition-transform duration-200 group-hover:scale-105 shrink-0"
            />
            <div className="flex flex-col leading-none">
              <span className="font-bold text-[15px] tracking-tight text-white">
                DSRT
              </span>
              <span className="text-[9.5px] font-mono uppercase tracking-widest text-white/40 mt-0.5">
                Connect
              </span>
            </div>
          </Link>

          <button
            onClick={onCloseMobile}
            aria-label="Close navigation"
            className="w-9 h-9 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors"
          >
            <X className="w-[18px] h-[18px]" strokeWidth={2.2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide pt-3 pb-4">
          {navContent}
        </div>
      </aside>
    </div>
  ) : null;

  return (
    <>
      {desktopRail}
      {mobileDrawer}
    </>
  );
}
