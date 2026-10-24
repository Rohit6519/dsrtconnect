"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { LucideIcon, Info as InfoIcon } from "lucide-react";

// -------------- StudioSectionCard --------------
export function StudioSectionCard({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-white/[0.01] p-5 md:p-6",
        className,
      )}
    >
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-[14px] font-semibold text-white leading-tight">
              {title}
            </h3>
          )}
          {description && (
            <p className="mt-1 text-[12.5px] text-white/55 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

// -------------- StudioField --------------
export function StudioField({
  label,
  hint,
  error,
  htmlFor,
  children,
  optional,
  counter,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  htmlFor?: string;
  children: ReactNode;
  optional?: boolean;
  counter?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label
          htmlFor={htmlFor}
          className="text-[11.5px] font-mono uppercase tracking-wider text-white/60"
        >
          {label}
          {optional && (
            <span className="ml-1.5 text-white/30 lowercase">optional</span>
          )}
        </label>
        {counter && (
          <span className="text-[10.5px] font-mono text-white/35">
            {counter}
          </span>
        )}
      </div>
      {children}
      {hint && !error && (
        <p className="text-[11.5px] text-white/40 leading-relaxed">{hint}</p>
      )}
      {error && (
        <p className="text-[11.5px] text-red-300 leading-relaxed">{error}</p>
      )}
    </div>
  );
}

// -------------- StudioTipCard (Crash-Proof Icon) --------------
export function StudioTipCard({
  icon: Icon,
  title,
  children,
}: {
  icon?: LucideIcon | any;
  title: string;
  children: ReactNode;
}) {
  const RenderIcon = Icon || InfoIcon;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
      <div className="flex items-center gap-2 mb-2">
        {RenderIcon && typeof RenderIcon === "function" ? (
          <RenderIcon
            className="w-3.5 h-3.5 text-white/50"
            strokeWidth={1.75}
          />
        ) : (
          <div className="w-2 h-2 rounded-full bg-white/50" />
        )}
        <p className="label-mono text-white/50">{title}</p>
      </div>
      <div className="text-[12.5px] text-white/60 leading-relaxed space-y-2">
        {children}
      </div>
    </div>
  );
}

// -------------- StudioFooter --------------
export function StudioFooter({
  onBack,
  onContinue,
  onSaveExit,
  primaryLabel = "Continue",
  backLabel = "Back",
  disabled,
  loading,
}: {
  onBack?: () => void;
  onContinue?: () => void;
  onSaveExit?: () => void;
  primaryLabel?: string;
  backLabel?: string;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      <div>
        {onBack && (
          <button
            onClick={onBack}
            className="rounded-full border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] text-white/70 hover:text-white px-4 py-2 text-[12.5px] font-medium transition-colors"
          >
            ← {backLabel}
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {onSaveExit && (
          <button
            onClick={onSaveExit}
            className="text-[12px] text-white/50 hover:text-white transition-colors px-3 py-2"
          >
            Save & exit
          </button>
        )}
        {onContinue && (
          <button
            onClick={onContinue}
            disabled={disabled || loading}
            className={cn(
              "rounded-full bg-white text-black hover:bg-zinc-100 px-5 py-2 text-[12.5px] font-semibold transition-colors",
              (disabled || loading) && "opacity-60 cursor-not-allowed",
            )}
          >
            {loading ? "Saving…" : `${primaryLabel} →`}
          </button>
        )}
      </div>
    </div>
  );
}
