'use client'

import { useState, useCallback, useRef } from 'react'
import Cropper from 'react-easy-crop'
import {
  X, ArrowClockwise, ArrowCounterClockwise, FlipHorizontal, FlipVertical,
  MagnifyingGlassPlus, MagnifyingGlassMinus, CircleNotch, Check, Trash,
  UploadSimple, Warning, DeviceMobile, Monitor, User as UserIcon
} from '@phosphor-icons/react'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onClose: () => void
  kind: 'logo' | 'cover'
  slug: string
  currentUrl?: string | null
  currentCropMetadata?: any
  onSuccess: (url: string, cropMetadata: any) => void
}

export function BrandAssetCropper({
  open, onClose, kind, slug, currentUrl, currentCropMetadata, onSuccess
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [flipH, setFlipH] = useState(false)
  const [flipV, setFlipV] = useState(false)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<'card' | 'profile' | 'mobile'>('card')

  const aspect = kind === 'logo' ? 1 : 3
  const cropShape = 'rect' as const
  const maxSize = kind === 'logo' ? 5 * 1024 * 1024 : 15 * 1024 * 1024

  const onCropComplete = useCallback((_: any, pixels: any) => {
    setCroppedAreaPixels(pixels)
  }, [])

  const handleFileSelect = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file')
      return
    }
    if (file.size > maxSize) {
      setError(`File too large. Max ${maxSize / (1024 * 1024)}MB`)
      return
    }
    setError(null)
    setSourceFile(file)
    setSourceUrl(URL.createObjectURL(file))
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
    setFlipH(false)
    setFlipV(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    handleFileSelect(e.dataTransfer.files?.[0])
  }

  const reset = () => {
    setSourceUrl(null)
    setSourceFile(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
    setFlipH(false)
    setFlipV(false)
    setError(null)
    setUploadProgress(0)
  }

  /**
   * Generate a cropped JPEG blob from the current crop selection.
   * Applies rotation and flips non-destructively (the raw file is still uploaded separately).
   */
  const generateCroppedBlob = async (): Promise<Blob> => {
    if (!sourceUrl || !croppedAreaPixels) throw new Error('No source or crop area')

    const image = new Image()
    image.crossOrigin = 'anonymous'
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Image load failed'))
      image.src = sourceUrl
    })

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas unavailable')

    const outputSize = kind === 'logo' ? 512 : 1600
    canvas.width = outputSize
    canvas.height = kind === 'logo' ? outputSize : Math.round(outputSize / aspect)

    // Handle rotation + flip via a working canvas
    const workCanvas = document.createElement('canvas')
    const workCtx = workCanvas.getContext('2d')
    if (!workCtx) throw new Error('Working canvas unavailable')

    const radians = (rotation * Math.PI) / 180
    const sin = Math.abs(Math.sin(radians))
    const cos = Math.abs(Math.cos(radians))
    workCanvas.width = image.width * cos + image.height * sin
    workCanvas.height = image.width * sin + image.height * cos

    workCtx.translate(workCanvas.width / 2, workCanvas.height / 2)
    workCtx.rotate(radians)
    workCtx.scale(flipH ? -1 : 1, flipV ? -1 : 1)
    workCtx.drawImage(image, -image.width / 2, -image.height / 2)

    // Draw cropped region to output
    ctx.drawImage(
      workCanvas,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0, 0,
      canvas.width, canvas.height
    )

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Canvas empty')),
        'image/jpeg',
        0.92
      )
    })
  }

  /**
   * Upload flow:
   * 1. Get signed upload URL from our API
   * 2. Upload cropped blob directly to Supabase Storage
   * 3. Commit the URL + crop metadata to the venture record
   */
  const handleUpload = async () => {
    if (!sourceFile || !croppedAreaPixels) {
      setError('Please crop the image first')
      return
    }
    setUploading(true)
    setError(null)
    setUploadProgress(10)

    try {
      const croppedBlob = await generateCroppedBlob()
      setUploadProgress(30)

      // Step 1: get signed URL
      const signRes = await fetch(`/api/ventures/${slug}/brand-assets/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          mime_type: 'image/jpeg',
          file_size: croppedBlob.size,
        }),
      })
      const signJson = await signRes.json()
      if (!signRes.ok) throw new Error(signJson.error || 'Failed to get upload URL')

      setUploadProgress(50)

      // Step 2: upload cropped blob directly to storage
      const uploadRes = await fetch(signJson.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body: croppedBlob,
      })
      if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`)

      setUploadProgress(80)

      // Step 3: commit to venture record with crop metadata
      const cropMetadata = {
        x: croppedAreaPixels.x,
        y: croppedAreaPixels.y,
        width: croppedAreaPixels.width,
        height: croppedAreaPixels.height,
        rotation,
        flipH,
        flipV,
        zoom,
        aspect,
        source_size: { width: 0, height: 0 },
        cropped_at: new Date().toISOString(),
      }

      const commitRes = await fetch(`/api/ventures/${slug}/brand-assets`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          public_url: signJson.public_url,
          storage_path: signJson.storage_path,
          crop_metadata: cropMetadata,
        }),
      })
      const commitJson = await commitRes.json()
      if (!commitRes.ok) throw new Error(commitJson.error || 'Failed to commit')

      setUploadProgress(100)
      toast.success(`${kind === 'logo' ? 'Logo' : 'Banner'} updated`)
      onSuccess(signJson.public_url, cropMetadata)
      reset()
      onClose()
    } catch (e: any) {
      console.error('Upload error:', e)
      setError(e.message || 'Upload failed')
      setUploadProgress(0)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    if (!confirm(`Remove current ${kind}?`)) return
    setUploading(true)
    try {
      const res = await fetch(`/api/ventures/${slug}/brand-assets?kind=${kind}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to remove')
      toast.success(`${kind === 'logo' ? 'Logo' : 'Banner'} removed`)
      onSuccess('', {})
      reset()
      onClose()
    } catch (e: any) {
      toast.error(e.message || 'Failed to remove')
    } finally {
      setUploading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#0d0d10] border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-[16px] font-bold text-white">
              {kind === 'logo' ? 'Update Logo' : 'Update Banner'}
            </h2>
            <p className="text-[11.5px] text-zinc-500 mt-0.5">
              {kind === 'logo'
                ? 'Square format · Recommended 512×512'
                : 'Wide format · Recommended 1600×533 (3:1)'}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="w-8 h-8 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!sourceUrl ? (
            /* ── Upload zone ── */
            <div className="p-8">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={e => handleFileSelect(e.target.files?.[0] || undefined)}
              />

              <div
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-700 hover:border-zinc-500 bg-zinc-900/40 hover:bg-zinc-900/60 rounded-2xl p-12 text-center cursor-pointer transition-all"
              >
                <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto mb-4">
                  <UploadSimple size={22} className="text-zinc-400" />
                </div>
                <p className="text-[14px] font-bold text-white mb-1">
                  Drop image here or click to browse
                </p>
                <p className="text-[12px] text-zinc-500">
                  JPG, PNG, WEBP, or GIF · Max {maxSize / (1024 * 1024)}MB
                </p>
              </div>

              {currentUrl && (
                <div className="mt-6 pt-6 border-t border-zinc-800">
                  <p className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 font-semibold mb-3">
                    Current {kind}
                  </p>
                  <div className="flex items-center gap-4">
                    <div className={
                      kind === 'logo'
                        ? 'w-20 h-20 rounded-xl overflow-hidden border border-zinc-800 flex-shrink-0'
                        : 'w-48 h-16 rounded-lg overflow-hidden border border-zinc-800 flex-shrink-0'
                    }>
                      <img src={currentUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                    <button
                      onClick={handleRemove}
                      disabled={uploading}
                      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-[12.5px] font-semibold text-red-300 transition-colors"
                    >
                      <Trash size={12} weight="bold" /> Remove {kind}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[12px] text-red-300">
                  <Warning size={14} className="flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          ) : (
            /* ── Cropper interface ── */
            <div className="flex flex-col lg:flex-row">
              {/* Cropper canvas */}
              <div className="flex-1 min-w-0 p-6">
                <div
                  className="relative w-full bg-black rounded-2xl overflow-hidden"
                  style={{
                    height: '440px',
                    // Apply flip via wrapper transform (react-easy-crop v5+ removed the `style` prop)
                    transform: `scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                  }}
                >
                  <Cropper
                    image={sourceUrl}
                    crop={crop}
                    zoom={zoom}
                    rotation={rotation}
                    aspect={aspect}
                    cropShape={cropShape}
                    showGrid={true}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onRotationChange={setRotation}
                    onCropComplete={onCropComplete}
                  />
                </div>

                {/* Controls */}
                <div className="mt-4 space-y-3">
                  {/* Zoom */}
                  <div className="flex items-center gap-3">
                    <MagnifyingGlassMinus size={14} className="text-zinc-500" />
                    <input
                      type="range"
                      min={1}
                      max={4}
                      step={0.1}
                      value={zoom}
                      onChange={e => setZoom(parseFloat(e.target.value))}
                      className="flex-1 accent-white"
                    />
                    <MagnifyingGlassPlus size={14} className="text-zinc-500" />
                    <span className="text-[10.5px] font-mono text-zinc-400 w-12 text-right tabular-nums">
                      {zoom.toFixed(1)}x
                    </span>
                  </div>

                  {/* Transform buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRotation(r => r - 90)}
                      className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-[11.5px] font-semibold text-zinc-300 transition-colors"
                      title="Rotate left"
                    >
                      <ArrowCounterClockwise size={12} /> Rotate left
                    </button>
                    <button
                      onClick={() => setRotation(r => r + 90)}
                      className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-[11.5px] font-semibold text-zinc-300 transition-colors"
                      title="Rotate right"
                    >
                      <ArrowClockwise size={12} /> Rotate right
                    </button>
                    <button
                      onClick={() => setFlipH(!flipH)}
                      className={
                        'flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg border text-[11.5px] font-semibold transition-colors ' +
                        (flipH
                          ? 'bg-white text-black border-white'
                          : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 text-zinc-300')
                      }
                    >
                      <FlipHorizontal size={12} /> Flip H
                    </button>
                    <button
                      onClick={() => setFlipV(!flipV)}
                      className={
                        'flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg border text-[11.5px] font-semibold transition-colors ' +
                        (flipV
                          ? 'bg-white text-black border-white'
                          : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 text-zinc-300')
                      }
                    >
                      <FlipVertical size={12} /> Flip V
                    </button>
                  </div>

                  {/* Rotation slider */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10.5px] font-mono uppercase tracking-widest text-zinc-500 w-14">Rotate</span>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      step={1}
                      value={rotation}
                      onChange={e => setRotation(parseInt(e.target.value))}
                      className="flex-1 accent-white"
                    />
                    <span className="text-[10.5px] font-mono text-zinc-400 w-12 text-right tabular-nums">{rotation}°</span>
                  </div>
                </div>
              </div>

              {/* Preview panel */}
              <div className="lg:w-[280px] lg:border-l border-zinc-800 p-6 bg-zinc-950/40">
                <p className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 font-semibold mb-3">
                  Preview
                </p>

                {/* Preview mode toggle */}
                <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 mb-4">
                  <button
                    onClick={() => setPreviewMode('card')}
                    className={
                      'flex-1 flex items-center justify-center gap-1 h-7 rounded text-[10.5px] font-semibold transition-colors ' +
                      (previewMode === 'card' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white')
                    }
                  >
                    <Monitor size={11} /> Card
                  </button>
                  <button
                    onClick={() => setPreviewMode('profile')}
                    className={
                      'flex-1 flex items-center justify-center gap-1 h-7 rounded text-[10.5px] font-semibold transition-colors ' +
                      (previewMode === 'profile' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white')
                    }
                  >
                    <UserIcon size={11} /> Profile
                  </button>
                  <button
                    onClick={() => setPreviewMode('mobile')}
                    className={
                      'flex-1 flex items-center justify-center gap-1 h-7 rounded text-[10.5px] font-semibold transition-colors ' +
                      (previewMode === 'mobile' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white')
                    }
                  >
                    <DeviceMobile size={11} /> Mobile
                  </button>
                </div>

                {/* Live preview */}
                <div className="rounded-xl bg-[#121215] border border-zinc-800 overflow-hidden">
                  {kind === 'logo' ? (
                    <div className="p-4 flex items-center gap-3">
                      <div className={
                        previewMode === 'profile' ? 'w-16 h-16 rounded-2xl overflow-hidden bg-zinc-800' :
                        previewMode === 'mobile' ? 'w-10 h-10 rounded-lg overflow-hidden bg-zinc-800' :
                        'w-12 h-12 rounded-xl overflow-hidden bg-zinc-800'
                      }>
                        {sourceUrl && (
                          <img
                            src={sourceUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            style={{
                              transform: `scale(${zoom}) rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                            }}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-white truncate">Your Venture</p>
                        <p className="text-[10.5px] text-zinc-500 truncate">Building the future</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className={
                        previewMode === 'mobile' ? 'w-full h-16 bg-zinc-800 overflow-hidden' :
                        'w-full h-24 bg-zinc-800 overflow-hidden'
                      }>
                        {sourceUrl && (
                          <img
                            src={sourceUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            style={{
                              transform: `scale(${zoom}) rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                            }}
                          />
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-[12px] font-bold text-white">Your Venture</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">Live preview on venture page</p>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={reset}
                  disabled={uploading}
                  className="mt-4 w-full h-8 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-[11.5px] font-semibold text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  Choose different image
                </button>
              </div>
            </div>
          )}

          {error && sourceUrl && (
            <div className="mx-6 mb-6 flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[12px] text-red-300">
              <Warning size={14} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        {sourceUrl && (
          <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/30">
            {uploading && (
              <div className="mb-3">
                <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
                  <span>Uploading…</span>
                  <span className="font-mono">{uploadProgress}%</span>
                </div>
                <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                disabled={uploading}
                className="px-4 h-9 text-[12.5px] font-semibold text-zinc-400 hover:text-white disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !croppedAreaPixels}
                className="inline-flex items-center gap-1.5 px-5 h-9 bg-white text-black rounded-lg text-[12.5px] font-bold hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? (
                  <><CircleNotch size={13} className="animate-spin" /> Uploading…</>
                ) : (
                  <><Check size={13} weight="bold" /> Save {kind === 'logo' ? 'Logo' : 'Banner'}</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}