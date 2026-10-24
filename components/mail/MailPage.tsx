// filepath: components/mail/MailPage.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  PencilSimple,
  Radio,
  Check,
  X,
  CircleNotch,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useOnIdentityChange } from "./hooks/useMailIdentity";
import { useComposer } from "./composer/ComposerContext";
import { MailTopbar } from "./MailTopbar";
import { MailSidebar } from "./MailSidebar";
import { MailTabs, MailTab } from "./MailTabs";
import { ThreadList } from "./ThreadList";
import { CocoSidebar } from "./CocoSidebar";
import { AdvancedFilterBar, MailFilters } from "./AdvancedFilterBar";
import { useMailShortcuts } from "./hooks/useMailShortcuts";
import { MailCommandPalette } from "./MailCommandPalette";
import { MailErrorBoundary } from "./MailErrorBoundary";
import { MailMobileDrawer } from "./MailMobileDrawer";
import { MAIL_EVENTS } from "@/lib/mail/mailEvents";
import { cn } from "@/lib/utils";

const supabase = createClient();

const EMPTY_FILTERS: MailFilters = {
  hasAttachment: false,
  isUnread: false,
  isStarred: false,
  fromType: "all",
  dateRange: "all",
};

/* =========================================================
    🔴 OPEN MIC INVITES BANNER COMPONENT
   ========================================================= */
function OpenMicInvitesBanner() {
  const router = useRouter();
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    let channel: any;

    const loadInvites = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          setLoading(false);
          return;
        }

        const fetchInvites = async () => {
          const { data, error } = await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", session.user.id)
            .eq("type", "open_mic_invite")
            .or("status.eq.pending,status.is.null")
            .order("created_at", { ascending: false });

          if (!error && data) {
            setInvites(data);
          }
        };

        await fetchInvites();

        // Realtime subscription for incoming invites
        channel = supabase
          .channel("open_mic_invites_realtime")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${session.user.id}`,
            },
            () => {
              fetchInvites();
            },
          )
          .subscribe();
      } catch (e) {
        console.error("Error loading invites:", e);
      } finally {
        setLoading(false);
      }
    };

    loadInvites();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const handleAccept = async (invite: any) => {
    setActionId(invite.id);
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ status: "accepted", is_read: true })
        .eq("id", invite.id);

      if (error) throw error;

      toast.success("Invite accepted! Joining Open Mic channel...");
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));

      if (invite.link) {
        router.push(invite.link);
      } else {
        router.push("/open-mic");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to accept invite");
    } finally {
      setActionId(null);
    }
  };

  const handleDecline = async (invite: any) => {
    setActionId(invite.id);
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ status: "rejected", is_read: true })
        .eq("id", invite.id);

      if (error) throw error;

      toast.info("Invite declined");
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    } catch (err: any) {
      toast.error(err?.message || "Failed to decline invite");
    } finally {
      setActionId(null);
    }
  };

  if (loading || invites.length === 0) return null;

  return (
    <div className="p-3 border-b border-white/[0.08] bg-[#0A0D1A] space-y-2 shrink-0">
      <div className="flex items-center gap-2 text-[11px] font-bold text-[#38bdf8] uppercase tracking-wider px-1">
        <Radio
          size={14}
          weight="bold"
          className="animate-pulse text-[#38bdf8]"
        />
        Open Mic Requests ({invites.length})
      </div>

      {invites.map((invite) => (
        <div
          key={invite.id}
          className="p-3 bg-[#0d1222] border border-[#38bdf8]/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#38bdf8]/20 border border-[#38bdf8]/40 flex items-center justify-center text-[#38bdf8] shrink-0 shadow-sm">
              <Radio size={20} weight="bold" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-white truncate">
                {invite.title || "Open Mic Channel Invite"}
              </h4>
              <p className="text-xs text-white/70 truncate mt-0.5">
                {invite.message}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              disabled={actionId === invite.id}
              onClick={() => handleAccept(invite)}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {actionId === invite.id ? (
                <CircleNotch size={14} className="animate-spin" />
              ) : (
                <Check size={14} weight="bold" />
              )}
              Accept Join
            </button>

            <button
              disabled={actionId === invite.id}
              onClick={() => handleDecline(invite)}
              className="px-3.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/30 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <X size={14} weight="bold" />
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MailPage() {
  const { openCompose } = useComposer();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [cocoOpen, setCocoOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<MailTab>("personal");
  const [folder, setFolder] = useState("inbox");
  const [searchQ, setSearchQ] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [filters, setFilters] = useState<MailFilters>(EMPTY_FILTERS);

  const filtersActive = useMemo(
    () =>
      filters.hasAttachment ||
      filters.isUnread ||
      filters.isStarred ||
      filters.fromType !== "all" ||
      filters.dateRange !== "all",
    [filters],
  );

  useEffect(() => {
    const handler = () => setRefreshKey((k) => k + 1);
    window.addEventListener(MAIL_EVENTS.refresh, handler);
    return () => window.removeEventListener(MAIL_EVENTS.refresh, handler);
  }, []);

  useEffect(() => {
    const handleOpenDraft = (e: Event) => {
      const draftState = (e as CustomEvent).detail;
      if (!draftState) return;
      openCompose({
        ...draftState,
        draft_id: draftState.draft_id,
      });
    };
    window.addEventListener(MAIL_EVENTS.openDraft, handleOpenDraft);
    return () =>
      window.removeEventListener(MAIL_EVENTS.openDraft, handleOpenDraft);
  }, [openCompose]);

  useOnIdentityChange(() => {
    setRefreshKey((k) => k + 1);
  });

  useMailShortcuts({
    onCompose: () => openCompose({ mode: "new" }),
    onSearch: () => {
      setMobileSearchOpen(true);
      requestAnimationFrame(() => {
        const el = document.querySelector(
          'input[placeholder*="Search in emails"]',
        ) as HTMLElement;
        el?.focus();
      });
    },
    onCommandPalette: () => setCmdPaletteOpen(true),
    onArchive: () => {},
    onTrash: () => {},
    activeThreadId: null,
  });

  const executeCommand = (cmdId: string) => {
    if (cmdId === "compose") openCompose({ mode: "new" });
    if (cmdId === "inbox") setFolder("inbox");
    if (cmdId === "starred") setFolder("starred");
    if (cmdId === "sent") setFolder("sent");
    if (cmdId === "snoozed") setFolder("snoozed");
    if (cmdId === "drafts") setFolder("drafts");
    if (cmdId === "scheduled") setFolder("scheduled");
    if (cmdId === "archive") setFolder("archive");
  };

  const handleFolderChange = (f: string) => {
    setFolder(f);
    setMobileNavOpen(false);
  };

  const showFiltersMobile =
    mobileSearchOpen || filtersActive || mobileFiltersOpen;

  return (
    <div className="h-[calc(100dvh-64px)] flex flex-col bg-[#05070D] text-white overflow-hidden relative w-full">
      <MailErrorBoundary
        label="DSRT Mail"
        onReset={() => setRefreshKey((k) => k + 1)}
      >
        {/* Mobile top bar */}
        <div className="lg:hidden border-b border-white/[0.06] bg-gradient-to-b from-[#0A0C13] to-[#08090F] shrink-0">
          <MailTopbar
            compact
            onToggleSidebar={() => setMobileNavOpen(true)}
            searchQ={searchQ}
            onSearchChange={setSearchQ}
            onToggleCoco={() => setCocoOpen((v) => !v)}
            cocoOpen={cocoOpen}
            searchOpen={mobileSearchOpen}
            onSearchOpenChange={(open) => {
              setMobileSearchOpen(open);
              if (!open) {
                setMobileFiltersOpen(false);
                if (!filtersActive) setFilters(EMPTY_FILTERS);
              }
            }}
            onOpenFilters={() => setMobileFiltersOpen((v) => !v)}
            filtersActive={filtersActive || mobileFiltersOpen}
          />
        </div>

        {/* Desktop top bar */}
        <div className="hidden lg:block shrink-0">
          <MailTopbar
            onToggleSidebar={() => {}}
            searchQ={searchQ}
            onSearchChange={setSearchQ}
            onToggleCoco={() => setCocoOpen((v) => !v)}
            cocoOpen={cocoOpen}
          />
        </div>

        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Desktop sidebar */}
          <div className="hidden lg:flex">
            <MailErrorBoundary label="Mail sidebar">
              <MailSidebar
                activeFolder={folder}
                onFolderChange={handleFolderChange}
                onComposeClick={() => openCompose({ mode: "new" })}
              />
            </MailErrorBoundary>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Tabs */}
            <div className={mobileSearchOpen ? "hidden lg:block" : ""}>
              <MailTabs
                activeTab={activeTab}
                onTabChange={(t) => setActiveTab(t)}
              />
            </div>

            {/* Filter bar */}
            <div className={showFiltersMobile ? "block" : "hidden lg:block"}>
              <AdvancedFilterBar filters={filters} onChange={setFilters} />
            </div>

            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <MailErrorBoundary
                label="Mail list"
                onReset={() => setRefreshKey((k) => k + 1)}
              >
                <div className="flex-1 flex flex-col overflow-y-auto min-h-0">
                  {/* 🟢 Open Mic Pending Request Banner inside Inbox */}
                  {folder === "inbox" && <OpenMicInvitesBanner />}

                  <ThreadList
                    key={
                      refreshKey +
                      "-" +
                      folder +
                      "-" +
                      activeTab +
                      "-" +
                      searchQ +
                      "-" +
                      JSON.stringify(filters)
                    }
                    activeFolder={folder}
                    activeTab={activeTab}
                    searchQ={searchQ}
                    filters={filters}
                    selectedThreadId={null}
                    onSelectThread={() => {}}
                  />
                </div>
              </MailErrorBoundary>
            </div>
          </div>

          <CocoSidebar
            open={cocoOpen}
            onClose={() => setCocoOpen(false)}
            activeThreadId={null}
          />
        </div>

        {/* Mobile Compose FAB */}
        <button
          onClick={() => openCompose({ mode: "new" })}
          className={cn(
            "lg:hidden fixed right-4 z-30 flex items-center gap-2 h-14 px-5",
            "rounded-2xl bg-[#4F7CFF] hover:bg-[#3D6BF5] text-white text-[15px] font-semibold",
            "shadow-[0_8px_24px_rgba(79,124,255,0.4)] active:scale-95 transition-all",
          )}
          style={{ bottom: "calc(24px + env(safe-area-inset-bottom))" }}
        >
          <PencilSimple className="w-5 h-5" weight="bold" />
          Compose
        </button>

        {/* Mobile side drawer */}
        <MailMobileDrawer
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
        >
          <MailSidebar
            activeFolder={folder}
            onFolderChange={handleFolderChange}
            onComposeClick={() => {
              setMobileNavOpen(false);
              openCompose({ mode: "new" });
            }}
            mobile
          />
        </MailMobileDrawer>

        <MailCommandPalette
          isOpen={cmdPaletteOpen}
          onClose={() => setCmdPaletteOpen(false)}
          onSelectAction={executeCommand}
        />
      </MailErrorBoundary>
    </div>
  );
}
