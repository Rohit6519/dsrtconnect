'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { PencilSimple, VideoCamera, Plus, Trash, Check } from '@phosphor-icons/react'
import { MarkdownEditor } from './MarkdownEditor'
import { ImageCropperModal } from './ImageCropperModal'
import { DsrtPanel, DsrtButton } from '@/components/dsrt'

interface ProjectImage {
  id: string
  url: string
  caption: string | null
  type: string
  position: number
}

interface Props {
  slug: string
  aboutContent: string | null
  images: ProjectImage[]
  isOwner: boolean
  onSaveAbout: (content: string) => Promise<void>
  onAddImage: (url: string, type: string) => Promise<void>
  onDeleteImage: (id: string) => Promise<void>
  onUploadFile: (file: File, kind: 'gallery') => Promise<string | null>
}

const MAX_IMAGES = 2
const MAX_VIDEOS = 1

export function ProjectAbout({
  slug, aboutContent, images, isOwner,
  onSaveAbout, onAddImage, onDeleteImage, onUploadFile
}: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(aboutContent || '')
  const [saving, setSaving] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const [cropperSrc, setCropperSrc] = useState<string | null>(null)

  useEffect(() => { setDraft(aboutContent || '') }, [aboutContent])

  const imageCount = images.filter(i => i.type === 'image').length
  const videoCount = images.filter(i => i.type === 'video').length

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSaveAbout(draft)
      setEditing(false)
    } finally { setSaving(false) }
  }

  const handleCancel = () => {
    setDraft(aboutContent || '')
    setEditing(false)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (imageCount >= MAX_IMAGES) { alert('Max ' + MAX_IMAGES + ' images'); e.target.value=''; return }
    const reader = new FileReader()
    reader.onload = () => setCropperSrc(reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleCropConfirm = async (blob: Blob) => {
    const file = new File([blob], 'gallery.jpg', { type: 'image/jpeg' })
    const url = await onUploadFile(file, 'gallery')
    if (url) await onAddImage(url, 'image')
    setCropperSrc(null)
  }

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (videoCount >= MAX_VIDEOS) { alert('Max ' + MAX_VIDEOS + ' video'); e.target.value=''; return }
    if (file.size > 50 * 1024 * 1024) { alert('Video too large (max 50MB)'); e.target.value=''; return }
    const url = await onUploadFile(file, 'gallery')
    if (url) await onAddImage(url, 'video')
    e.target.value = ''
  }

  return (
    <DsrtPanel padding="none" variant="default" className="overflow-hidden mb-6">
      <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/[0.06]">
        <h2 className="text-[16px] font-semibold text-white">About the project</h2>
        {isOwner && !editing && (
          <DsrtButton size="xs" variant="outline" onClick={() => setEditing(true)}>
            <PencilSimple size={12} /> Edit
          </DsrtButton>
        )}
      </div>

      <div className="p-4 sm:p-6">
        {editing ? (
          <>
            <MarkdownEditor
              value={draft}
              onChange={setDraft}
              placeholder="Describe your project in detail..."
              minHeight={200}
              maxLength={10000}
            />
            <div className="flex items-center justify-end gap-2 mt-4">
              <DsrtButton size="sm" variant="ghost" onClick={handleCancel} disabled={saving}>Cancel</DsrtButton>
              <DsrtButton size="sm" variant="primary" onClick={handleSave} loading={saving}>
                <Check size={13} weight="bold" /> Save
              </DsrtButton>
            </div>
          </>
        ) : aboutContent ? (
          <div className="prose prose-invert prose-sm max-w-none text-[14px] text-white/80 leading-relaxed prose-a:text-[#93c5fd]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{aboutContent}</ReactMarkdown>
          </div>
        ) : (
          <div className="py-8 text-center text-white/50 text-[13px]">
            {isOwner ? 'No description added yet.' : 'No description provided.'}
          </div>
        )}

        {(images.length > 0 || isOwner) && (
          <div className="mt-6 pt-6 border-t border-white/[0.06]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono uppercase tracking-wider text-white/40">Media</span>
              {isOwner && (
                <div className="flex gap-2">
                  {imageCount < MAX_IMAGES && (
                    <DsrtButton size="xs" variant="outline" onClick={() => imageInputRef.current?.click()}>
                      <Plus size={11} /> Image
                    </DsrtButton>
                  )}
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {images.map(img => (
                <div key={img.id} className="relative aspect-video rounded-xl overflow-hidden bg-black/40 border border-white/[0.08] group">
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                  {isOwner && (
                    <button onClick={() => onDeleteImage(img.id)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {cropperSrc && (
        <ImageCropperModal
          imageSrc={cropperSrc}
          aspect={16 / 9}
          onCancel={() => setCropperSrc(null)}
          onConfirm={handleCropConfirm}
        />
      )}
    </DsrtPanel>
  )
}