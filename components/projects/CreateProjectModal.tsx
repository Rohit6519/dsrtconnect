"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  ArrowRight,
  CircleNotch,
  Lightbulb,
  ShieldCheck,
} from "@phosphor-icons/react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateProjectModal({ open, onClose }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const reset = () => {
    setStep(1);
    setConfirmText("");
    setLoading(false);
  };

  const handleClose = () => {
    if (loading) return;
    reset();
    onClose();
  };

  const handleConfirm = () => {
    if (confirmText.toLowerCase() !== "confirm") return;
    setLoading(true);
    router.push("/projects/create");
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-lg bg-[#05070D] rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(56,189,248,0.1)] border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative elements (All pointer-events-none) */}
        <div className="absolute inset-0 rounded-2xl border border-white/5 pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#38bdf8] to-[#2563eb] pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[100px] bg-[#38bdf8]/10 blur-[60px] pointer-events-none" />

        {/* Close Button - Fixed Z-Index & Click Event */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          disabled={loading}
          className="absolute top-4 right-4 z-50 w-9 h-9 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
          aria-label="Close modal"
        >
          <X size={18} weight="bold" />
        </button>

        {step === 1 && (
          <div className="p-8 relative z-10">
            <p className="text-[10.5px] font-mono uppercase tracking-widest text-[#38bdf8] font-bold mb-3">
              DSRT Workspace
            </p>
            <h2 className="text-[24px] font-extrabold text-white tracking-tight leading-tight pr-8">
              Create a new project
            </h2>
            <p className="text-[14px] text-zinc-400 mt-2 leading-relaxed">
              Your project profile is a public record of your engineering,
              research, and experiments.
            </p>

            <div className="mt-8 space-y-4">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#38bdf8]/10 border border-[#38bdf8]/20 flex items-center justify-center shrink-0">
                  <Lightbulb
                    size={18}
                    weight="fill"
                    className="text-[#38bdf8]"
                  />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-white">
                    Build in Public
                  </h3>
                  <p className="text-[13px] text-zinc-500 mt-1 leading-relaxed">
                    Share your technical decisions, milestones, and challenges
                    openly to attract collaborators.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#38bdf8]/10 border border-[#38bdf8]/20 flex items-center justify-center shrink-0">
                  <ShieldCheck
                    size={18}
                    weight="fill"
                    className="text-[#38bdf8]"
                  />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-white">
                    High Quality Standards
                  </h3>
                  <p className="text-[13px] text-zinc-500 mt-1 leading-relaxed">
                    DSRT prioritizes clear documentation, honest stage
                    reporting, and active repositories.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full mt-8 flex items-center justify-center gap-2 h-12 rounded-xl bg-white text-[#05070D] font-bold text-[14px] hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              Continue to setup <ArrowRight size={14} weight="bold" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="p-8 relative z-10">
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={loading}
              className="text-[12px] font-bold text-zinc-500 hover:text-white mb-6 disabled:opacity-50 transition-colors cursor-pointer"
            >
              ← Back
            </button>

            <p className="text-[10.5px] font-mono uppercase tracking-widest text-[#38bdf8] font-bold mb-3">
              Builder Intent
            </p>
            <h2 className="text-[22px] font-extrabold text-white tracking-tight leading-tight pr-8">
              Confirm your project
            </h2>
            <p className="text-[13.5px] text-zinc-400 mt-2 leading-relaxed">
              By proceeding, you agree to maintain a high standard of
              documentation and respectful collaboration within the DSRT
              ecosystem.
            </p>

            <div className="mt-8">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-bold mb-2">
                Type "confirm" to begin
              </label>
              <input
                autoFocus
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="confirm"
                className="w-full h-12 px-4 bg-[#09090b] border border-white/[0.1] rounded-xl text-[14px] font-medium text-white focus:outline-none focus:border-[#38bdf8]/50 focus:ring-1 focus:ring-[#38bdf8]/50 transition-all"
              />
            </div>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading || confirmText.toLowerCase() !== "confirm"}
              className="w-full mt-6 flex items-center justify-center gap-2 h-12 rounded-xl bg-gradient-to-r from-[#38bdf8] to-[#2563eb] text-white font-bold text-[14px] disabled:opacity-50 disabled:grayscale transition-all shadow-[0_4px_14px_rgba(56,189,248,0.3)] hover:shadow-[0_6px_20px_rgba(56,189,248,0.4)] cursor-pointer"
            >
              {loading ? (
                <>
                  <CircleNotch size={16} className="animate-spin" /> Entering
                  Studio...
                </>
              ) : (
                <>
                  Start Building <ArrowRight size={14} weight="bold" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
