'use client'

import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { X, Crop as CropIcon } from '@phosphor-icons/react'

interface Props {
  imageSrc: string
  aspect?: number  // 1 = square (logo), 16/6 = wide banner (cover), 4/3 = normal (gallery)
  cropShape?: 'rect' | 'round'
  onCancel: () => void
  onConfirm: (blob: Blob) => Promise<void> | void
}

// Utility to get cropped image blob
async function getCroppedBlob(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = imageSrc
  })

  const canvas = document.createElement('canvas')
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas context missing')

  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y,
    pixelCrop.width, pixelCrop.height,
    0, 0,
    pixelCrop.width, pixelCrop.height
  )

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Blob failed'))),
      'image/jpeg',
      0.92
    )
  })
}

export function ImageCropperModal({
  imageSrc,
  aspect = 1,
  cropShape = 'rect',
  onCancel,
  onConfirm,
}: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const onCropComplete = useCallback((_: any, cropped: any) => {
    setCroppedAreaPixels(cropped)
  }, [])

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return
    setSaving(true)
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels)
      await onConfirm(blob)
    } catch (e) {
      console.error('Crop failed:', e)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0f0f18] border border-white/[0.08] rounded-2xl w-full max-w-[720px] max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <CropIcon size={18} className="text-purple-400" />
            <h3 className="text-sm font-semibold text-white">Adjust image</h3>
          </div>
          <button onClick={onCancel} disabled={saving} className="text-zinc-500 hover:text-white disabled:opacity-50">
            <X size={20} />
          </button>
        </div>

        <div className="relative flex-1 bg-black" style={{ minHeight: '400px' }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={cropShape}
            showGrid={true}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            objectFit="contain"
          />
        </div>

        <div className="px-5 py-4 border-t border-white/[0.06] space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-zinc-500 min-w-[40px]">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-purple-500"
            />
            <span className="text-[11px] text-zinc-400 min-w-[40px] text-right">{zoom.toFixed(1)}x</span>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onCancel}
              disabled={saving}
              className="px-4 h-9 text-xs text-zinc-300 hover:text-white border border-white/[0.08] rounded-lg hover:bg-white/[0.04] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={saving || !croppedAreaPixels}
              className="px-5 h-9 text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                'Save crop'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
