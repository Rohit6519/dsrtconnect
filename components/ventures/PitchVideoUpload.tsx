'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useDropzone } from 'react-dropzone'
import { Video, X, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PitchVideoUploadProps {
  ventureId: string
  currentUrl: string | null
  onDone: () => void
}

export function PitchVideoUpload({
  ventureId,
  currentUrl,
  onDone,
}: PitchVideoUploadProps) {
  const router = useRouter()
  const supabase = createClient()
  const [uploading, setUploading] = useState(false)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'video/*': [] },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
    onDrop: async (files) => {
      const file = files[0]
      if (!file) return
      setUploading(true)

      const ext = file.name.split('.').pop()
      const path = `${ventureId}/pitch-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('venture-videos')
        .upload(path, file, { cacheControl: '3600', upsert: true })

      if (uploadError) {
        alert('Upload failed: ' + uploadError.message)
        setUploading(false)
        return
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('venture-videos').getPublicUrl(path)

      await supabase
        .from('startups')
        .update({ pitch_video_url: publicUrl })
        .eq('id', ventureId)

      setUploading(false)
      router.refresh()
      onDone()
    },
  })

  const removeVideo = async () => {
    if (!confirm('Remove pitch video?')) return
    await supabase
      .from('startups')
      .update({ pitch_video_url: null })
      .eq('id', ventureId)
    router.refresh()
    onDone()
  }

  return (
    <div className="space-y-3">
      {currentUrl ? (
        <div className="space-y-3">
          <video
            src={currentUrl}
            controls
            className="w-full rounded-xl bg-black"
          />
          <Button variant="outline" size="sm" onClick={removeVideo}>
            <X className="w-3.5 h-3.5 mr-1" />
            Remove video
          </Button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-border/40 hover:border-border'
          }`}
        >
          <input {...getInputProps()} />
          <Video className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-medium">
            {uploading ? 'Uploading...' : 'Upload pitch video'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Max 50MB. MP4 recommended. 30-90 seconds.
          </p>
        </div>
      )}
    </div>
  )
}