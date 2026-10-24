'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Rocket, Plus, Edit3, Trash2, ExternalLink, Users, MapPin, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { VentureModal } from './VentureModal'

const stageConfig: Record<string, { label: string; color: string }> = {
  idea: { label: 'Idea', color: 'bg-blue-500/10 text-blue-500' },
  building: { label: 'Building', color: 'bg-orange-500/10 text-orange-500' },
  launched: { label: 'Launched', color: 'bg-green-500/10 text-green-500' },
  growing: { label: 'Growing', color: 'bg-purple-500/10 text-purple-500' },
  exited: { label: 'Exited', color: 'bg-emerald-500/10 text-emerald-500' },
  paused: { label: 'Paused', color: 'bg-gray-500/10 text-gray-500' },
}

interface VenturesSectionProps {
  ventures: any[]
  userId: string
  isOwnProfile: boolean
  onUpdate: (ventures: any[]) => void
}

export function VenturesSection({ ventures, userId, isOwnProfile, onUpdate }: VenturesSectionProps) {
  const supabase = createClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingVenture, setEditingVenture] = useState<any>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this venture?')) return

    const { error } = await supabase.from('ventures').delete().eq('id', id)
    
    if (error) {
      toast.error('Failed to delete')
    } else {
      toast.success('Venture removed')
      onUpdate(ventures.filter(v => v.id !== id))
    }
  }

  const handleEdit = (venture: any) => {
    setEditingVenture(venture)
    setModalOpen(true)
  }

  const handleNew = () => {
    setEditingVenture(null)
    setModalOpen(true)
  }

  const handleSaved = (venture: any, isEdit: boolean) => {
    if (isEdit) {
      onUpdate(ventures.map(v => v.id === venture.id ? venture : v))
    } else {
      onUpdate([venture, ...ventures])
    }
    setModalOpen(false)
    setEditingVenture(null)
  }

  if (ventures.length === 0 && !isOwnProfile) return null

  return (
    <>
      <div className="bg-card border rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Rocket className="w-4 h-4 text-orange-500" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Ventures</h2>
              <p className="text-xs text-muted-foreground">
                {ventures.length > 0 
                  ? `${ventures.length} venture${ventures.length !== 1 ? 's' : ''}`
                  : 'Projects and companies'
                }
              </p>
            </div>
          </div>

          {isOwnProfile && (
            <Button size="sm" onClick={handleNew}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Venture
            </Button>
          )}
        </div>

        {ventures.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <Rocket className="w-10 h-10 mx-auto text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground italic">
              No ventures added yet
            </p>
            {isOwnProfile && (
              <button
                onClick={handleNew}
                className="text-xs text-blue-500 hover:underline font-medium"
              >
                Add your first venture →
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {ventures.map((venture) => {
                const stage = stageConfig[venture.stage] || stageConfig.idea
                
                return (
                  <motion.div
                    key={venture.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="border rounded-xl p-4 hover:border-primary/30 transition-colors group"
                  >
                    <div className="flex items-start gap-4">
                      {/* Logo */}
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {venture.logo_url ? (
                          <img src={venture.logo_url} alt={venture.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg font-bold text-orange-500">
                            {venture.name[0].toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-sm">{venture.name}</h3>
                              <span className={cn(
                                'text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider',
                                stage.color
                              )}>
                                {stage.label}
                              </span>
                              {venture.is_current && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-green-500/10 text-green-500">
                                  Current
                                </span>
                              )}
                            </div>
                            {venture.role && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {venture.role}
                                {venture.industry && ` · ${venture.industry}`}
                              </p>
                            )}
                          </div>

                          {isOwnProfile && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button size="sm" variant="ghost" onClick={() => handleEdit(venture)}>
                                <Edit3 className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDelete(venture.id)}>
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Description */}
                        {venture.description && (
                          <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-3">
                            {venture.description}
                          </p>
                        )}

                        {/* Meta */}
                        <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground flex-wrap">
                          {venture.team_size > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {venture.team_size} {venture.team_size === 1 ? 'person' : 'people'}
                            </span>
                          )}
                          {venture.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {venture.location}
                            </span>
                          )}
                          {venture.start_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(venture.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                              {venture.end_date && !venture.is_current && (
                                <> - {new Date(venture.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</>
                              )}
                              {venture.is_current && <> - Present</>}
                            </span>
                          )}
                          {venture.website && (
                            <a
                              href={venture.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-500 hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Website
                            </a>
                          )}
                        </div>

                        {/* Tags */}
                        {venture.tags && venture.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {venture.tags.slice(0, 5).map((tag: string) => (
                              <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-muted rounded font-medium">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Achievements */}
                        {venture.achievements && venture.achievements.length > 0 && (
                          <div className="mt-3 pt-3 border-t space-y-1">
                            {venture.achievements.slice(0, 3).map((ach: string, i: number) => (
                              <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                <span className="text-green-500 mt-0.5">✓</span>
                                <span>{ach}</span>
                              </div>
                            ))}
                          </div>
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
        <VentureModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          venture={editingVenture}
          userId={userId}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}