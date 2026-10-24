'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface UploadResult {
  file_id: string
  storage_key: string
  storage_bucket: string
  public_url: string
}

export function useSignedUpload() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const upload = async (
    file: File,
    opts?: { entity_type?: string; entity_id?: string; visibility?: 'PRIVATE' | 'PUBLIC' | 'COMMUNITY' }
  ): Promise<UploadResult | null> => {
    setUploading(true)
    setError(null)
    setProgress(10)

    const supabase = createClient()
    const entityType = opts?.entity_type ?? 'community_draft'
    const defaultBucket = 'community-assets'

    try {
      // 1) Request upload intent from backend
      let intentJson: any = null
      try {
        const intentRes = await fetch('/api/v1/files/upload-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            expected_size: file.size,
            expected_mime: file.type || 'image/png',
            original_name: file.name,
            entity_type: entityType,
            entity_id: opts?.entity_id ?? null,
            bucket: defaultBucket,
            visibility: opts?.visibility ?? 'PUBLIC',
          }),
        })
        if (intentRes.ok) {
          intentJson = await intentRes.json()
        }
      } catch {
        /* intent API unreachable, will trigger direct fallback */
      }

      const intent = intentJson?.data
      const bucket = intent?.storage_bucket || defaultBucket
      const key = intent?.storage_key || `${entityType}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${file.name.split('.').pop() || 'png'}`
      const token = intent?.token

      setProgress(40)

      // 2) Primary Upload Path (if signed URL token is present)
      if (token && intent?.file_id && !intent?.fallback_direct) {
        try {
          const { error: upErr } = await supabase.storage
            .from(bucket)
            .uploadToSignedUrl(key, token, file, {
              upsert: true,
              contentType: file.type || 'image/png',
            })

          if (!upErr) {
            setProgress(80)
            try {
              await fetch(`/api/v1/files/${intent.file_id}/finalize`, { method: 'POST' })
            } catch {
              /* ignore finalize fail */
            }

            const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(key)
            setProgress(100)
            return {
              file_id: intent.file_id,
              storage_bucket: bucket,
              storage_key: key,
              public_url: publicUrl.publicUrl,
            }
          }
        } catch {
          /* try direct fallback below */
        }
      }

      // 3) FALLBACK PATH: Direct Client Upload to Supabase Storage
      const bucketsToTry = [bucket, 'community-assets', 'media', 'avatars', 'public']
      let lastErr: any = null

      for (const b of bucketsToTry) {
        try {
          const { data, error: directErr } = await supabase.storage
            .from(b)
            .upload(key, file, {
              upsert: true,
              contentType: file.type || 'image/png',
            })

          if (!directErr && data) {
            const { data: publicUrl } = supabase.storage.from(b).getPublicUrl(data.path)
            setProgress(100)
            return {
              file_id: 'direct_' + Math.random().toString(36).slice(2, 9),
              storage_bucket: b,
              storage_key: data.path,
              public_url: publicUrl.publicUrl,
            }
          }
          lastErr = directErr
        } catch (e) {
          lastErr = e
        }
      }

      // 4) ULTIMATE FALLBACK: Convert image to Data URL if storage is unconfigured
      if (file.type.startsWith('image/')) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })

        setProgress(100)
        return {
          file_id: 'dataurl_' + Math.random().toString(36).slice(2, 9),
          storage_bucket: 'inline',
          storage_key: 'dataurl',
          public_url: dataUrl,
        }
      }

      throw new Error(lastErr?.message || 'Failed to upload file to storage')
    } catch (e: any) {
      setError(e?.message || 'Upload failed')
      return null
    } finally {
      setUploading(false)
    }
  }

  return { upload, uploading, progress, error }
}