'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  X, PencilSimple, Image as ImageIcon, Sparkle, PaperPlaneTilt,
} from '@phosphor-icons/react'

interface Props {
  isOpen: boolean
  onClose: () => void
  community: any
  onPosted?: () => void
}

export function CreatePostModal({ isOpen, onClose, community, onPosted }: Props) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState('')

  const handleClose = () => {
    if (loading) return
    setContent('')
    setImageUrl('')
    onClose()
  }

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error('Write something first')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/community/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          community_id: community.id,
          content: content.trim(),
          image_url: imageUrl || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to post')
        setLoading(false)
        return
      }

      toast.success('Posted successfully! 🎉')
      if (onPosted) onPosted()
      handleClose()
    } catch (e: any) {
      toast.error(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-background border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-5 border-b bg-gradient-to-br from-purple-500/10 to-pink-500/10 relative">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center"
              disabled={loading}
            >
              <X className="w-4 h-4" weight="bold" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <PencilSimple className="w-6 h-6 text-white" weight="fill" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Post to Community</h2>
                <p className="text-xs text-muted-foreground">
                  Posting in <span className="font-bold text-primary">{community.name}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                What&apos;s on your mind?
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share an update, ask a question, or start a discussion..."
                rows={6}
                maxLength={2000}
                autoFocus
                className="w-full mt-1.5 px-3 py-2.5 bg-muted/30 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
              <p className="text-[10px] text-muted-foreground text-right mt-1">
                {content.length}/2000
              </p>
            </div>

            {/* Image URL (optional) */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <ImageIcon className="w-3 h-3" weight="bold" />
                Image URL (optional)
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full mt-1.5 px-3 py-2.5 bg-muted/30 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {/* Preview */}
            {imageUrl && (
              <div className="border rounded-lg overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={imageUrl} 
                  alt="Preview" 
                  className="w-full h-40 object-cover"
                  onError={() => setImageUrl('')}
                />
              </div>
            )}

            {/* Tips */}
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-[11px] font-semibold flex items-center gap-1">
                <Sparkle className="w-3 h-3 text-purple-500" weight="fill" />
                Tips for great posts
              </p>
              <ul className="text-[10px] text-muted-foreground mt-1 space-y-0.5 ml-4">
                <li>• Be clear and concise</li>
                <li>• Ask engaging questions</li>
                <li>• Share value with your community</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t flex items-center gap-2">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <div className="flex-1" />
            <Button 
              onClick={handleSubmit}
              disabled={loading || !content.trim()}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {loading ? 'Posting...' : (
                <>
                  <PaperPlaneTilt className="w-4 h-4 mr-1" weight="fill" />
                  Post
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}