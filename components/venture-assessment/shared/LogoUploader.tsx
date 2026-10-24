'use client'

import { useState } from 'react'
import { Camera, Trash } from '@phosphor-icons/react'
import { BrandAssetCropper } from '@/components/venture-detail/brand/BrandAssetCropper'

interface Props {
  ventureId: string
  ventureSlug?: string
  ventureName?: string
  currentUrl?: string | null
  onChange: (url: string | null) => void
}

export function LogoUploader({ ventureId, ventureSlug, ventureName, currentUrl, onChange }: Props) {
  const [cropperOpen, setCropperOpen] = useState(false)

  return (
    <div className="flex items-center gap-4">
      <div className="w-20 h-20 rounded-xl bg-[#121215] border border-zinc-800 overflow-hidden flex items-center justify-center">
        {currentUrl ? (
          <img src={currentUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl font-bold text-zinc-500">
            {ventureName?.charAt(0)?.toUpperCase() || '?'}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => setCropperOpen(true)}
          className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-semibold bg-[#121215] border border-zinc-800 hover:border-zinc-600 text-zinc-200 rounded-md transition-colors"
        >
          <Camera size={12} />
          {currentUrl ? 'Change logo' : 'Upload logo'}
        </button>
        {currentUrl && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex items-center gap-1.5 h-7 px-2 text-[11px] text-zinc-500 hover:text-red-400 transition-colors"
          >
            <Trash size={11} /> Remove
          </button>
        )}
        <p className="text-[10.5px] text-zinc-600 mt-1">Square image · Max 5MB · Full crop tools</p>
      </div>

      {cropperOpen && ventureSlug && (
        <BrandAssetCropper
          open={cropperOpen}
          kind="logo"
          slug={ventureSlug}
          currentUrl={currentUrl}
          onClose={() => setCropperOpen(false)}
          onSuccess={(url) => onChange(url || null)}
        />
      )}
    </div>
  )
}