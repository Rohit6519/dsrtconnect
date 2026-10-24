// components/projects/create/steps/IdentityStep.tsx
'use client'

import { useRef, useState } from 'react'
import { Image as ImageIcon, Upload, CircleNotch } from '@phosphor-icons/react'
import { useProjectCreationStore } from '@/stores/projectCreationStore'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { ImageCropperModal } from '@/components/project-detail/ImageCropperModal'

const PROJECT_TYPES = [
  { id: 'software', label: 'Software' },
  { id: 'hardware', label: 'Hardware' },
  { id: 'research', label: 'Research' },
  { id: 'engineering', label: 'Engineering' },
  { id: 'open-source', label: 'Open Source' },
  { id: 'academic', label: 'Academic' },
  { id: 'design', label: 'Design' },
  { id: 'creative', label: 'Creative' },
  { id: 'experiment', label: 'Experiment' },
  { id: 'community', label: 'Community' },
  { id: 'other', label: 'Other' },
]

export function IdentityStep() {
  const { data, updateData } = useProjectCreationStore()
  const supabase = createClient()

  const coverInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const [cropperSrc, setCropperSrc] = useState<string | null>(null)
  const [cropperKind, setCropperKind] = useState<'logo_url' | 'cover_image_url' | null>(null)
  const [cropperAspect, setCropperAspect] = useState<number>(1)

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'cover_image_url' | 'logo_url'
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      e.target.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be under 5MB')
      e.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setCropperSrc(reader.result as string)
      setCropperKind(type)
      setCropperAspect(type === 'logo_url' ? 1 : 16 / 9)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleCropConfirm = async (blob: Blob) => {
    if (!cropperKind) return
    
    const setLoading = cropperKind === 'logo_url' ? setUploadingLogo : setUploadingCover
    setLoading(true)
    setCropperSrc(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Unauthorized')

      const namespace = data.id || user.id
      const filename = `${namespace}/${cropperKind}-${Date.now()}.jpg`
      const file = new File([blob], filename, { type: 'image/jpeg' })

      const { error: uploadError } = await supabase.storage
        .from('projects')
        .upload(filename, file, { upsert: true, contentType: 'image/jpeg' })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('projects').getPublicUrl(filename)

      updateData({ [cropperKind]: publicUrl })
      toast.success('Image uploaded')
    } catch (err: any) {
      toast.error(err.message || 'Upload failed.')
    } finally {
      setLoading(false)
      setCropperKind(null)
    }
  }

  return (
    <>
      <div className="space-y-6">
        {/* Name */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[13px] font-medium text-white/90">
              Project Name *
            </label>
            <span className="text-white/30 font-mono text-[11px]">
              {data.name?.length || 0}/80
            </span>
          </div>
          <input
            autoFocus
            value={data.name || ''}
            onChange={e => updateData({ name: e.target.value })}
            placeholder="e.g. NILM Fault Detection"
            maxLength={80}
            className="w-full h-10 px-3 rounded-md bg-[#050505] border border-white/10 text-white text-[13px] placeholder:text-white/30 focus:outline-none focus:border-[#4F7CFF] focus:ring-1 focus:ring-[#4F7CFF] transition-all"
          />
          <p className="text-[12px] text-white/40 leading-relaxed">
            Use a name people can easily remember and search for across DSRT.
          </p>
        </div>

        {/* Primary Type */}
        <div className="space-y-2">
          <label className="text-[13px] font-medium text-white/90 block">
            Primary Project Type *
          </label>
          <div className="flex flex-wrap gap-2">
            {PROJECT_TYPES.map(t => {
              const active = data.project_type === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => updateData({ project_type: t.id })}
                  className={`px-3 h-8 rounded-md text-[12px] font-medium transition-all border ${
                    active
                      ? 'bg-white text-black border-white font-semibold'
                      : 'bg-[#050505] border-white/10 text-white/70 hover:text-white hover:border-white/25'
                  }`}
                >
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tagline */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[13px] font-medium text-white/90">
              Short Tagline *
            </label>
            <span className="text-white/30 font-mono text-[11px]">
              {data.tagline?.length || 0}/160
            </span>
          </div>
          <textarea
            value={data.tagline || ''}
            onChange={e => updateData({ tagline: e.target.value })}
            placeholder="Describe your project in one sentence (e.g. Real-time electrical appliance fault detection from load signatures)."
            maxLength={160}
            rows={2}
            className="w-full p-3 rounded-md bg-[#050505] border border-white/10 text-white text-[13px] placeholder:text-white/30 focus:outline-none focus:border-[#4F7CFF] focus:ring-1 focus:ring-[#4F7CFF] transition-all resize-none leading-relaxed"
          />
        </div>

        {/* Visual Assets */}
        <div className="pt-4 border-t border-white/[0.06] space-y-4">
          <label className="text-[13px] font-medium text-white/90 block">
            Project Visuals (Optional)
          </label>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Cover */}
            <div className="space-y-2">
              <p className="text-[12px] text-white/60">Project Cover (16:9)</p>
              <div
                onClick={() => coverInputRef.current?.click()}
                className="w-full aspect-[16/9] rounded-md border border-dashed border-white/15 hover:border-white/30 bg-[#050505] hover:bg-white/[0.02] transition-all cursor-pointer flex flex-col items-center justify-center relative overflow-hidden group"
              >
                {data.cover_image_url ? (
                  <>
                    <img src={data.cover_image_url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[12px] font-medium text-white">Change cover</span>
                    </div>
                  </>
                ) : uploadingCover ? (
                  <CircleNotch size={20} className="text-white/40 animate-spin" />
                ) : (
                  <>
                    <ImageIcon size={20} className="text-white/30 mb-1" />
                    <span className="text-[12px] text-white/40">Upload cover image</span>
                  </>
                )}
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => handleFileSelect(e, 'cover_image_url')}
                />
              </div>
            </div>

            {/* Logo */}
            <div className="space-y-2">
              <p className="text-[12px] text-white/60">Project Logo (1:1)</p>
              <div className="flex items-start gap-4">
                <div
                  onClick={() => logoInputRef.current?.click()}
                  className="w-20 h-20 rounded-md border border-dashed border-white/15 hover:border-white/30 bg-[#050505] hover:bg-white/[0.02] transition-all cursor-pointer flex flex-col items-center justify-center relative overflow-hidden group shrink-0"
                >
                  {data.logo_url ? (
                    <>
                      <img src={data.logo_url} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-[10px] font-medium text-white">Change</span>
                      </div>
                    </>
                  ) : uploadingLogo ? (
                    <CircleNotch size={18} className="text-white/40 animate-spin" />
                  ) : (
                    <Upload size={18} className="text-white/30" />
                  )}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => handleFileSelect(e, 'logo_url')}
                  />
                </div>
                <div className="pt-1">
                  <p className="text-[11px] text-white/40 leading-relaxed">
                    Used as your project avatar across DSRT. If skipped, we generate a letter fallback.
                  </p>
                  {data.logo_url && (
                    <button
                      type="button"
                      onClick={() => updateData({ logo_url: null })}
                      className="text-[11px] text-red-400 hover:text-red-300 font-medium mt-1.5"
                    >
                      Remove logo
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {cropperSrc && (
        <ImageCropperModal
          imageSrc={cropperSrc}
          aspect={cropperAspect}
          cropShape="rect"
          onCancel={() => { setCropperSrc(null); setCropperKind(null) }}
          onConfirm={handleCropConfirm}
        />
      )}
    </>
  )
}