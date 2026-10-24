"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, List, CaretDown, SignOut } from "@phosphor-icons/react";
import { DsrtConnectLogo } from "@/components/ui/DsrtConnectLogo";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { NotificationsDropdown } from "@/components/notifications/NotificationsDropdown";
import { MailIconButton } from "./MailIconButton";
import { DsrtButton, DsrtAvatar } from "@/components/dsrt";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavbarProps {
  user: any;
  onMenuClick: () => void;
  handleLogout: () => void;
}

export function Navbar({ user, onMenuClick, handleLogout }: NavbarProps) {
  const pathname = usePathname();
  const isMailRoute = pathname?.startsWith("/inbox");

  return (
    <header className="fixed top-0 inset-x-0 z-[60] bg-[#05070D]/95 backdrop-blur-md border-b border-white/[0.06] flex flex-col shadow-sm">
      {/* 🎯 Single Row for both Mobile and Desktop */}
      <div className="h-[56px] sm:h-[64px] flex items-center justify-between px-2 sm:px-3 lg:px-6 w-full gap-2 sm:gap-3">
        {/* Left: Menu Button & Logo */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 min-w-0">
          <button
            onClick={onMenuClick}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors shrink-0"
            aria-label="Toggle sidebar"
          >
            <List size={20} weight="bold" />
          </button>

          {/* 🎯 Logo & Name - Hidden on Mobile (hidden md:flex) */}
          <Link
            href="/home"
            className="hidden md:flex items-center gap-2 sm:gap-2.5 group shrink-0 min-w-0"
          >
            <DsrtConnectLogo
              size={26}
              className="transition-transform duration-200 group-hover:scale-105 shrink-0"
            />
            <div className="flex flex-col justify-center min-w-0">
              <span className="font-bold text-[15px] tracking-tight text-white leading-none truncate">
                DSRT Connect
              </span>
              <span className="font-cursive text-[14px] sm:text-[16px] text-white/90 leading-none mt-1 truncate hidden sm:block tracking-wide">
                Banaya Connections jo kaam aaya !!
              </span>
            </div>
          </Link>
        </div>

        {/* 🎯 Center: Global Search - Now visible on mobile and takes up middle space */}
        {!isMailRoute && (
          <div className="flex-1 min-w-0 max-w-xl mx-1 sm:mx-4">
            <GlobalSearch />
          </div>
        )}
        {/* If Mail Route, just keep the space empty */}
        {isMailRoute && <div className="flex-1" />}

        {/* Right: Actions (New, Mail, Notif, Profile) */}
        <div className="flex items-center gap-0.5 sm:gap-2 shrink-0">
          <div className="hidden sm:block">
            <NewDropdown />
          </div>

          <MailIconButton userId={user?.id} />
          <NotificationsDropdown />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 sm:gap-1.5 pl-0.5 sm:pl-1 pr-1 sm:pr-1.5 py-1 rounded-full hover:bg-white/[0.06] transition-colors outline-none ml-0.5 sm:ml-1">
                <DsrtAvatar
                  src={user?.avatar_url}
                  name={user?.full_name}
                  size="sm"
                />
                <CaretDown
                  size={12}
                  weight="bold"
                  className="text-white/40 hidden sm:block"
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-[#0a0f1a] border-white/[0.08] text-white rounded-xl shadow-2xl mt-1 py-1"
            >
              <div className="px-4 py-3 border-b border-white/[0.06] mb-1">
                <p className="text-[13px] font-bold text-white truncate">
                  {user?.full_name}
                </p>
                <p className="text-[11px] font-mono text-white/40 truncate mt-0.5">
                  @{user?.username}
                </p>
              </div>
              <DropdownMenuItem
                asChild
                className="cursor-pointer text-white text-[13px] py-2 px-4 mx-1 rounded-lg outline-none focus:bg-white/[0.06] focus:text-white hover:bg-white/[0.06] hover:text-white data-[highlighted]:bg-white/[0.06] data-[highlighted]:text-white"
              >
                <Link href={`/profile/${user?.username}`}>View Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                asChild
                className="cursor-pointer text-white text-[13px] py-2 px-4 mx-1 rounded-lg outline-none focus:bg-white/[0.06] focus:text-white hover:bg-white/[0.06] hover:text-white data-[highlighted]:bg-white/[0.06] data-[highlighted]:text-white"
              >
                <Link href="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/[0.06] my-1" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-red-400 text-[13px] py-2 px-4 mx-1 rounded-lg flex items-center gap-2 outline-none
                  focus:bg-red-500/10 focus:text-red-300
                  hover:bg-red-500/10 hover:text-red-300
                  data-[highlighted]:bg-red-500/10 data-[highlighted]:text-red-300"
              >
                <SignOut size={14} weight="bold" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

function NewDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <DsrtButton size="xs" variant="white" className="h-8 px-3 gap-1.5">
          <Plus size={12} weight="bold" />
          <span>New</span>
        </DsrtButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-48 bg-[#0a0f1a] border border-white/[0.08] text-white rounded-xl shadow-2xl mt-1 py-1"
      >
        <DropdownMenuItem
          asChild
          className="cursor-pointer text-white text-[13px] py-2 px-3 mx-1 rounded-lg outline-none
            focus:bg-white/[0.08] focus:text-white
            hover:bg-white/[0.08] hover:text-white
            data-[highlighted]:bg-white/[0.08] data-[highlighted]:text-white"
        >
          <Link href="/projects/new">New Project</Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          asChild
          className="cursor-pointer text-white text-[13px] py-2 px-3 mx-1 rounded-lg outline-none
            focus:bg-white/[0.08] focus:text-white
            hover:bg-white/[0.08] hover:text-white
            data-[highlighted]:bg-white/[0.08] data-[highlighted]:text-white"
        >
          <Link href="/ventures/new">New Venture</Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          asChild
          className="cursor-pointer text-white text-[13px] py-2 px-3 mx-1 rounded-lg outline-none
            focus:bg-white/[0.08] focus:text-white
            hover:bg-white/[0.08] hover:text-white
            data-[highlighted]:bg-white/[0.08] data-[highlighted]:text-white"
        >
          <Link href="/home">New Post</Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          asChild
          className="cursor-pointer text-white text-[13px] py-2 px-3 mx-1 rounded-lg outline-none
            focus:bg-white/[0.08] focus:text-white
            hover:bg-white/[0.08] hover:text-white
            data-[highlighted]:bg-white/[0.08] data-[highlighted]:text-white"
        >
          <Link href="/looking-for/create">New Opportunity</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
