'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, PencilSimple, Spinner } from '@phosphor-icons/react'
import { ImageCropperModal } from '../shared/ImageCropperModal'

interface BannerSectionProps {
  bannerUrl: string | null
  isOwner: boolean
  onBannerChange: (newUrl: string) => void
}

const BANNER_ASPECT = 5 / 1

export function BannerSection({
  bannerUrl,
  isOwner,
  onBannerChange,
}: BannerSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cropperOpen, setCropperOpen] = useState(false)
  const [cropperSrc, setCropperSrc] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleEditClick = () => fileInputRef.current?.click()

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > 12 * 1024 * 1024) {
      toast.error('Image must be under 12MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setCropperSrc(reader.result as string)
      setCropperOpen(true)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleCropSave = async (blob: Blob) => {
    setUploading(true)
    const formData = new FormData()
    formData.append('file', blob, 'banner.jpg')
    try {
      const res = await fetch('/api/profile/banner-upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(err.error || 'Upload failed')
      }
      const data = await res.json()
      onBannerChange(data.url)
      toast.success('Banner updated')
      setCropperOpen(false)
      setCropperSrc(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload banner')
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      {/* Contained banner. Rounded parent handles corner masking. */}
      <div className="relative w-full h-32 sm:h-40 md:h-52 lg:h-60 xl:h-64 overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#0a0a0f] to-[#1e3a5f] group">
        {bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bannerUrl} alt="Profile banner" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {/* Subtle grid pattern for empty state */}
            <div className="absolute inset-0 opacity-[0.04]" style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }} />
          </div>
        )}

        {/* Depth gradient for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

        {isOwner && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelected}
            />

            <AnimatePresence>
              {uploading ? (
                <motion.div
                  key="uploading"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center"
                >
                  <div className="flex items-center gap-2.5 bg-black/80 border border-white/10 rounded-full px-4 py-2">
                    <Spinner className="w-4 h-4 text-white animate-spin" weight="bold" />
                    <span className="text-[12px] font-mono uppercase tracking-wider text-white/80">Uploading</span>
                  </div>
                </motion.div>
              ) : (
                <motion.button
                  key="edit-btn"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={handleEditClick}
                  className="absolute top-3 right-3 md:top-4 md:right-4 flex items-center gap-1.5 h-8 px-3 rounded-lg bg-black/60 backdrop-blur-md border border-white/[0.12] text-white text-[12px] font-medium opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                >
                  <PencilSimple className="w-3.5 h-3.5" weight="bold" />
                  Edit Cover
                </motion.button>
              )}
            </AnimatePresence>

            {!bannerUrl && !uploading && (
              <button
                onClick={handleEditClick}
                className="absolute inset-0 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
              >
                <div className="flex items-center gap-2 bg-white/[0.06] backdrop-blur-md border border-white/[0.15] rounded-full px-4 py-2">
                  <Camera className="w-4 h-4 text-white" weight="bold" />
                  <span className="text-[12px] font-medium text-white">Add a cover image</span>
                </div>
              </button>
            )}
          </>
        )}
      </div>

      {cropperOpen && cropperSrc && (
        <ImageCropperModal
          imageSrc={cropperSrc}
          aspectRatio={BANNER_ASPECT}
          shape="rect"
          title="Edit Cover"
          onSave={handleCropSave}
          onCancel={() => { setCropperOpen(false); setCropperSrc(null) }}
        />
      )}
    </>
  )
}