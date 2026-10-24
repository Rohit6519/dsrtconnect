'use client'

import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
// Type defined locally — Area export path varies between react-easy-crop versions
type Area = { x: number; y: number; width: number; height: number }
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  X,
  Crop as CropIcon,
  MagicWand,
  Sliders,
  Sparkle,
  ArrowClockwise,
  Check,
} from '@phosphor-icons/react'

const FILTERS = [
  { id: 'none',     label: 'None',     css: '' },
  { id: 'grayscale',label: 'B&W',      css: 'grayscale(1)' },
  { id: 'sepia',    label: 'Sepia',    css: 'sepia(0.7)' },
  { id: 'warm',     label: 'Warm',     css: 'saturate(1.3) hue-rotate(-10deg)' },
  { id: 'cool',     label: 'Cool',     css: 'saturate(1.2) hue-rotate(15deg) brightness(1.05)' },
  { id: 'vibrant',  label: 'Vibrant',  css: 'saturate(1.6) contrast(1.15)' },
  { id: 'muted',    label: 'Muted',    css: 'saturate(0.5) contrast(0.95)' },
  { id: 'noir',     label: 'Noir',     css: 'grayscale(1) contrast(1.4) brightness(0.9)' },
] as const
type FilterId = typeof FILTERS[number]['id']

const EFFECTS = [
  { id: 'none',    label: 'None',      css: '' },
  { id: 'blur',    label: 'Soft Blur', css: 'blur(1px)' },
  { id: 'sharpen', label: 'Sharpen',   css: 'contrast(1.2) saturate(1.1)' },
] as const
type EffectId = typeof EFFECTS[number]['id']

type EditorTab = 'crop' | 'filters' | 'adjust' | 'effects'

const TABS: { id: EditorTab; label: string; icon: React.ReactNode }[] = [
  { id: 'crop',    label: 'Crop',    icon: <CropIcon className="w-4 h-4" weight="regular" /> },
  { id: 'filters', label: 'Filters', icon: <MagicWand className="w-4 h-4" weight="regular" /> },
  { id: 'adjust',  label: 'Adjust',  icon: <Sliders className="w-4 h-4" weight="regular" /> },
  { id: 'effects', label: 'Effects', icon: <Sparkle className="w-4 h-4" weight="regular" /> },
]

interface ImageCropperModalProps {
  imageSrc: string
  aspectRatio: number
  shape?: 'rect' | 'round'
  onSave: (blob: Blob) => Promise<void>
  onCancel: () => void
  title?: string
}

export function ImageCropperModal({
  imageSrc,
  aspectRatio,
  shape = 'rect',
  onSave,
  onCancel,
  title = 'Edit Image',
}: ImageCropperModalProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>('crop')
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [filter, setFilter] = useState<FilterId>('none')
  const [effect, setEffect] = useState<EffectId>('none')
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [saving, setSaving] = useState(false)

  const composedFilter = [
    FILTERS.find((f) => f.id === filter)?.css,
    EFFECTS.find((e) => e.id === effect)?.css,
    `brightness(${brightness}%)`,
    `contrast(${contrast}%)`,
    `saturate(${saturation}%)`,
  ].filter(Boolean).join(' ')

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels)
  }, [])

  const reset = () => {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
    setFilter('none')
    setEffect('none')
    setBrightness(100)
    setContrast(100)
    setSaturation(100)
    toast.success('Reset to original')
  }

  const handleSave = async () => {
    if (!croppedAreaPixels) {
      toast.error('Please adjust the crop area')
      return
    }
    setSaving(true)
    try {
      const blob = await getProcessedImage(imageSrc, croppedAreaPixels, rotation, composedFilter)
      await onSave(blob)
    } catch (err) {
      console.error(err)
      toast.error('Failed to process image')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="bg-zinc-950 border border-zinc-800/60 rounded-2xl w-full max-w-4xl shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_24px_64px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/60 flex-shrink-0">
          <h2 className="text-[15px] font-bold text-zinc-100 tracking-tight">{title}</h2>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" weight="bold" />
          </button>
        </div>

        {/* Cropper — flexible middle */}
        <div className="relative bg-black flex-1 min-h-[280px] max-h-[45vh]">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspectRatio}
            cropShape={shape}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
            showGrid={activeTab === 'crop'}
            {...({
              style: {
                containerStyle: { backgroundColor: '#000' },
                mediaStyle: { filter: composedFilter },
              },
            } as any)}
          />
        </div>

        {/* Tab bar */}
        <div className="flex border-t border-zinc-800/60 bg-zinc-950 flex-shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 text-[12px] font-semibold transition-colors border-b-2',
                activeTab === tab.id
                  ? 'text-white border-white bg-zinc-900/50'
                  : 'text-zinc-500 border-transparent hover:text-zinc-300',
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-4 py-3 text-[12px] font-semibold text-zinc-500 hover:text-zinc-300 transition-colors border-b-2 border-transparent"
          >
            <ArrowClockwise className="w-4 h-4" weight="regular" />
            Reset
          </button>
        </div>

        {/* Tab content — scrollable */}
        <div className="p-5 border-t border-zinc-800/60 bg-zinc-950 flex-shrink-0 overflow-y-auto" style={{ maxHeight: '25vh' }}>
          <AnimatePresence mode="wait">
            {activeTab === 'crop' && (
              <motion.div key="crop" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <SliderRow label="Zoom" value={zoom} min={1} max={3} step={0.01} onChange={setZoom} display={`${Math.round(zoom * 100)}%`} />
                <SliderRow label="Rotation" value={rotation} min={-180} max={180} step={1} onChange={setRotation} display={`${rotation}°`} />
              </motion.div>
            )}

            {activeTab === 'filters' && (
              <motion.div key="filters" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-4 md:grid-cols-8 gap-2">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all',
                      filter === f.id ? 'border-white bg-zinc-900/80' : 'border-zinc-800/60 hover:border-zinc-700',
                    )}
                  >
                    <div className="w-12 h-12 rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(${imageSrc})`, filter: f.css }} />
                    <span className={cn('text-[10px] font-semibold', filter === f.id ? 'text-white' : 'text-zinc-500')}>{f.label}</span>
                  </button>
                ))}
              </motion.div>
            )}

            {activeTab === 'adjust' && (
              <motion.div key="adjust" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <SliderRow label="Brightness" value={brightness} min={50} max={150} step={1} onChange={setBrightness} display={`${brightness}%`} />
                <SliderRow label="Contrast" value={contrast} min={50} max={150} step={1} onChange={setContrast} display={`${contrast}%`} />
                <SliderRow label="Saturation" value={saturation} min={0} max={200} step={1} onChange={setSaturation} display={`${saturation}%`} />
              </motion.div>
            )}

            {activeTab === 'effects' && (
              <motion.div key="effects" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-3 gap-2">
                {EFFECTS.map((eff) => (
                  <button
                    key={eff.id}
                    onClick={() => setEffect(eff.id)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-xl border transition-all',
                      effect === eff.id ? 'border-white bg-zinc-900/80' : 'border-zinc-800/60 hover:border-zinc-700',
                    )}
                  >
                    <div className="w-16 h-16 rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(${imageSrc})`, filter: eff.css }} />
                    <span className={cn('text-[11px] font-semibold', effect === eff.id ? 'text-white' : 'text-zinc-500')}>{eff.label}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer — ALWAYS VISIBLE, sticky at bottom */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-zinc-800/60 bg-zinc-950 flex-shrink-0">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={saving}
            className="border-zinc-700 bg-transparent text-zinc-400 hover:text-zinc-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-white text-black hover:bg-zinc-100 min-w-[100px]"
          >
            {saving ? 'Saving...' : (
              <>
                <Check className="w-4 h-4 mr-1.5" weight="bold" />
                Save
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function SliderRow({ label, value, min, max, step, onChange, display }: {
  label: string; value: number; min: number; max: number; step: number
  onChange: (v: number) => void; display: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] uppercase tracking-wider font-bold text-zinc-500">{label}</label>
        <span className="text-[11px] font-bold text-zinc-300">{display}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-white [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
      />
    </div>
  )
}

// Canvas processing
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

async function getProcessedImage(imageSrc: string, crop: Area, rotation: number, cssFilter: string): Promise<Blob> {
  const image = await loadImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to get canvas context')

  const rotRad = (rotation * Math.PI) / 180
  const { width: imgW, height: imgH } = image
  const rotatedW = Math.abs(Math.cos(rotRad) * imgW) + Math.abs(Math.sin(rotRad) * imgH)
  const rotatedH = Math.abs(Math.sin(rotRad) * imgW) + Math.abs(Math.cos(rotRad) * imgH)

  canvas.width = rotatedW
  canvas.height = rotatedH
  ctx.translate(rotatedW / 2, rotatedH / 2)
  ctx.rotate(rotRad)
  ctx.translate(-imgW / 2, -imgH / 2)
  ctx.drawImage(image, 0, 0)

  const data = ctx.getImageData(crop.x, crop.y, crop.width, crop.height)
  canvas.width = crop.width
  canvas.height = crop.height
  ctx.putImageData(data, 0, 0)

  if (cssFilter && cssFilter.trim()) {
    const filtered = document.createElement('canvas')
    filtered.width = crop.width
    filtered.height = crop.height
    const fctx = filtered.getContext('2d')
    if (fctx) {
      fctx.filter = cssFilter
      fctx.drawImage(canvas, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(filtered, 0, 0)
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Canvas toBlob failed'))
    }, 'image/jpeg', 0.92)
  })
}