'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useDropzone } from 'react-dropzone'
import { Upload, X, Loader2, ImageIcon, FileText, Video, Award, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const types = [
  { id: 'showcase', label: 'Showcase', icon: ImageIcon, color: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
  { id: 'article', label: 'Article', icon: FileText, color: 'bg-green-500/10 text-green-500 border-green-500/30' },
  { id: 'video', label: 'Video', icon: Video, color: 'bg-red-500/10 text-red-500 border-red-500/30' },
  { id: 'achievement', label: 'Achievement', icon: Award, color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' },
  { id: 'project', label: 'Project', icon: Sparkles, color: 'bg-purple-500/10 text-purple-500 border-purple-500/30' },
]

interface FeaturedItemModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: any
  userId: string
  onSaved: (item: any, isEdit: boolean) => void
}

export function FeaturedItemModal({ open, onOpenChange, item, userId, onSaved }: FeaturedItemModalProps) {
  const supabase = createClient()
  const isEdit = !!item

  const [type, setType] = useState(item?.type || 'showcase')
  const [title, setTitle] = useState(item?.title || '')
  const [description, setDescription] = useState(item?.description || '')
  const [linkUrl, setLinkUrl] = useState(item?.link_url || '')
  const [isPinned, setIsPinned] = useState(item?.is_pinned || false)
  const [imageUrl, setImageUrl] = useState(item?.image_url || '')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(item?.image_url || null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    onDrop: (files) => {
      const file = files[0]
      if (file) {
        setImageFile(file)
        setImagePreview(URL.createObjectURL(file))
      }
    },
    onDropRejected: () => {
      toast.error('Image must be under 10MB')
    }
  })

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return imageUrl

    setUploading(true)
    const path = `${userId}/featured-${Date.now()}.jpg`

    const { error: uploadError } = await supabase.storage
      .from('featured')
      .upload(path, imageFile, {
        cacheControl: '3600',
        upsert: true,
        contentType: imageFile.type,
      })

    if (uploadError) {
      setUploading(false)
      toast.error('Image upload failed: ' + uploadError.message)
      return null
    }

    const { data: { publicUrl } } = supabase.storage
      .from('featured')
      .getPublicUrl(path)

    setUploading(false)
    return publicUrl
  }

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }

    setSaving(true)

    const uploadedImageUrl = imageFile ? await uploadImage() : imageUrl
    
    if (imageFile && !uploadedImageUrl) {
      setSaving(false)
      return
    }

    const data = {
      user_id: userId,
      type,
      title: title.trim(),
      description: description.trim() || null,
      link_url: linkUrl.trim() || null,
      image_url: uploadedImageUrl || null,
      is_pinned: isPinned,
      updated_at: new Date().toISOString(),
    }

    let result
    if (isEdit) {
      result = await supabase
        .from('featured_items')
        .update(data)
        .eq('id', item.id)
        .select()
        .single()
    } else {
      result = await supabase
        .from('featured_items')
        .insert(data)
        .select()
        .single()
    }

    setSaving(false)

    if (result.error) {
      toast.error('Failed to save: ' + result.error.message)
    } else {
      toast.success(isEdit ? 'Featured item updated' : 'Added to featured')
      onSaved(result.data, isEdit)
    }
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setImageUrl('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Featured Item' : 'Add to Featured'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type */}
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="grid grid-cols-5 gap-2">
              {types.map(t => {
                const Icon = t.icon
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id)}
                    className={cn(
                      'p-3 rounded-lg border-2 flex flex-col items-center gap-1.5 transition-all',
                      type === t.id ? t.color + ' scale-105' : 'border-border hover:bg-muted'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[10px] font-semibold">{t.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Image */}
          <div className="space-y-2">
            <Label>Image (optional)</Label>
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full aspect-video object-cover rounded-lg border"
                />
                <button
                  onClick={clearImage}
                  className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm p-1.5 rounded-lg border shadow-lg"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                {...getRootProps()}
                className={cn(
                  'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                  isDragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <input {...getInputProps()} />
                <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {isDragActive ? 'Drop image here' : 'Drop image or click to upload'}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Max 10MB • JPG, PNG, WEBP • 16:9 recommended
                </p>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give this a compelling title"
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell people what makes this special"
              rows={3}
              maxLength={300}
            />
            <p className="text-[10px] text-muted-foreground text-right">
              {description.length} / 300
            </p>
          </div>

          {/* Link */}
          <div className="space-y-2">
            <Label htmlFor="link">Link (optional)</Label>
            <Input
              id="link"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          {/* Pin */}
          <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/30">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">Pin to top of featured section</span>
          </label>

          {/* Actions */}
          <div className="flex gap-2 pt-3 border-t">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              disabled={saving || uploading} 
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || uploading || !title.trim()} 
              className="flex-1"
            >
              {(saving || uploading) ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {uploading ? 'Uploading...' : 'Saving...'}
                </>
              ) : (
                isEdit ? 'Update' : 'Add to Featured'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}