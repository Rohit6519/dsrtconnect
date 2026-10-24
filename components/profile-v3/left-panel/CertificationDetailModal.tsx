'use client'

import { motion } from 'framer-motion'
import { format } from 'date-fns'
import {
  X,
  ArrowSquareOut,
  Calendar,
  Buildings,
  DownloadSimple,
  Certificate as CertificateIcon,
} from '@phosphor-icons/react'
import { toast } from 'sonner'

interface Certification {
  id: string
  name: string
  issuer?: string | null
  issue_date?: string | null
  expiry_date?: string | null
  credential_url?: string | null
  image_url: string
  skills_gained?: string[]
}

interface CertificationDetailModalProps {
  cert: Certification
  onClose: () => void
}

function formatDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null
  try {
    return format(new Date(dateStr), 'MMM yyyy')
  } catch { return null }
}

export function CertificationDetailModal({ cert, onClose }: CertificationDetailModalProps) {
  const issueDisplay = formatDate(cert.issue_date)
  const expiryDisplay = formatDate(cert.expiry_date)

  const isExpired = cert.expiry_date
    ? new Date(cert.expiry_date) < new Date()
    : false

  const download = async () => {
    try {
      const res = await fetch(cert.image_url)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${cert.name.replace(/[^a-z0-9]/gi, '_')}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Downloaded')
    } catch {
      toast.error('Download failed')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 8 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-950 border border-zinc-800/60 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_24px_64px_rgba(0,0,0,0.6)]"
      >
        {/* Close button (floating) */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-zinc-900/80 backdrop-blur-sm border border-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center"
        >
          <X className="w-4 h-4" weight="bold" />
        </button>

        {/* Image */}
        <div className="bg-black flex items-center justify-center max-h-[55vh]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cert.image_url}
            alt={cert.name}
            className="max-w-full max-h-[55vh] object-contain"
          />
        </div>

        {/* Details */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Title + status */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-[18px] font-bold text-zinc-100 tracking-tight leading-tight">
                {cert.name}
              </h2>
              {cert.issuer && (
                <p className="text-[13px] text-zinc-400 mt-1 flex items-center gap-1.5">
                  <Buildings className="w-3.5 h-3.5 text-zinc-600" weight="duotone" />
                  {cert.issuer}
                </p>
              )}
            </div>

            {isExpired && (
              <span className="text-[10px] px-2 py-1 rounded-md bg-orange-500/10 border border-orange-500/30 text-orange-300 uppercase tracking-wider font-bold flex-shrink-0">
                Expired
              </span>
            )}
          </div>

          {/* Dates */}
          {(issueDisplay || expiryDisplay) && (
            <div className="flex items-center gap-3 text-[12px] text-zinc-500">
              {issueDisplay && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" weight="duotone" />
                  <span className="text-zinc-600">Issued</span>
                  <span className="text-zinc-300 font-medium">{issueDisplay}</span>
                </span>
              )}
              {expiryDisplay && (
                <>
                  <span className="text-zinc-800">·</span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-zinc-600">Expires</span>
                    <span className="text-zinc-300 font-medium">{expiryDisplay}</span>
                  </span>
                </>
              )}
            </div>
          )}

          {/* Skills */}
          {cert.skills_gained && cert.skills_gained.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-600 mb-1.5">
                Skills Gained
              </p>
              <div className="flex flex-wrap gap-1.5">
                {cert.skills_gained.map((s) => (
                  <span
                    key={s}
                    className="text-[11px] px-2 py-0.5 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-lg font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-zinc-800/60">
            {cert.credential_url && (
              <a
                href={cert.credential_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-white text-black text-[12px] font-semibold hover:bg-zinc-100 transition-colors"
              >
                <ArrowSquareOut className="w-3.5 h-3.5" weight="bold" />
                Verify Credential
              </a>
            )}
            <button
              onClick={download}
              className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-zinc-700 bg-transparent text-zinc-300 text-[12px] font-semibold hover:border-zinc-600 transition-colors"
            >
              <DownloadSimple className="w-3.5 h-3.5" weight="bold" />
              Download
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}