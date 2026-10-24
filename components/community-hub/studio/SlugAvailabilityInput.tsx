"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (slug: string) => void;
  onValidityChange?: (valid: boolean) => void;
}

export function SlugAvailabilityInput({
  value,
  onChange,
  onValidityChange,
}: Props) {
  const [state, setState] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");
  const [reason, setReason] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const cleanSlug = (value || "").toLowerCase().trim();
    if (!cleanSlug) {
      setState("idle");
      setReason(null);
      onValidityChange?.(false);
      return;
    }

    // Basic format validation (lowercase, numbers, hyphens)
    const isValidFormat = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleanSlug);
    if (!isValidFormat) {
      setState("invalid");
      setReason("Only lowercase letters, numbers, and hyphens allowed.");
      onValidityChange?.(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setState("checking");

    debounceRef.current = setTimeout(async () => {
      try {
        // Try dedicated slug check endpoint
        const res = await fetch("/api/v1/communities/slugs/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: cleanSlug }),
        });

        if (res.ok) {
          const json = await res.json();
          const data = json?.data;
          if (data?.available) {
            setState("available");
            setReason(null);
            onValidityChange?.(true);
            return;
          } else if (data?.reason) {
            setState("taken");
            setReason(data.reason);
            onValidityChange?.(false);
            return;
          }
        }

        // Fallback: Check community directly via GET
        const checkRes = await fetch(`/api/v1/community/${cleanSlug}`);
        if (checkRes.status === 404) {
          // 404 means community does not exist -> Slug IS AVAILABLE
          setState("available");
          setReason(null);
          onValidityChange?.(true);
        } else if (checkRes.ok) {
          // 200 means community exists -> Slug IS TAKEN
          setState("taken");
          setReason("This slug is already taken by another community.");
          onValidityChange?.(false);
        } else {
          // Default available for client side
          setState("available");
          setReason(null);
          onValidityChange?.(true);
        }
      } catch {
        // On network error, default to valid if format is correct
        setState("available");
        setReason(null);
        onValidityChange?.(true);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, onValidityChange]);

  const iconEl = useMemo(() => {
    if (state === "checking")
      return <Loader2 className="w-3.5 h-3.5 animate-spin text-white/40" />;
    if (state === "available")
      return <Check className="w-3.5 h-3.5 text-emerald-300" strokeWidth={2} />;
    if (state === "taken" || state === "invalid")
      return <X className="w-3.5 h-3.5 text-red-300" strokeWidth={2} />;
    return null;
  }, [state]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] focus-within:border-white/[0.18] transition-colors">
        <span className="pl-3 pr-1 text-[12px] font-mono text-white/40">
          /community/
        </span>
        <input
          value={value}
          onChange={(e) =>
            onChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
          }
          placeholder="your-community"
          className="flex-1 bg-transparent outline-none py-2 text-[13px] text-white placeholder:text-white/25 font-mono"
        />
        <div className="pr-3">{iconEl}</div>
      </div>
      {reason && (
        <p
          className={cn(
            "text-[11.5px]",
            state === "available" ? "text-emerald-300/80" : "text-red-300/80",
          )}
        >
          {reason}
        </p>
      )}
      {state === "available" && !reason && (
        <p className="text-[11.5px] text-emerald-300/80">Available</p>
      )}
    </div>
  );
}
