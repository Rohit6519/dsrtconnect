'use client'

import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { X, RotateCw, ZoomIn, Sun, Contrast, Palette, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  imageSrc: string
  onClose: () => void
  onSave: (croppedBlob: Blob) => Promise<void>
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: any,
  rotation: number,
  filters: { brightness: number; contrast: number; saturation: number }
): Promise<Blob> {
  const image = new window.Image()
  image.crossOrigin = 'anonymous'
  image.src = imageSrc
  await new Promise((resolve, reject) => {
    image.onload = () => resolve(true)
    image.onerror = reject
  })

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No canvas context')

  const maxSize = Math.max(image.width, image.height)
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2))

  canvas.width = safeArea
  canvas.height = safeArea

  ctx.translate(safeArea / 2, safeArea / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.translate(-safeArea / 2, -safeArea / 2)

  ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%)`
  ctx.drawImage(image, safeArea / 2 - image.width * 0.5, safeArea / 2 - image.height * 0.5)

  const data = ctx.getImageData(0, 0, safeArea, safeArea)
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  ctx.putImageData(
    data,
    0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x,
    0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to convert to blob'))),
      'image/jpeg',
      0.92
    )
  })
}

export function ImageCropperModal({ imageSrc, onClose, onSave }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [saving, setSaving] = useState(false)

  const onCropComplete = useCallback((_: any, croppedPixels: any) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  const handleSave = async () => {
    if (!croppedAreaPixels) return
    setSaving(true)
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation, {
        brightness,
        contrast,
        saturation,
      })
      await onSave(blob)
      onClose()
    } catch (err) {
      console.error('[Cropper]', err)
    } finally {
      setSaving(false)
    }
  }

  const cssFilter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-[720px] bg-[#0A0D14] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-[16px] font-semibold text-white">Edit your photo</h2>
            <p className="text-[12px] text-white/50 mt-0.5">Crop, rotate, and adjust before saving.</p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-white/[0.06] text-white/60 hover:text-white transition-all disabled:opacity-30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cropper Area with filter applied via inline style on wrapper */}
        <div
          className="relative w-full h-[380px] bg-black overflow-hidden"
          style={{ filter: cssFilter }}
        >
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            cropShape="round"
            showGrid={true}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Controls */}
        <div className="p-6 space-y-4 border-t border-white/[0.06] bg-[#0C0C0E]">
          <div className="grid grid-cols-2 gap-6">
            <div className="flex items-center gap-3">
              <ZoomIn className="w-4 h-4 text-white/50 flex-shrink-0" />
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#4F7CFF]"
              />
              <span className="text-[11px] text-white/50 w-9 text-right font-mono">
                {zoom.toFixed(1)}x
              </span>
            </div>

            <div className="flex items-center gap-3">
              <RotateCw className="w-4 h-4 text-white/50 flex-shrink-0" />
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#4F7CFF]"
              />
              <span className="text-[11px] text-white/50 w-9 text-right font-mono">{rotation}°</span>
            </div>
          </div>

          <div className="border-t border-white/[0.04] pt-4">
            <p className="text-[10px] font-bold text-white/40 tracking-widest uppercase mb-3">
              Adjustments
            </p>

            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-3">
                <Sun className="w-4 h-4 text-white/50 flex-shrink-0" />
                <input
                  type="range"
                  min={50}
                  max={200}
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#4F7CFF]"
                />
                <span className="text-[11px] text-white/50 w-9 text-right font-mono">{brightness}</span>
              </div>

              <div className="flex items-center gap-3">
                <Contrast className="w-4 h-4 text-white/50 flex-shrink-0" />
                <input
                  type="range"
                  min={50}
                  max={200}
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#4F7CFF]"
                />
                <span className="text-[11px] text-white/50 w-9 text-right font-mono">{contrast}</span>
              </div>

              <div className="flex items-center gap-3">
                <Palette className="w-4 h-4 text-white/50 flex-shrink-0" />
                <input
                  type="range"
                  min={0}
                  max={200}
                  value={saturation}
                  onChange={(e) => setSaturation(Number(e.target.value))}
                  className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#4F7CFF]"
                />
                <span className="text-[11px] text-white/50 w-9 text-right font-mono">{saturation}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-white/[0.06] bg-[#0A0D14]">
          <button
            onClick={() => {
              setBrightness(100)
              setContrast(100)
              setSaturation(100)
              setZoom(1)
              setRotation(0)
            }}
            disabled={saving}
            className="h-9 px-4 rounded-md text-[13px] font-medium text-white/60 hover:text-white hover:bg-white/[0.04] transition-all"
          >
            Reset all
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="h-9 px-4 rounded-md text-[13px] font-medium text-white/60 hover:text-white hover:bg-white/[0.04] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !croppedAreaPixels}
              className={cn(
                'h-9 px-5 rounded-md text-[13px] font-semibold flex items-center justify-center gap-2 transition-all',
                'bg-[#4F7CFF] hover:bg-[#3D6BF5] text-white disabled:opacity-50'
              )}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save photo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}