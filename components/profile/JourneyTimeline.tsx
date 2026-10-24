'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AddJourneyEventModal } from './AddJourneyEventModal'
import { cn } from '@/lib/utils'

interface JourneyEvent {
  id: string
  title: string
  description: string | null
  event_date: string
  category: string
  status: string
  is_auto: boolean
  is_approved: boolean
}

interface JourneyTimelineProps {
  events: JourneyEvent[]
  userId: string
  editable: boolean
}

const categoryConfig: Record<string, { color: string; bg: string; icon: string }> = {
  education: { color: '#6366f1', bg: 'bg-indigo-500/10', icon: '🎓' },
  startup: { color: '#f59e0b', bg: 'bg-amber-500/10', icon: '🚀' },
  project: { color: '#10b981', bg: 'bg-emerald-500/10', icon: '⚡' },
  career: { color: '#3b82f6', bg: 'bg-blue-500/10', icon: '💼' },
  achievement: { color: '#ec4899', bg: 'bg-pink-500/10', icon: '🏆' },
  community: { color: '#8b5cf6', bg: 'bg-violet-500/10', icon: '👥' },
  goal: { color: '#a855f7', bg: 'bg-purple-500/10', icon: '🎯' },
}

export function JourneyTimeline({
  events,
  userId,
  editable,
}: JourneyTimelineProps) {
  const router = useRouter()
  const supabase = createClient()
  const [selected, setSelected] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const visible = events.filter((e) => e.is_approved || editable)

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this event?')) return
    await supabase.from('journey_events').delete().eq('id', id)
    router.refresh()
    setSelected(null)
  }

  const handleApprove = async (id: string) => {
    await supabase
      .from('journey_events')
      .update({ is_approved: true })
      .eq('id', id)
    router.refresh()
  }

  if (visible.length === 0 && !editable) {
    return null
  }

  return (
    <>
      <div className="bg-card border rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Journey</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your story from start to where you are going
            </p>
          </div>
          {editable && (
            <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Event
            </Button>
          )}
        </div>

        {visible.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            Your journey starts here. Add your first milestone.
          </div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="relative min-w-max px-4 py-8">
              <div className="absolute top-[60px] left-4 right-4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

              <div className="flex items-start gap-12 relative">
                {visible.map((event, idx) => {
                  const config =
                    categoryConfig[event.category] || categoryConfig.project
                  const isSelected = selected === event.id

                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex flex-col items-center gap-3 cursor-pointer group min-w-[80px]"
                      onClick={() => setSelected(isSelected ? null : event.id)}
                    >
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {format(new Date(event.event_date), 'MMM yyyy')}
                      </span>

                      <div
                        className={cn(
                          'relative z-10 w-12 h-12 rounded-full flex items-center justify-center text-lg border-2 transition-all',
                          isSelected
                            ? 'scale-125 shadow-lg'
                            : 'group-hover:scale-110',
                          config.bg
                        )}
                        style={{ borderColor: config.color }}
                      >
                        <span>{config.icon}</span>
                        {event.status === 'in_progress' && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />
                        )}
                        {event.is_auto && !event.is_approved && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full border-2 border-background" />
                        )}
                      </div>

                      <span className="text-xs font-medium text-center max-w-[100px] leading-tight">
                        {event.title}
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            </div>

            <AnimatePresence>
              {selected && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 border-t pt-4"
                >
                  {(() => {
                    const event = visible.find((e) => e.id === selected)
                    if (!event) return null
                    const config = categoryConfig[event.category]
                    return (
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'w-10 h-10 rounded-lg flex items-center justify-center text-lg',
                                config.bg
                              )}
                            >
                              {config.icon}
                            </div>
                            <div>
                              <h3 className="font-semibold">{event.title}</h3>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(event.event_date), 'MMMM yyyy')}
                                {' • '}
                                <span className="capitalize">{event.category}</span>
                              </p>
                            </div>
                          </div>
                          {editable && (
                            <div className="flex gap-2">
                              {event.is_auto && !event.is_approved && (
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(event.id)}
                                >
                                  Approve
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(event.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                        {event.description && (
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {event.description}
                          </p>
                        )}
                      </div>
                    )
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AddJourneyEventModal
        open={addOpen}
        onOpenChange={setAddOpen}
        userId={userId}
      />
    </>
  )
}