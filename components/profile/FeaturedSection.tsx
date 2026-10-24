'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, Plus, Edit3, Trash2, ExternalLink, ImageIcon, FileText, Video, Award, Pin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { FeaturedItemModal } from './FeaturedItemModal'

const typeIcons: Record<string, any> = {
  showcase: ImageIcon,
  article: FileText,
  video: Video,
  achievement: Award,
  project: Sparkles,
}

interface FeaturedSectionProps {
  items: any[]
  userId: string
  isOwnProfile: boolean
  onUpdate: (items: any[]) => void
}

export function FeaturedSection({ items, userId, isOwnProfile, onUpdate }: FeaturedSectionProps) {
  const supabase = createClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Remove from featured?')) return

    const { error } = await supabase.from('featured_items').delete().eq('id', id)
    
    if (error) {
      toast.error('Failed to delete')
    } else {
      toast.success('Removed from featured')
      onUpdate(items.filter(item => item.id !== id))
    }
  }

  const handleEdit = (item: any) => {
    setEditingItem(item)
    setModalOpen(true)
  }

  const handleNew = () => {
    setEditingItem(null)
    setModalOpen(true)
  }

  const handleSaved = (item: any, isEdit: boolean) => {
    if (isEdit) {
      onUpdate(items.map(i => i.id === item.id ? item : i))
    } else {
      onUpdate([item, ...items])
    }
    setModalOpen(false)
    setEditingItem(null)
  }

  if (items.length === 0 && !isOwnProfile) return null

  return (
    <>
      <div className="bg-card border rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-purple-500" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Featured</h2>
              <p className="text-xs text-muted-foreground">
                {items.length > 0 
                  ? `${items.length} showcase item${items.length !== 1 ? 's' : ''}`
                  : 'Your best work'
                }
              </p>
            </div>
          </div>

          {isOwnProfile && (
            <Button size="sm" onClick={handleNew}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Feature
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <Sparkles className="w-10 h-10 mx-auto text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground italic">
              Showcase your best work
            </p>
            {isOwnProfile && (
              <button
                onClick={handleNew}
                className="text-xs text-blue-500 hover:underline font-medium"
              >
                Add your first feature →
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <AnimatePresence>
              {items.map((item) => {
                const Icon = typeIcons[item.type] || Sparkles
                
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="border rounded-xl overflow-hidden hover:border-primary/30 transition-colors group"
                  >
                    {/* Image */}
                    {item.image_url && (
                      <div className="relative aspect-video bg-muted overflow-hidden">
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                        {item.is_pinned && (
                          <div className="absolute top-2 right-2 bg-yellow-500 text-black rounded-full p-1">
                            <Pin className="w-3 h-3" strokeWidth={3} />
                          </div>
                        )}
                        {isOwnProfile && (
                          <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <Button size="sm" variant="secondary" onClick={() => handleEdit(item)}>
                              <Edit3 className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => handleDelete(item.id)}>
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-md bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-3 h-3 text-purple-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm leading-tight">
                            {item.title}
                          </h3>
                        </div>
                        {!item.image_url && isOwnProfile && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEdit(item)} className="p-1 hover:bg-muted rounded">
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button onClick={() => handleDelete(item.id)} className="p-1 hover:bg-muted rounded">
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </button>
                          </div>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}

                      {item.link_url && (
                        <a
                          href={item.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline font-medium mt-1"
                        >
                          View
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {modalOpen && (
        <FeaturedItemModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          item={editingItem}
          userId={userId}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}