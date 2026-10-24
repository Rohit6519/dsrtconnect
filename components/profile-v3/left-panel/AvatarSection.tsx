'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { Camera, CheckCircle, Spinner, User } from '@phosphor-icons/react'
import { ImageCropperModal } from '../shared/ImageCropperModal'
import { cn } from '@/lib/utils'

interface AvatarSectionProps {
  avatarUrl: string | null
  fullName: string
  isVerified: boolean
  isOwner: boolean
  onAvatarChange: (newUrl: string) => void
}

export function AvatarSection({
  avatarUrl,
  fullName,
  isVerified,
  isOwner,
  onAvatarChange,
}: AvatarSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cropperOpen, setCropperOpen] = useState(false)
  const [cropperSrc, setCropperSrc] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const initials = fullName
    ? fullName.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0]).join('').toUpperCase()
    : '?'

  const handleEditClick = () => fileInputRef.current?.click()

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > 6 * 1024 * 1024) {
      toast.error('Image must be under 6MB')
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
    formData.append('file', blob, 'avatar.jpg')
    try {
      const res = await fetch('/api/profile/avatar-upload', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(err.error || 'Upload failed')
      }
      const data = await res.json()
      onAvatarChange(data.url)
      toast.success('Avatar updated')
      setCropperOpen(false)
      setCropperSrc(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload avatar')
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <div className="relative inline-block group">
        {/* Avatar Ring - formal, professional treatment */}
        <div
          className={cn(
            'w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full overflow-hidden',
            'bg-gradient-to-br from-[#1e3a5f] to-[#0a0a0f]',
            'border-4 border-[#05070D]',
            'shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.08)]',
            'relative',
          )}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={fullName || 'Avatar'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {fullName ? (
                <span className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white/80 tracking-tight">{initials}</span>
              ) : (
                <User className="w-12 h-12 text-white/40" weight="duotone" />
              )}
            </div>
          )}

          {/* Owner hover overlay */}
          {isOwner && !uploading && (
            <button
              type="button"
              onClick={handleEditClick}
              className={cn(
                'absolute inset-0 flex flex-col items-center justify-center gap-1',
                'bg-black/60 backdrop-blur-[2px]',
                'opacity-0 group-hover:opacity-100',
                'transition-opacity duration-200',
                'cursor-pointer',
              )}
              aria-label="Edit photo"
            >
              <Camera className="w-5 h-5 text-white" weight="bold" />
              <span className="text-[9px] font-mono uppercase tracking-wider text-white">
                Edit
              </span>
            </button>
          )}

          {isOwner && uploading && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <Spinner className="w-6 h-6 text-white animate-spin" weight="bold" />
            </div>
          )}
        </div>

        {/* Camera badge - subtle formal treatment */}
        {isOwner && !uploading && (
          <button
            type="button"
            onClick={handleEditClick}
            className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-gradient-to-b from-[#1e3a5f] to-[#2c5282] text-white flex items-center justify-center border-2 border-[#05070D] shadow-lg hover:scale-110 transition-all z-10"
            title="Edit avatar"
          >
            <Camera className="w-3.5 h-3.5" weight="bold" />
          </button>
        )}

        {/* Verified badge for visitors */}
        {isVerified && !isOwner && (
          <div className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-gradient-to-b from-blue-500 to-blue-700 text-white flex items-center justify-center border-2 border-[#05070D] shadow-lg">
            <CheckCircle className="w-4 h-4" weight="fill" />
          </div>
        )}

        {isOwner && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelected}
          />
        )}
      </div>

      {cropperOpen && cropperSrc && (
        <ImageCropperModal
          imageSrc={cropperSrc}
          aspectRatio={1}
          shape="round"
          title="Edit Profile Photo"
          onSave={handleCropSave}
          onCancel={() => {
            setCropperOpen(false)
            setCropperSrc(null)
          }}
        />
      )}
    </>
  )
}