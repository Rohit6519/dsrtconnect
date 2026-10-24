'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useDropzone } from 'react-dropzone'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { FilePdf, Upload, X, Check, Trash, ArrowRight } from '@phosphor-icons/react'

const RECOMMENDED_SLIDES = [
  { id: 'problem', label: 'Problem', desc: 'What problem are you solving?' },
  { id: 'solution', label: 'Solution', desc: 'How do you solve it?' },
  { id: 'market', label: 'Market Size', desc: 'TAM, SAM, SOM' },
  { id: 'business-model', label: 'Business Model', desc: 'How you make money' },
  { id: 'traction', label: 'Traction', desc: 'Current metrics and growth' },
  { id: 'competition', label: 'Competition', desc: 'How you differ from others' },
  { id: 'product', label: 'Product', desc: 'What you have built' },
  { id: 'team', label: 'Team', desc: 'Who is building this' },
  { id: 'go-to-market', label: 'Go-to-Market', desc: 'Sales & marketing strategy' },
  { id: 'financials', label: 'Financials', desc: 'Revenue, burn, projections' },
  { id: 'ask', label: 'The Ask', desc: 'How much and use of funds' },
  { id: 'contact', label: 'Contact', desc: 'How to reach you' },
]

interface PitchDeckModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  venture: any
  onSaved: (venture: any) => void
}

export function PitchDeckModal({ open, onOpenChange, venture, onSaved }: PitchDeckModalProps) {
  const supabase = createClient()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(venture.pitch_deck_url || null)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024,
    onDrop: (files) => {
      const f = files[0]
      if (f) {
        setFile(f)
      }
    },
    onDropRejected: () => {
      toast.error('Please upload a PDF file under 20MB')
    }
  })

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setProgress(0)

    try {
      const path = `${venture.id}/pitch-deck-${Date.now()}.pdf`
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(p => Math.min(p + 10, 90))
      }, 200)

      const { error: uploadError } = await supabase.storage
        .from('ventures')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'application/pdf',
        })

      clearInterval(progressInterval)
      setProgress(95)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('ventures')
        .getPublicUrl(path)

      // Update venture
      const { data, error: updateError } = await supabase
        .from('ventures')
        .update({
          pitch_deck_url: publicUrl,
          pitch_deck_uploaded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', venture.id)
        .select()
        .single()

      if (updateError) throw updateError

      setProgress(100)
      setUploadedUrl(publicUrl)
      
      // Also save as document
      await supabase.from('venture_documents').insert({
        venture_id: venture.id,
        name: 'Pitch Deck',
        type: 'pitch_deck',
        file_url: publicUrl,
        file_size: file.size,
        is_public: true,
        uploaded_by: (await supabase.auth.getUser()).data.user?.id,
      })

      toast.success('Pitch deck uploaded successfully')
      onSaved(data)
      
      setTimeout(() => {
        onOpenChange(false)
        setFile(null)
        setProgress(0)
        setUploading(false)
      }, 800)
    } catch (err: any) {
      console.error('Upload error:', err)
      toast.error('Upload failed: ' + err.message)
      setUploading(false)
      setProgress(0)
    }
  }

  const handleRemove = async () => {
    if (!confirm('Remove the pitch deck?')) return

    const { data, error } = await supabase
      .from('ventures')
      .update({
        pitch_deck_url: null,
        pitch_deck_uploaded_at: null,
      })
      .eq('id', venture.id)
      .select()
      .single()

    if (!error && data) {
      setUploadedUrl(null)
      toast.success('Pitch deck removed')
      onSaved(data)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pitch Deck</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current pitch deck */}
          {uploadedUrl && !file && (
            <div className="flex items-center gap-3 p-4 border rounded-xl bg-pink-500/5">
              <div className="w-12 h-12 rounded-lg bg-pink-500/10 flex items-center justify-center">
                <FilePdf className="w-6 h-6 text-pink-500" weight="fill" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Current Pitch Deck</p>
                {venture.pitch_deck_uploaded_at && (
                  <p className="text-[10px] text-muted-foreground">
                    Uploaded {new Date(venture.pitch_deck_uploaded_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <a
                href={uploadedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline flex items-center gap-1"
              >
                View
                <ArrowRight className="w-3 h-3" weight="bold" />
              </a>
              <button
                onClick={handleRemove}
                className="text-destructive p-1 hover:bg-destructive/10 rounded"
              >
                <Trash className="w-4 h-4" weight="bold" />
              </button>
            </div>
          )}

          {/* Upload area */}
          {!file ? (
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all',
                isDragActive
                  ? 'border-primary bg-primary/5 scale-[1.02]'
                  : 'border-border hover:border-primary/50 hover:bg-muted/20'
              )}
            >
              <input {...getInputProps()} />
              <div className="w-14 h-14 mx-auto rounded-2xl bg-pink-500/10 flex items-center justify-center mb-3">
                <FilePdf className="w-7 h-7 text-pink-500" weight="fill" />
              </div>
              <p className="font-semibold">
                {isDragActive ? 'Drop your pitch deck here' : uploadedUrl ? 'Upload a new deck' : 'Upload your pitch deck'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Drag & drop or click to browse
              </p>
              <p className="text-[10px] text-muted-foreground mt-3">
                PDF only · Max 20MB
              </p>
            </div>
          ) : (
            <div className="border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-pink-500/10 flex items-center justify-center">
                  <FilePdf className="w-6 h-6 text-pink-500" weight="fill" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{file.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                {!uploading && (
                  <button
                    onClick={() => setFile(null)}
                    className="p-1 hover:bg-muted rounded"
                  >
                    <X className="w-4 h-4" weight="bold" />
                  </button>
                )}
              </div>

              {uploading && (
                <div className="space-y-1">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-pink-500 to-purple-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-right">
                    {progress === 100 ? 'Complete' : `${progress}%`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Recommended slides */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recommended Slides
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-2">
              {RECOMMENDED_SLIDES.map((slide, i) => (
                <div key={slide.id} className="flex items-start gap-2 p-2 border rounded-lg">
                  <div className="w-6 h-6 rounded bg-blue-500/10 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-blue-500">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">{slide.label}</p>
                    <p className="text-[10px] text-muted-foreground">{slide.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-3 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setFile(null)
                onOpenChange(false)
              }}
              disabled={uploading}
              className="flex-1"
            >
              Cancel
            </Button>
            {file && (
              <Button onClick={handleUpload} disabled={uploading} className="flex-1">
                {uploading ? 'Uploading...' : (
                  <>
                    <Upload className="w-4 h-4 mr-1" weight="bold" />
                    Upload Deck
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}