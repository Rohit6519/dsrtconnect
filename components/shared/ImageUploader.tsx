'use client'

import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { createClient } from '@/lib/supabase/client'
import { Upload, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageUploaderProps {
  bucket: string
  folder: string
  currentUrl?: string | null
  onUploaded: (url: string) => void
  aspect?: 'square' | 'cover'
  label?: string
}

export function ImageUploader({
  bucket,
  folder,
  currentUrl,
  onUploaded,
  aspect = 'square',
  label = 'Upload image',
}: ImageUploaderProps) {
  const supabase = createClient()
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentUrl || null)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    onDrop: async (files) => {
      const file = files[0]
      if (!file) return

      setUploading(true)
      const ext = file.name.split('.').pop()
      const path = `${folder}/${Date.now()}.${ext}`

      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { cacheControl: '3600', upsert: true })

      if (error) {
        alert('Upload failed: ' + error.message)
        setUploading(false)
        return
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(path)

      setPreview(publicUrl)
      onUploaded(publicUrl)
      setUploading(false)
    },
  })

  return (
    <div>
      {preview ? (
        <div className="relative inline-block">
          <img
            src={preview}
            alt=""
            className={cn(
              'object-cover rounded-xl',
              aspect === 'square' ? 'w-24 h-24' : 'w-full h-32'
            )}
          />
          <button
            type="button"
            onClick={() => {
              setPreview(null)
              onUploaded('')
            }}
            className="absolute top-1 right-1 bg-background/80 backdrop-blur-sm p-1 rounded-full"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-border/40 hover:border-border'
          )}
        >
          <input {...getInputProps()} />
          <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            {uploading ? 'Uploading...' : label}
          </p>
        </div>
      )}
    </div>
  )
}