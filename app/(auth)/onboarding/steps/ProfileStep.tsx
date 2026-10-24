'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Upload, User, Loader2 } from 'lucide-react'
import { useOnboardingV2Store } from '@/stores/onboardingV2Store'
import { LocationAutocomplete, type LocationData } from '@/components/primitives/LocationAutocomplete'
import { ImageCropperModal } from '@/components/primitives/ImageCropperModal'
import { OnboardingFooter } from '@/components/onboarding/OnboardingFooter'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

export function ProfileStep() {
  const {
    data,
    updateData,
    isSaving,
    setSaving,
    setCurrentStep,
    setStepStates,
    setOnboardingState,
  } = useOnboardingV2Store()

  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [displayName, setDisplayName] = useState(data.display_name || '')
  const [locationData, setLocationData] = useState<LocationData | null>(data.location_data)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(data.avatar_url)
  const [avatarStatus, setAvatarStatus] = useState(data.avatar_status)
  const [uploading, setUploading] = useState(false)
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!displayName) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.user_metadata?.full_name) setDisplayName(user.user_metadata.full_name)
      })
    }
  }, [])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be less than 5MB')
      return
    }

    const reader = new FileReader()
    reader.onload = () => setPendingImageSrc(reader.result as string)
    reader.readAsDataURL(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleCropperSave = async (blob: Blob) => {
    setUploading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const filePath = `${user.id}/avatar.jpg`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, { upsert: true, contentType: 'image/jpeg' })

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath)
      const cacheBustedUrl = `${publicUrl}?v=${Date.now()}`

      setAvatarUrl(cacheBustedUrl)
      setAvatarStatus('UPLOADED')
      toast.success('Photo updated')
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
      throw err
    } finally {
      setUploading(false)
    }
  }

  const handleRemovePhoto = () => {
    setAvatarUrl(null)
    setAvatarStatus('NOT_SET')
  }

  const handleSave = async (isSkipping = false) => {
    if (!displayName || displayName.trim().length < 2) {
      toast.error('Display name must be at least 2 characters')
      return
    }
    setSaving(true)
    try {
      const finalAvatarStatus = isSkipping && !avatarUrl ? 'SKIPPED' : avatarStatus
      const res = await fetch('/api/onboarding/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'profile',
          status: 'COMPLETED',
          data: {
            display_name: displayName.trim(),
            location_data: locationData,
            avatar_url: avatarUrl,
            avatar_status: finalAvatarStatus,
          },
        }),
      })

      const responseData = await res.json()
      if (!res.ok) throw new Error(responseData.error || 'Save failed')

      updateData({
        display_name: displayName.trim(),
        location_data: locationData,
        avatar_url: avatarUrl,
        avatar_status: finalAvatarStatus,
      })
      setStepStates(responseData.step_states)
      setOnboardingState(responseData.onboarding_state)
      setCurrentStep('professional')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {pendingImageSrc && (
        <ImageCropperModal
          imageSrc={pendingImageSrc}
          onClose={() => setPendingImageSrc(null)}
          onSave={handleCropperSave}
        />
      )}

      <div className="space-y-8">
        {/* Photo */}
        <div>
          <label className="text-[14px] font-semibold text-white mb-3 block">Profile Photo</label>
          <div className="flex items-center gap-5">
            <div className="relative w-20 h-20 rounded-full bg-[#050505] border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="Profile" fill className="object-cover" unoptimized />
              ) : (
                <User className="w-8 h-8 text-white/20" />
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="h-9 px-3.5 rounded-md bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-[13px] font-semibold text-white transition-all flex items-center gap-2"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {avatarUrl ? 'Change photo' : 'Upload photo'}
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={uploading}
                    className="h-9 px-3 rounded-md text-[12px] font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-[11px] text-white/40">JPG, PNG, or WebP. Max 5MB.</p>
            </div>
          </div>
        </div>

        <div className="h-px w-full bg-white/[0.04]" />

        {/* Display Name */}
        <div className="space-y-2">
          <label className="text-[14px] font-semibold text-white">
            Display Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Alex Rivera"
            autoFocus
            className="w-full h-10 px-3 rounded-md bg-[#050505] border border-white/10 text-white text-[13px] placeholder:text-white/30 focus:outline-none focus:border-[#4F7CFF] focus:ring-1 focus:ring-[#4F7CFF] transition-all"
          />
          <p className="text-[11px] text-white/40">
            How your name appears across DSRT Connect.
          </p>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <label className="text-[14px] font-semibold text-white">Location</label>
          <LocationAutocomplete
            value={locationData}
            onChange={setLocationData}
            placeholder="City, Region — where you are based"
          />
          <p className="text-[11px] text-white/40">
            Optional. Helps you match with nearby builders, local events, and region-specific opportunities.
          </p>
        </div>

        <OnboardingFooter
          canContinue={displayName.trim().length >= 2}
          onBack={() => setCurrentStep('identity')}
          onContinue={() => handleSave(false)}
          onSkip={
            (!avatarUrl || !locationData) && displayName.trim().length >= 2
              ? () => handleSave(true)
              : undefined
          }
          isSaving={isSaving}
        />
      </div>
    </>
  )
}