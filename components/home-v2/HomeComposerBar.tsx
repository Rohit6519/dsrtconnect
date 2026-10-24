"use client";

import { useState } from "react";
import {
  Image as ImageIcon,
  VideoCamera,
  ChartBar,
  Code,
  ArticleNyTimes,
} from "@phosphor-icons/react";
import { HomeComposerModal } from "./composer/HomeComposerModal";
import { DsrtAvatar } from "@/components/dsrt";

interface Props {
  currentUser: any;
}

export function HomeComposerBar({ currentUser }: Props) {
  const [open, setOpen] = useState(false);
  const [initialType, setInitialType] = useState("update");

  const handleOpen = (type: string = "update") => {
    setInitialType(type);
    setOpen(true);
  };

  return (
    <>
      <div
        id="home-composer-bar"
        className="
          rounded-2xl border border-white/[0.08]
          bg-white/[0.03]
          overflow-hidden
        "
      >
        {/* Input row */}
        <button
          type="button"
          onClick={() => handleOpen("update")}
          className="
            w-full flex items-center gap-3
            px-3.5 sm:px-4 pt-3.5 sm:pt-4 pb-3
            text-left cursor-text
            hover:bg-white/[0.02] transition-colors
          "
        >
          <DsrtAvatar
            src={currentUser?.avatar_url}
            name={currentUser?.full_name || currentUser?.username}
            size="md"
            className="shrink-0"
          />
          <div
            className="
              flex-1 min-w-0 h-10 sm:h-11
              flex items-center px-3.5 sm:px-4
              rounded-full
              bg-white/[0.04] border border-white/[0.08]
              text-[13px] sm:text-[14px] text-white/40
              truncate
            "
          >
            What&apos;s happening in DSRT?
          </div>
        </button>

        {/* Divider */}
        <div className="h-px bg-white/[0.06] mx-3.5 sm:mx-4" />

        {/* Actions row */}
        <div className="px-2 sm:px-3 py-2 sm:py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide min-w-0">
            <QuickAction
              Icon={ImageIcon}
              label="Image"
              onClick={() => handleOpen("update")}
            />
            <QuickAction
              Icon={VideoCamera}
              label="Video"
              onClick={() => handleOpen("update")}
            />
            <QuickAction
              Icon={ArticleNyTimes}
              label="Article"
              onClick={() => handleOpen("discussion")}
            />
            <QuickAction
              Icon={ChartBar}
              label="Poll"
              onClick={() => handleOpen("question")}
            />
            <QuickAction
              Icon={Code}
              label="Code"
              onClick={() => handleOpen("build_log")}
            />
          </div>

          <button
            type="button"
            onClick={() => handleOpen("update")}
            className="
              shrink-0 h-8 sm:h-9 px-4 sm:px-5
              rounded-full
              bg-white text-black
              text-[12.5px] sm:text-[13px] font-semibold
              hover:bg-white/90
              active:scale-[0.98]
              transition-all duration-150
              cursor-pointer
            "
          >
            Post
          </button>
        </div>
      </div>

      {open && (
        <HomeComposerModal
          open={open}
          onClose={() => setOpen(false)}
          currentUser={currentUser}
          initialType={initialType}
        />
      )}
    </>
  );
}

function QuickAction({
  Icon,
  label,
  onClick,
}: {
  Icon: any;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        inline-flex items-center gap-1.5
        h-8 px-2 sm:px-2.5 rounded-lg
        text-white/50 hover:text-white hover:bg-white/[0.06]
        text-[12px] font-medium
        transition-colors select-none cursor-pointer
        shrink-0
      "
      title={label}
    >
      <Icon size={16} weight="regular" className="shrink-0" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
