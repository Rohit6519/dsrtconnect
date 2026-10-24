'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Megaphone, Trophy, Package, Users, CurrencyDollar, ChartBar, Plus, Trash, Lock, Globe } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { UpdateModal } from './modals/UpdateModal'

const iconMap: Record<string, any> = {
  general: Megaphone,
  milestone: Trophy,
  product: Package,
  team: Users,
  funding: CurrencyDollar,
  metric: ChartBar,
}

const colorMap: Record<string, string> = {
  general: 'text-blue-500 bg-blue-500/10',
  milestone: 'text-yellow-500 bg-yellow-500/10',
  product: 'text-purple-500 bg-purple-500/10',
  team: 'text-cyan-500 bg-cyan-500/10',
  funding: 'text-green-500 bg-green-500/10',
  metric: 'text-orange-500 bg-orange-500/10',
}

interface VentureUpdatesProps {
  venture: any
  initialUpdates: any[]
  isOwner: boolean
}

export function VentureUpdates({ venture, initialUpdates, isOwner }: VentureUpdatesProps) {
  const supabase = createClient()
  const [updates, setUpdates] = useState(initialUpdates)
  const [modalOpen, setModalOpen] = useState(false)

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this update?')) return

    const { error } = await supabase.from('venture_updates').delete().eq('id', id)

    if (error) {
      toast.error('Failed to delete')
    } else {
      setUpdates(updates.filter(u => u.id !== id))
      toast.success('Deleted')
    }
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Updates</h2>
            <p className="text-xs text-muted-foreground">
              {updates.length > 0 
                ? `${updates.length} ${updates.length === 1 ? 'update' : 'updates'} posted`
                : 'Share progress with followers'
              }
            </p>
          </div>
          {isOwner && (
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1" weight="bold" />
              Post Update
            </Button>
          )}
        </div>

        {/* Updates */}
        {updates.length === 0 ? (
          <div className="bg-card border rounded-2xl p-12 text-center">
            <Megaphone className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" weight="duotone" />
            <h3 className="font-semibold">No updates yet</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {isOwner 
                ? 'Post your first update to keep followers engaged'
                : 'Follow this venture to get notified when they post updates'
              }
            </p>
            {isOwner && (
              <Button size="sm" onClick={() => setModalOpen(true)} className="mt-4">
                <Plus className="w-4 h-4 mr-1" weight="bold" />
                Post First Update
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {updates.map((update) => {
                const Icon = iconMap[update.type] || Megaphone
                return (
                  <motion.div
                    key={update.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="bg-card border rounded-2xl p-5 group"
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', colorMap[update.type])}>
                        <Icon className="w-5 h-5" weight="fill" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-bold text-sm">{update.title}</h3>
                              <span className={cn('text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider', colorMap[update.type])}>
                                {update.type}
                              </span>
                              {update.is_public ? (
                                <Globe className="w-3 h-3 text-muted-foreground" weight="duotone" />
                              ) : (
                                <Lock className="w-3 h-3 text-muted-foreground" weight="duotone" />
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
                            </p>
                          </div>
                          {isOwner && (
                            <button
                              onClick={() => handleDelete(update.id)}
                              className="opacity-0 group-hover:opacity-100 text-destructive p-1 hover:bg-destructive/10 rounded"
                            >
                              <Trash className="w-3.5 h-3.5" weight="bold" />
                            </button>
                          )}
                        </div>

                        {update.content && (
                          <p className="text-sm text-foreground/90 mt-3 leading-relaxed whitespace-pre-wrap">
                            {update.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {modalOpen && (
        <UpdateModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          ventureId={venture.id}
          onSaved={(update) => {
            setUpdates([update, ...updates])
          }}
        />
      )}
    </>
  )
}