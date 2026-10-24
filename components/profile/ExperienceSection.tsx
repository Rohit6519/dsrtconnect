'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Briefcase, Plus, Edit3, Trash2, MapPin, Calendar, Building, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { ExperienceModal } from './ExperienceModal'

interface ExperienceSectionProps {
  experience: any[]
  userId: string
  isOwnProfile: boolean
}

export function ExperienceSection({ experience: initialExperience, userId, isOwnProfile }: ExperienceSectionProps) {
  const router = useRouter()
  const supabase = createClient()
  const [experience, setExperience] = useState(initialExperience)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this experience?')) return
    
    const { error } = await supabase.from('user_experience').delete().eq('id', id)
    
    if (error) {
      toast.error('Failed to delete')
    } else {
      toast.success('Experience removed')
      setExperience(experience.filter(e => e.id !== id))
      router.refresh()
    }
  }

  const handleSaved = (exp: any, isEdit: boolean) => {
    if (isEdit) {
      setExperience(experience.map(e => e.id === exp.id ? exp : e))
    } else {
      setExperience([exp, ...experience])
    }
    setModalOpen(false)
    setEditing(null)
    router.refresh()
  }

  if (experience.length === 0 && !isOwnProfile) return null

  return (
    <>
      <div className="bg-card border rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-cyan-500" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Experience</h2>
              <p className="text-xs text-muted-foreground">
                {experience.length > 0 
                  ? `${experience.length} ${experience.length === 1 ? 'role' : 'roles'}`
                  : 'Work history'
                }
              </p>
            </div>
          </div>

          {isOwnProfile && (
            <Button size="sm" onClick={() => { setEditing(null); setModalOpen(true) }}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Experience
            </Button>
          )}
        </div>

        {experience.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <Briefcase className="w-10 h-10 mx-auto text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground italic">
              No work experience added yet
            </p>
            {isOwnProfile && (
              <button
                onClick={() => { setEditing(null); setModalOpen(true) }}
                className="text-xs text-blue-500 hover:underline font-medium"
              >
                Add your first experience →
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {experience.map((exp) => (
                <motion.div
                  key={exp.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex gap-4 group"
                >
                  {/* Company Logo */}
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {exp.company_logo_url ? (
                      <img src={exp.company_logo_url} alt={exp.company} className="w-full h-full object-cover" />
                    ) : (
                      <Building className="w-5 h-5 text-cyan-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm">{exp.role}</h3>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm text-muted-foreground">
                            {exp.company_url ? (
                              <a
                                href={exp.company_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-primary hover:underline"
                              >
                                {exp.company}
                              </a>
                            ) : (
                              exp.company
                            )}
                          </p>
                          {exp.employment_type && (
                            <>
                              <span className="text-muted-foreground/40">·</span>
                              <span className="text-xs text-muted-foreground capitalize">
                                {exp.employment_type.replace('-', ' ')}
                              </span>
                            </>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground flex-wrap">
                          {exp.start_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(exp.start_date), 'MMM yyyy')}
                              {exp.end_date && !exp.is_current 
                                ? ` - ${format(new Date(exp.end_date), 'MMM yyyy')}`
                                : exp.is_current ? ' - Present' : ''
                              }
                            </span>
                          )}
                          {exp.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {exp.location}
                            </span>
                          )}
                          {exp.industry && (
                            <span>{exp.industry}</span>
                          )}
                        </div>
                      </div>

                      {isOwnProfile && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="sm" variant="ghost" onClick={() => { setEditing(exp); setModalOpen(true) }}>
                            <Edit3 className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(exp.id)}>
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {exp.description && (
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed whitespace-pre-wrap">
                        {exp.description}
                      </p>
                    )}

                    {exp.skills_used && exp.skills_used.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {exp.skills_used.slice(0, 6).map((skill: string) => (
                          <span key={skill} className="text-[10px] px-2 py-0.5 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded font-medium">
                            {skill}
                          </span>
                        ))}
                        {exp.skills_used.length > 6 && (
                          <span className="text-[10px] px-2 py-0.5 bg-muted rounded font-medium">
                            +{exp.skills_used.length - 6} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {modalOpen && (
        <ExperienceModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          experience={editing}
          userId={userId}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}