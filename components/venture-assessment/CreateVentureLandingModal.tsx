"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  CircleNotch,
  ArrowRight,
  Sparkle,
  FileText,
  Buildings,
  ShieldCheck,
} from "@phosphor-icons/react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Mode = "menu" | "assessment" | "basic";
type Step = "select" | "details" | "confirm";

export function CreateVentureLandingModal({ open, onClose }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("menu");
  const [step, setStep] = useState<Step>("select");

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [creating, setCreating] = useState(false);

  if (!open) return null;

  const reset = () => {
    setMode("menu");
    setStep("select");
    setName("");
    setTagline("");
    setConfirmText("");
    setCreating(false);
  };

  const handleClose = () => {
    if (creating) return;
    reset();
    onClose();
  };

  const handleDetailsSubmit = () => {
    if (!name.trim()) {
      toast.error("Please enter a venture name");
      return;
    }
    setStep("confirm");
  };

  const create = async () => {
    if (confirmText.toLowerCase() !== "confirm") return;

    setCreating(true);
    const idempotencyKey = `create-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    try {
      const res = await fetch("/api/ventures/drafts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          name: name.trim(),
          tagline: tagline.trim() || undefined,
          mode: mode === "assessment" ? "assessment" : "basic",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");

      toast.success(
        mode === "assessment" ? "Assessment started" : "Draft created",
      );
      router.push(json.next_url);
    } catch (e: any) {
      toast.error(e.message || "Could not create venture");
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-lg bg-[#05070D] rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(251,146,60,0.1)] border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Orange Gradient Border & Glow */}
        <div className="absolute inset-0 rounded-2xl border border-white/5 pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#fb923c] to-[#ea580c] pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[100px] bg-[#fb923c]/10 blur-[60px] pointer-events-none" />

        {/* Close Button - Fixed Z-Index & Stop Propagation */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          disabled={creating}
          className="absolute top-4 right-4 z-50 w-9 h-9 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
          aria-label="Close modal"
        >
          <X size={18} weight="bold" />
        </button>

        {step === "select" && (
          <div className="p-8 relative z-10">
            <p className="text-[10.5px] font-mono uppercase tracking-widest text-[#fb923c] font-bold mb-3">
              Create a Venture
            </p>
            <h2 className="text-[24px] font-extrabold text-white tracking-tight leading-tight pr-8">
              Turn your idea into something real.
            </h2>
            <p className="text-[14px] text-zinc-400 mt-2 leading-relaxed max-w-md">
              Every venture on DSRT starts with structured thinking. Choose how
              you want to begin — you can always change your mind later.
            </p>

            <div className="mt-8 space-y-4">
              <button
                type="button"
                onClick={() => {
                  setMode("assessment");
                  setStep("details");
                }}
                className="group w-full text-left rounded-2xl border border-white/10 hover:border-[#fb923c]/40 bg-[#09090b] hover:bg-[#fb923c]/5 p-5 transition-all shadow-sm cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#fb923c]/10 border border-[#fb923c]/20 flex items-center justify-center flex-shrink-0">
                    <Sparkle
                      size={18}
                      weight="fill"
                      className="text-[#fb923c]"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[15px] font-bold text-white group-hover:text-[#fb923c] transition-colors">
                        Start the Venture Assessment
                      </h3>
                      <ArrowRight
                        size={14}
                        weight="bold"
                        className="text-zinc-500 group-hover:text-[#fb923c] group-hover:translate-x-0.5 transition-all"
                      />
                    </div>
                    <p className="text-[13px] text-zinc-400 mt-1.5 leading-relaxed font-medium">
                      A 10-step structured onboarding. Takes 15–25 minutes.
                      Unlocks investor visibility and the Verified badge.
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("basic");
                  setStep("details");
                }}
                className="group w-full text-left rounded-2xl border border-white/5 hover:border-white/15 bg-transparent hover:bg-white/[0.02] p-5 transition-all cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <FileText size={18} className="text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[15px] font-bold text-zinc-300 group-hover:text-white transition-colors">
                        Create a basic draft
                      </h3>
                      <ArrowRight
                        size={14}
                        weight="bold"
                        className="text-zinc-600 group-hover:text-white group-hover:translate-x-0.5 transition-all"
                      />
                    </div>
                    <p className="text-[13px] text-zinc-500 mt-1.5 leading-relaxed font-medium">
                      Just name and description. Finish the assessment later.
                      Stays private until you publish.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {step === "details" && (
          <div className="p-8 relative z-10">
            <button
              type="button"
              onClick={() => setStep("select")}
              disabled={creating}
              className="text-[12px] font-bold text-zinc-500 hover:text-white mb-6 disabled:opacity-50 transition-colors cursor-pointer"
            >
              ← Back
            </button>

            <p className="text-[10.5px] font-mono uppercase tracking-widest text-[#fb923c] font-bold mb-3">
              {mode === "assessment" ? "Venture Assessment" : "Basic Draft"}
            </p>
            <h2 className="text-[22px] font-extrabold text-white tracking-tight leading-tight pr-8">
              {mode === "assessment"
                ? "What are you building?"
                : "Name your venture"}
            </h2>
            <p className="text-[13.5px] text-zinc-400 mt-2 leading-relaxed">
              {mode === "assessment"
                ? "We start with the basics. You will refine everything in the 10 steps."
                : "Just the essentials. You can complete everything else later."}
            </p>

            <div className="mt-8 space-y-5">
              <div>
                <label className="block text-[12px] font-bold text-white mb-2">
                  Venture name <span className="text-[#fb923c]">*</span>
                </label>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={120}
                  placeholder="e.g. Rovonic Robotics"
                  className="w-full h-12 px-4 rounded-xl bg-[#09090b] border border-white/10 focus:border-[#fb923c]/50 focus:ring-1 focus:ring-[#fb923c]/50 text-[14px] text-white placeholder:text-zinc-600 focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-white mb-2">
                  One-line description
                </label>
                <input
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  maxLength={200}
                  placeholder="What are you building, in one sentence?"
                  className="w-full h-12 px-4 rounded-xl bg-[#09090b] border border-white/10 focus:border-[#fb923c]/50 focus:ring-1 focus:ring-[#fb923c]/50 text-[14px] text-white placeholder:text-zinc-600 focus:outline-none transition-all"
                />
                <p className="text-[10.5px] font-mono text-zinc-500 mt-2 text-right tabular-nums">
                  {tagline.length}/200
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDetailsSubmit}
              disabled={!name.trim()}
              className="w-full mt-8 flex items-center justify-center gap-2 h-12 rounded-xl bg-white text-[#05070D] font-bold text-[14px] hover:bg-zinc-200 disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500 transition-colors cursor-pointer"
            >
              Continue <ArrowRight size={14} weight="bold" />
            </button>
          </div>
        )}

        {step === "confirm" && (
          <div className="p-8 relative z-10">
            <button
              type="button"
              onClick={() => setStep("details")}
              disabled={creating}
              className="text-[12px] font-bold text-zinc-500 hover:text-white mb-6 disabled:opacity-50 transition-colors cursor-pointer"
            >
              ← Back
            </button>

            <p className="text-[10.5px] font-mono uppercase tracking-widest text-[#fb923c] font-bold mb-3">
              Founder Intent
            </p>
            <h2 className="text-[22px] font-extrabold text-white tracking-tight leading-tight pr-8">
              Confirm your venture
            </h2>
            <p className="text-[13.5px] text-zinc-400 mt-2 leading-relaxed">
              DSRT ventures represent serious commitments. By proceeding, you
              agree to build with transparency and maintain accurate progress
              updates.
            </p>

            <div className="mt-6 space-y-4 mb-8">
              <div className="flex gap-3">
                <ShieldCheck
                  size={18}
                  weight="fill"
                  className="text-[#fb923c] shrink-0 mt-0.5"
                />
                <p className="text-[13px] text-zinc-300 font-medium">
                  Verify your claims and milestones accurately.
                </p>
              </div>
              <div className="flex gap-3">
                <Buildings
                  size={18}
                  weight="fill"
                  className="text-[#fb923c] shrink-0 mt-0.5"
                />
                <p className="text-[13px] text-zinc-300 font-medium">
                  Build a public record of your company's journey.
                </p>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-bold mb-2">
                Type "confirm" to begin
              </label>
              <input
                autoFocus
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="confirm"
                className="w-full h-12 px-4 bg-[#09090b] border border-white/[0.1] rounded-xl text-[14px] font-medium text-white focus:outline-none focus:border-[#fb923c]/50 focus:ring-1 focus:ring-[#fb923c]/50 transition-all"
              />
            </div>

            <button
              type="button"
              onClick={create}
              disabled={creating || confirmText.toLowerCase() !== "confirm"}
              className="w-full mt-6 flex items-center justify-center gap-2 h-12 rounded-xl bg-gradient-to-r from-[#fb923c] to-[#ea580c] text-white font-bold text-[14px] disabled:opacity-50 disabled:grayscale transition-all shadow-[0_4px_14px_rgba(251,146,60,0.3)] hover:shadow-[0_6px_20px_rgba(251,146,60,0.4)] cursor-pointer"
            >
              {creating ? (
                <>
                  <CircleNotch size={16} className="animate-spin" /> Preparing
                  workspace...
                </>
              ) : (
                <>
                  {mode === "assessment" ? "Start Assessment" : "Create Draft"}
                  <ArrowRight size={14} weight="bold" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
