'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  X,
  Clock,
  CalendarBlank,
  Briefcase,
  CheckCircle,
  CircleNotch,
  ArrowRight,
  ListChecks,
} from '@phosphor-icons/react'

interface Props {
  opportunityId: string
  onClose: () => void
}

export function ApplicationBriefModal({ opportunityId, onClose }: Props) {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Ensure portal only renders after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    fetch(`/api/opportunities/${opportunityId}/apply/brief`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error)
        setData(d)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [opportunityId])

  const handleStart = () => {
    setStarting(true)
    router.push(`/looking-for/${opportunityId}/apply`)
  }

  if (!mounted) return null

  // We portal the modal to document.body to escape any parent overflow:hidden containers
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-all"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-[#0c0d10] shadow-[0_20px_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-zinc-800/80 bg-[#090a0c] shrink-0">
          <div className="flex items-center gap-2 text-zinc-100">
            <ListChecks size={18} className="text-zinc-400" />
            <span className="text-[14px] font-bold tracking-wide">
              Before you apply
            </span>
          </div>
          <button
            onClick={onClose}
            disabled={starting}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors disabled:opacity-50"
          >
            <X size={15} weight="bold" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 md:p-8 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <CircleNotch size={24} className="text-zinc-600 animate-spin" />
              <div className="text-[13px] text-zinc-500">
                Checking application requirements...
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-400 font-bold mb-2">Error</div>
              <div className="text-zinc-500 text-[13px] mb-6">{error}</div>
              <button
                onClick={onClose}
                className="h-10 px-6 rounded-xl bg-zinc-900 text-white font-semibold text-[13px]"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="space-y-7">
              {/* Context */}
              <div>
                <div className="text-[16px] font-bold text-white leading-snug mb-3">
                  {data.title}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-[12px] font-medium text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-zinc-500" />
                    <span>Est. time: {data.timeEstimate}</span>
                  </div>
                  {data.deadline && (
                    <div className="flex items-center gap-1.5">
                      <CalendarBlank size={14} className="text-zinc-500" />
                      <span>
                        Deadline: {new Date(data.deadline).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {data.commitment && (
                    <div className="flex items-center gap-1.5">
                      <Briefcase size={14} className="text-zinc-500" />
                      <span className="capitalize">{data.commitment}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="h-px w-full bg-zinc-800/60" />

              {/* Checklist */}
              <div>
                <div className="text-[11.5px] font-bold uppercase tracking-wider text-zinc-500 mb-4">
                  Application includes
                </div>
                <ul className="space-y-3">
                  {data.requirements.map((req: any, i: number) => (
                    <li key={i} className="flex items-start gap-3">
                      {req.met ? (
                        <CheckCircle
                          size={16}
                          weight="fill"
                          className="text-emerald-400 shrink-0 mt-0.5"
                        />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-zinc-700 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div
                          className={`text-[13.5px] font-semibold ${req.met ? 'text-zinc-300' : 'text-zinc-100'}`}
                        >
                          {req.label}
                        </div>
                        {req.met && (
                          <div className="text-[11px] text-zinc-500 mt-0.5">
                            Already available from your profile
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800/80 bg-[#090a0c] shrink-0">
            <button
              onClick={onClose}
              disabled={starting}
              className="h-10 px-4 rounded-xl border border-zinc-800 hover:border-zinc-700 text-[13px] font-semibold text-zinc-300 hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleStart}
              disabled={starting}
              className="inline-flex items-center gap-2 h-10 px-6 rounded-xl bg-white text-black hover:bg-zinc-200 text-[13px] font-bold transition-all shadow-[0_2px_12px_rgba(255,255,255,0.15)] disabled:opacity-60 whitespace-nowrap"
            >
              {starting ? (
                <>
                  <CircleNotch size={14} className="animate-spin shrink-0" />
                  Preparing...
                </>
              ) : (
                <>
                  Start Application
                  <ArrowRight size={14} weight="bold" className="shrink-0" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}