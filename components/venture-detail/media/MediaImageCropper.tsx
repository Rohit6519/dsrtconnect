'use client'

import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import {
  X, ArrowClockwise, ArrowCounterClockwise, FlipHorizontal, FlipVertical,
  MagnifyingGlassPlus, MagnifyingGlassMinus, CircleNotch, Check
} from '@phosphor-icons/react'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onClose: () => void
  imageUrl: string
  onSave: (cropMetadata: any) => Promise<void>
  initialCrop?: any
}

interface AspectPreset {
  label: string
  value: number | undefined
}

const ASPECT_PRESETS: AspectPreset[] = [
  { label: 'Free', value: undefined },
  { label: '1:1', value: 1 },
  { label: '16:9', value: 16 / 9 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:2', value: 3 / 2 },
]

export function MediaImageCropper({ open, onClose, imageUrl, onSave, initialCrop }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState<number>(initialCrop?.zoom || 1)
  const [rotation, setRotation] = useState<number>(initialCrop?.rotation || 0)
  const [flipH, setFlipH] = useState<boolean>(initialCrop?.flipH || false)
  const [flipV, setFlipV] = useState<boolean>(initialCrop?.flipV || false)
  const [aspect, setAspect] = useState<number | undefined>(initialCrop?.aspect ?? undefined)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const onCropComplete = useCallback((_croppedArea: any, pixels: any) => {
    setCroppedAreaPixels(pixels)
  }, [])

  const handleSave = async () => {
    if (!croppedAreaPixels) {
      toast.error('Please adjust the crop first')
      return
    }
    setSaving(true)
    try {
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
        updated_at: new Date().toISOString(),
      }
      await onSave(cropMetadata)
      toast.success('Crop saved')
      onClose()
    } catch (e: any) {
      toast.error(e.message || 'Failed to save crop')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[210] bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0d0d10] border border-zinc-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-[15px] font-bold text-white">Edit Image</h2>
            <p className="text-[11.5px] text-zinc-500 mt-0.5">
              Adjust crop, rotation, and orientation. Original is preserved.
            </p>
          </div>
          <button onClick={onClose} disabled={saving} className="w-8 h-8 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-colors disabled:opacity-50">
            <X size={14} />
          </button>
        </div>

        {/* Aspect ratio selector */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 w-fit">
            {ASPECT_PRESETS.map(preset => (
              <button
                key={preset.label}
                onClick={() => setAspect(preset.value)}
                className={
                  'px-3 h-7 rounded text-[11.5px] font-semibold transition-colors ' +
                  (aspect === preset.value
                    ? 'bg-white text-black'
                    : 'text-zinc-400 hover:text-white')
                }
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cropper canvas */}
        <div className="p-6">
          <div
            className="relative w-full bg-black rounded-2xl overflow-hidden"
            style={{
              height: '400px',
              transform: `scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
            }}
          >
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect as any}
              showGrid={true}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
            />
          </div>

          {/* Controls */}
          <div className="mt-4 space-y-3">
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

            <div className="flex items-center gap-2">
              <button onClick={() => setRotation(r => r - 90)} className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-[11.5px] font-semibold text-zinc-300 transition-colors">
                <ArrowCounterClockwise size={12} /> Rotate left
              </button>
              <button onClick={() => setRotation(r => r + 90)} className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-[11.5px] font-semibold text-zinc-300 transition-colors">
                <ArrowClockwise size={12} /> Rotate right
              </button>
              <button onClick={() => setFlipH(!flipH)} className={'flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg border text-[11.5px] font-semibold transition-colors ' + (flipH ? 'bg-white text-black border-white' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 text-zinc-300')}>
                <FlipHorizontal size={12} /> Flip H
              </button>
              <button onClick={() => setFlipV(!flipV)} className={'flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg border text-[11.5px] font-semibold transition-colors ' + (flipV ? 'bg-white text-black border-white' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 text-zinc-300')}>
                <FlipVertical size={12} /> Flip V
              </button>
            </div>

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

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/30 flex justify-end gap-2">
          <button onClick={onClose} disabled={saving} className="px-4 h-9 text-[12.5px] font-semibold text-zinc-400 hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !croppedAreaPixels}
            className="inline-flex items-center gap-1.5 px-5 h-9 bg-white text-black rounded-lg text-[12.5px] font-bold hover:bg-zinc-100 disabled:opacity-50"
          >
            {saving ? <><CircleNotch size={13} className="animate-spin" /> Saving…</> : <><Check size={13} weight="bold" /> Save crop</>}
          </button>
        </div>
      </div>
    </div>
  )
}