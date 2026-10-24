"use client";

import { useEffect } from "react";
import { WarningCircle, ArrowClockwise, House } from "@phosphor-icons/react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error internally without exposing sensitive details to the browser
    console.error("[App Error Boundary]", error.message || error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#05070D] text-white flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-14 h-14 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto">
          <WarningCircle size={24} className="text-white/60" />
        </div>

        <div className="space-y-2">
          <h1 className="text-[20px] font-semibold text-white tracking-tight">
            Something went wrong
          </h1>
          <p className="text-[13.5px] text-white/50 leading-relaxed max-w-sm mx-auto">
            An unexpected error occurred. Try reloading the page — if this keeps
            happening, please let us know.
          </p>
        </div>

        {/* 🛡️ Error details ONLY shown during local development */}
        {process.env.NODE_ENV === "development" && error.message && (
          <div className="text-left bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
            <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 font-bold mb-2">
              Error details (Dev Only)
            </p>
            <p className="text-[11px] font-mono text-red-300/80 break-words">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-[10px] font-mono text-white/30 mt-2">
                digest: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-white text-black hover:bg-white/90 text-[13px] font-semibold transition-all cursor-pointer"
          >
            <ArrowClockwise size={13} weight="bold" />
            Try again
          </button>
          <Link
            href="/home"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-[13px] font-medium text-white/80 hover:text-white transition-all"
          >
            <House size={13} weight="bold" />
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
