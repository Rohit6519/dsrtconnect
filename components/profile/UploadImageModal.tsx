'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Cropper from 'react-easy-crop'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Upload, X, ZoomIn, ZoomOut, RotateCw, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'

interface UploadImageModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: 'avatar' | 'cover'
  userId: string
  currentUrl: string | null
}

// Utility to create cropped image
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0,
  outputWidth = 800
): Promise<Blob> {
  const image = new Image()
  image.crossOrigin = 'anonymous'
  
  await new Promise((resolve, reject) => {
    image.onload = resolve
    image.onerror = reject
    image.src = imageSrc
  })

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas context not available')

  // Set output dimensions
  const aspectRatio = pixelCrop.width / pixelCrop.height
  canvas.width = outputWidth
  canvas.height = outputWidth / aspectRatio

  // Rotation handling
  if (rotation !== 0) {
    const maxSize = Math.max(image.width, image.height)
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2))
    
    canvas.width = safeArea
    canvas.height = safeArea
    
    ctx.translate(safeArea / 2, safeArea / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.translate(-safeArea / 2, -safeArea / 2)
    
    ctx.drawImage(
      image,
      safeArea / 2 - image.width * 0.5,
      safeArea / 2 - image.height * 0.5
    )
    
    const data = ctx.getImageData(0, 0, safeArea, safeArea)
    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height
    ctx.putImageData(
      data,
      Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
      Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
    )
  } else {
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      canvas.width,
      canvas.height
    )
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Canvas is empty'))
      },
      'image/jpeg',
      0.92
    )
  })
}

export function UploadImageModal({
  open,
  onOpenChange,
  type,
  userId,
  currentUrl,
}: UploadImageModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [uploading, setUploading] = useState(false)

  const aspectRatio = type === 'avatar' ? 1 : 16 / 9
  const cropShape = type === 'avatar' ? 'round' : 'rect'

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    maxFiles: 1,
    maxSize: type === 'avatar' ? 5 * 1024 * 1024 : 10 * 1024 * 1024,
    onDrop: async (files) => {
      const file = files[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = () => {
        setImageSrc(reader.result as string)
        setZoom(1)
        setRotation(0)
        setCrop({ x: 0, y: 0 })
      }
      reader.readAsDataURL(file)
    },
    onDropRejected: () => {
      toast.error(`File too large. Max size: ${type === 'avatar' ? '5MB' : '10MB'}`)
    }
  })

  const onCropComplete = useCallback((_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleUpload = async () => {
    if (!imageSrc || !croppedAreaPixels) return

    setUploading(true)

    try {
      // Get cropped image blob
      const outputWidth = type === 'avatar' ? 800 : 1600
      const croppedBlob = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        rotation,
        outputWidth
      )

      // Convert blob to file
      const timestamp = Date.now()
      const ext = 'jpg'
      const path = `${userId}/${type}-${timestamp}.${ext}`
      const bucket = type === 'avatar' ? 'avatars' : 'covers'

      // Upload to Supabase
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, croppedBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/jpeg',
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw new Error(uploadError.message)
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path)

      // Update user profile
      const fieldName = type === 'avatar' ? 'avatar_url' : 'cover_url'
      const { error: updateError } = await supabase
        .from('users')
        .update({ [fieldName]: publicUrl })
        .eq('id', userId)

      if (updateError) {
        throw new Error(updateError.message)
      }

      toast.success(`${type === 'avatar' ? 'Profile photo' : 'Cover image'} updated`)
      router.refresh()
      handleClose()
    } catch (err: any) {
      console.error('Upload failed:', err)
      toast.error(`Upload failed: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    if (!confirm(`Remove ${type === 'avatar' ? 'profile photo' : 'cover image'}?`)) return
    
    setUploading(true)
    const fieldName = type === 'avatar' ? 'avatar_url' : 'cover_url'
    await supabase.from('users').update({ [fieldName]: null }).eq('id', userId)
    toast.success('Removed')
    router.refresh()
    setUploading(false)
    onOpenChange(false)
  }

  const handleClose = () => {
    setImageSrc(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
    setCroppedAreaPixels(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {type === 'avatar' ? 'Update Profile Photo' : 'Update Cover Image'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!imageSrc ? (
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors',
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/30'
              )}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="font-semibold mb-1">
                {isDragActive ? 'Drop image here' : 'Drag and drop an image'}
              </p>
              <p className="text-xs text-muted-foreground">
                or click to browse
              </p>
              <p className="text-[10px] text-muted-foreground mt-3">
                {type === 'avatar' 
                  ? 'JPG, PNG, WEBP • Max 5MB • Recommended: 400x400px'
                  : 'JPG, PNG, WEBP • Max 10MB • Recommended: 1600x900px'
                }
              </p>
            </div>
          ) : (
            <>
              <div className="relative w-full bg-black rounded-xl overflow-hidden" 
                style={{ height: type === 'avatar' ? '400px' : '300px' }}>
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={aspectRatio}
                  cropShape={cropShape}
                  showGrid={true}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onRotationChange={setRotation}
                  onCropComplete={onCropComplete}
                />
              </div>

              {/* Controls */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <ZoomOut className="w-4 h-4 text-muted-foreground" />
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="flex-1 accent-primary"
                  />
                  <ZoomIn className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs w-12 text-right font-mono">
                    {zoom.toFixed(1)}x
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <RotateCw className="w-4 h-4 text-muted-foreground" />
                  <input
                    type="range"
                    min={0}
                    max={360}
                    step={1}
                    value={rotation}
                    onChange={(e) => setRotation(Number(e.target.value))}
                    className="flex-1 accent-primary"
                  />
                  <span className="text-xs w-12 text-right font-mono">
                    {rotation}°
                  </span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Drag to reposition • Scroll or pinch to zoom
              </p>
            </>
          )}

          <div className="flex gap-2 pt-2 border-t">
            {currentUrl && !imageSrc && (
              <Button
                variant="outline"
                onClick={handleRemove}
                disabled={uploading}
                className="text-destructive hover:text-destructive"
              >
                Remove
              </Button>
            )}
            {imageSrc && (
              <Button
                variant="outline"
                onClick={() => setImageSrc(null)}
                disabled={uploading}
              >
                Change Image
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={uploading}
              className="flex-1"
            >
              Cancel
            </Button>
            {imageSrc && (
              <Button
                onClick={handleUpload}
                disabled={uploading || !croppedAreaPixels}
                className="flex-1"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}