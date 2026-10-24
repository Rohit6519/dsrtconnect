'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { SECTORS } from '@/lib/config/sectors'
import { 
  RocketLaunch, 
  CaretRight,
  CaretLeft,
  Check,
  Upload,
  X,
  MagnifyingGlassPlus, 
  MagnifyingGlassMinus,
  ArrowClockwise,
  Sparkle,
} from '@phosphor-icons/react'
import { useDropzone } from 'react-dropzone'
import Cropper from 'react-easy-crop'

// Image cropping utility
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0,
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

  canvas.width = 400
  canvas.height = 400

  if (rotation !== 0) {
    const maxSize = Math.max(image.width, image.height)
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2))
    canvas.width = safeArea
    canvas.height = safeArea
    ctx.translate(safeArea / 2, safeArea / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.translate(-safeArea / 2, -safeArea / 2)
    ctx.drawImage(image, safeArea / 2 - image.width * 0.5, safeArea / 2 - image.height * 0.5)
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
      pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
      0, 0, 400, 400
    )
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Canvas empty'))
    }, 'image/jpeg', 0.92)
  })
}

export function CreateVentureWizard() {
  const router = useRouter()
  const supabase = createClient()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [creating, setCreating] = useState(false)
  
  // Basic info
  const [name, setName] = useState('')
  const [tagline, setTagline] = useState('')
  const [description, setDescription] = useState('')
  
  // Logo & Cropping
  const [logoSrc, setLogoSrc] = useState<string | null>(null)
  const [croppedLogoBlob, setCroppedLogoBlob] = useState<Blob | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [showCropper, setShowCropper] = useState(false)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  
  // Category
  const [selectedSector, setSelectedSector] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [customCategory, setCustomCategory] = useState('')

  const selectedSectorData = SECTORS.find(s => s.id === selectedSector)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    onDrop: (files) => {
      const file = files[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = () => {
          setLogoSrc(reader.result as string)
          setShowCropper(true)
          setZoom(1)
          setRotation(0)
          setCrop({ x: 0, y: 0 })
        }
        reader.readAsDataURL(file)
      }
    },
    onDropRejected: () => {
      toast.error('Logo must be under 5MB')
    }
  })

  const onCropComplete = useCallback((_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const applyCrop = async () => {
    if (!logoSrc || !croppedAreaPixels) return
    
    try {
      const blob = await getCroppedImg(logoSrc, croppedAreaPixels, rotation)
      setCroppedLogoBlob(blob)
      setLogoPreview(URL.createObjectURL(blob))
      setShowCropper(false)
      toast.success('Logo cropped')
    } catch (err) {
      toast.error('Failed to crop image')
    }
  }

  const clearLogo = () => {
    setLogoSrc(null)
    setLogoPreview(null)
    setCroppedLogoBlob(null)
    setShowCropper(false)
  }

  const canProceed = () => {
    if (currentStep === 1) return name.trim().length > 0 && tagline.trim().length > 0
    if (currentStep === 2) return selectedSector && (selectedCategory || (selectedCategory === 'custom' && customCategory.trim()))
    return false
  }

  const uploadLogo = async (ventureId: string): Promise<string | null> => {
    if (!croppedLogoBlob) return null
    
    const path = `${ventureId}/logo-${Date.now()}.jpg`
    const { error } = await supabase.storage
      .from('ventures')
      .upload(path, croppedLogoBlob, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/jpeg',
      })
    
    if (error) {
      console.error('Logo upload failed:', error)
      return null
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('ventures')
      .getPublicUrl(path)
    
    return publicUrl
  }

  const handleCreate = async () => {
    setCreating(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Please log in')
        return
      }

      const slug = name.trim().toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') + '-' + Math.random().toString(36).slice(2, 8)

      // Insert venture with just the basics
      const { data: venture, error } = await supabase
        .from('ventures')
        .insert({
          user_id: user.id,
          name: name.trim(),
          tagline: tagline.trim(),
          description: description.trim() || null,
          slug,
          sector: selectedSector,
          sub_category: selectedCategory === 'custom' ? customCategory : selectedCategory,
          industry: selectedSectorData?.label,
          stage: 'idea',  // Default, user can change later
          is_current: true,
          is_building_public: true,
          status: 'active',
          start_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      // Upload logo if provided
      if (croppedLogoBlob && venture) {
        const logoUrl = await uploadLogo(venture.id)
        if (logoUrl) {
          await supabase
            .from('ventures')
            .update({ logo_url: logoUrl })
            .eq('id', venture.id)
        }
      }

      // Add founder as team member
      const { data: profile } = await supabase
        .from('users')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single()

      await supabase.from('venture_team_members').insert({
        venture_id: venture.id,
        user_id: user.id,
        name: profile?.full_name || 'Founder',
        role: 'Founder',
        avatar_url: profile?.avatar_url,
        is_founder: true,
        can_view_notifications: true,
        joined_date: new Date().toISOString().split('T')[0],
        position: 0,
      })

      toast.success('Venture created! Now let us fill in the details.')
      router.push(`/ventures/${venture.slug}`)
    } catch (err: any) {
      console.error('Create venture error:', err)
      toast.error('Failed to create venture: ' + err.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-6 md:p-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-4 shadow-lg">
            <RocketLaunch className="w-7 h-7 text-white" weight="fill" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Create Your Venture</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Just the basics. You can add everything else after.
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2].map((step) => (
            <div key={step} className="flex items-center gap-2">
              <div
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  currentStep >= step ? 'bg-primary w-8' : 'bg-muted'
                )}
              />
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="bg-card border rounded-2xl p-6 md:p-8 min-h-[400px]">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-bold">Tell us the basics</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Just name, tagline, and logo. Everything else can wait.
                  </p>
                </div>

                {/* Logo */}
                <div className="space-y-2">
                  <Label>Company Logo (optional)</Label>
                  <div className="flex items-center gap-4">
                    {logoPreview ? (
                      <div className="relative">
                        <img
                          src={logoPreview}
                          alt="Logo"
                          className="w-24 h-24 rounded-2xl object-cover border-2 border-primary/30 shadow-lg"
                        />
                        <button
                          onClick={clearLogo}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-lg hover:scale-110 transition-transform"
                        >
                          <X className="w-3 h-3" weight="bold" />
                        </button>
                      </div>
                    ) : (
                      <div
                        {...getRootProps()}
                        className={cn(
                          'w-24 h-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all',
                          isDragActive
                            ? 'border-primary bg-primary/5 scale-105'
                            : 'border-border hover:border-primary/50 hover:bg-muted/30'
                        )}
                      >
                        <input {...getInputProps()} />
                        <Upload className="w-6 h-6 text-muted-foreground" weight="duotone" />
                        <p className="text-[10px] text-muted-foreground mt-1">Upload</p>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">
                        Upload a square image. You'll be able to crop, zoom, and rotate.
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Max 5MB · JPG, PNG, WEBP
                      </p>
                    </div>
                  </div>
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Venture Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. NeuralNova, My Bakery, Zomato"
                    className="h-11 text-base"
                    autoFocus
                    maxLength={80}
                  />
                </div>

                {/* Tagline */}
                <div className="space-y-2">
                  <Label htmlFor="tagline">One-line Description *</Label>
                  <Input
                    id="tagline"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="What does your venture do in one line?"
                    maxLength={120}
                  />
                  <p className="text-[11px] text-muted-foreground text-right">
                    {tagline.length}/120
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Brief Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="A quick summary. You can add complete details from your venture page."
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-[11px] text-muted-foreground text-right">
                    {description.length}/500
                  </p>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-bold">Which sector are you in?</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    DSRT is for every kind of business. Bakery, tech startup, factory, agency — all welcome.
                  </p>
                </div>

                {!selectedSector ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto pr-2">
                    {SECTORS.map((sector) => (
                      <button
                        key={sector.id}
                        onClick={() => setSelectedSector(sector.id)}
                        className="p-3 border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left group"
                      >
                        <div className={`w-8 h-8 rounded-lg bg-${sector.color}-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                          <span className={`text-${sector.color}-500 font-bold text-xs`}>
                            {sector.label.charAt(0)}
                          </span>
                        </div>
                        <p className="text-xs font-semibold leading-tight">{sector.label}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">
                          {sector.subCategories.length} types
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                          Sector
                        </p>
                        <p className="text-sm font-semibold">{selectedSectorData?.label}</p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedSector('')
                          setSelectedCategory('')
                        }}
                        className="text-xs text-blue-500 hover:underline"
                      >
                        Change
                      </button>
                    </div>

                    <div>
                      <Label className="text-sm">What kind of {selectedSectorData?.label.toLowerCase()}?</Label>
                      <p className="text-xs text-muted-foreground mt-1 mb-3">
                        Pick the closest match, or add custom
                      </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-2">
                      {selectedSectorData?.subCategories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => {
                            setSelectedCategory(cat.id)
                            setCustomCategory('')
                          }}
                          className={cn(
                            'p-2.5 border rounded-lg text-left transition-all text-xs',
                            selectedCategory === cat.id
                              ? 'border-primary bg-primary/10 text-primary font-semibold'
                              : 'hover:border-primary/50 hover:bg-muted'
                          )}
                        >
                          {cat.label}
                          {selectedCategory === cat.id && (
                            <Check className="w-3 h-3 text-primary mt-1" weight="bold" />
                          )}
                        </button>
                      ))}
                      
                      <button
                        onClick={() => setSelectedCategory('custom')}
                        className={cn(
                          'p-2.5 border rounded-lg text-left transition-all text-xs border-dashed',
                          selectedCategory === 'custom'
                            ? 'border-primary bg-primary/10 text-primary font-semibold'
                            : 'hover:border-primary/50'
                        )}
                      >
                        + Custom
                      </button>
                    </div>

                    {selectedCategory === 'custom' && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-2"
                      >
                        <Label>Your custom category</Label>
                        <Input
                          value={customCategory}
                          onChange={(e) => setCustomCategory(e.target.value)}
                          placeholder="e.g. Handmade Pottery Studio"
                          autoFocus
                        />
                      </motion.div>
                    )}
                  </div>
                )}

                {/* What comes next */}
                <div className="p-4 bg-gradient-to-br from-blue-500/5 to-purple-500/5 border border-blue-500/20 rounded-xl">
                  <div className="flex items-start gap-2">
                    <Sparkle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" weight="fill" />
                    <div>
                      <p className="text-xs font-semibold">After you create</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        You'll land on your venture page with placeholder sections. Click any section 
                        to add details progressively — mission, team, metrics, pitch deck, and more.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1 || creating}
          >
            <CaretLeft className="w-4 h-4 mr-1" weight="bold" />
            Back
          </Button>

          <p className="text-xs text-muted-foreground">
            Step {currentStep} of 2
          </p>

          {currentStep < 2 ? (
            <Button
              onClick={() => setCurrentStep(2)}
              disabled={!canProceed()}
            >
              Continue
              <CaretRight className="w-4 h-4 ml-1" weight="bold" />
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={!canProceed() || creating}
              className="bg-gradient-to-r from-blue-500 to-purple-500"
            >
              {creating ? (
                <>Creating...</>
              ) : (
                <>
                  <RocketLaunch className="w-4 h-4 mr-1" weight="bold" />
                  Create Venture
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Logo Cropper Modal */}
      <AnimatePresence>
        {showCropper && logoSrc && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
              onClick={() => setShowCropper(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl z-50 px-4"
            >
              <div className="bg-card border rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-4 border-b flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">Crop Your Logo</h3>
                    <p className="text-xs text-muted-foreground">
                      Drag to reposition · Scroll to zoom · Adjust below
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCropper(false)}
                    className="p-2 hover:bg-muted rounded-lg"
                  >
                    <X className="w-4 h-4" weight="bold" />
                  </button>
                </div>

                <div className="relative w-full bg-black" style={{ height: '400px' }}>
                  <Cropper
                    image={logoSrc}
                    crop={crop}
                    zoom={zoom}
                    rotation={rotation}
                    aspect={1}
                    cropShape="rect"
                    showGrid={true}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onRotationChange={setRotation}
                    onCropComplete={onCropComplete}
                  />
                </div>

                <div className="p-4 space-y-3 border-t">
                  {/* Zoom */}
                  <div className="flex items-center gap-3">
                    <ZoomOut className="w-4 h-4 text-muted-foreground" weight="duotone" />
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.1}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="flex-1 accent-primary"
                    />
                    <ZoomIn className="w-4 h-4 text-muted-foreground" weight="duotone" />
                    <span className="text-xs w-12 text-right font-mono">
                      {zoom.toFixed(1)}x
                    </span>
                  </div>

                  {/* Rotation */}
                  <div className="flex items-center gap-3">
                    <ArrowClockwise className="w-4 h-4 text-muted-foreground" weight="duotone" />
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

                  <div className="flex gap-2 pt-3 border-t">
                    <Button
                      variant="outline"
                      onClick={() => setShowCropper(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={applyCrop}
                      className="flex-1"
                    >
                      <Check className="w-4 h-4 mr-1" weight="bold" />
                      Apply Crop
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}