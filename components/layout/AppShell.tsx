"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { useNavBadges } from "@/hooks/useNavBadges";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { CocoProvider } from "@/lib/coco/sdk";
import { CocoPageAutoWire } from "@/components/coco/CocoPageAutoWire";

// 🎯 Single row height: Mobile is 56px, Desktop (sm+) is 64px.
const NAV_DESKTOP = 64;
const NAV_MOBILE = 56;

export function AppShell({
  user,
  children,
}: {
  user: any;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const badges = useNavBadges(user?.id);
  const supabase = createClient();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  const isMailRoute = pathname?.startsWith("/inbox");

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  };

  const handleMenuToggle = () => {
    if (window.innerWidth < 1024) setIsMobileOpen(true);
    else setIsDesktopCollapsed(!isDesktopCollapsed);
  };

  return (
    <CocoProvider>
      <CocoPageAutoWire />

      {/* 🎯 Responsive CSS Variable matching the new single-row navbar */}
      <style jsx global>{`
        :root {
          --dsrt-nav-h: ${NAV_MOBILE}px;
        }
        @media (min-width: 640px) {
          :root {
            --dsrt-nav-h: ${NAV_DESKTOP}px;
          }
        }
      `}</style>

      <div className="flex flex-col min-h-screen bg-[#05070D]">
        <Navbar
          user={user}
          onMenuClick={handleMenuToggle}
          handleLogout={handleLogout}
        />

        {/* 🎯 Perfect Top Padding (56px on mobile, 64px on desktop) */}
        <div className={cn("flex flex-1", "pt-[56px] sm:pt-[64px]")}>
          <Sidebar
            user={user}
            badges={badges}
            isCollapsed={isDesktopCollapsed}
            isMobileOpen={isMobileOpen}
            onCloseMobile={() => setIsMobileOpen(false)}
            onLogout={handleLogout}
          />

          <main className="flex-1 flex flex-col min-w-0 bg-[#05070D] relative">
            <div
              className={cn(
                "flex-1 w-full min-w-0 overflow-x-clip",
                isMailRoute ? "pb-0" : "pb-12",
              )}
            >
              {children}
            </div>
          </main>
        </div>
      </div>
    </CocoProvider>
  );
}
