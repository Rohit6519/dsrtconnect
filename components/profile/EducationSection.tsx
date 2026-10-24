'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GraduationCap, Plus, Edit3, Trash2, Calendar, Award } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { EducationModal } from './EducationModal'

const levelLabels: Record<string, string> = {
  primary: 'Primary School',
  secondary: 'Secondary School',
  higher_secondary: 'Higher Secondary',
  diploma: 'Diploma',
  undergraduate: 'Undergraduate',
  postgraduate: 'Postgraduate',
  doctorate: 'Doctorate',
  professional: 'Professional',
  certification: 'Certification',
}

const levelColors: Record<string, string> = {
  primary: 'bg-pink-500/10 text-pink-500',
  secondary: 'bg-purple-500/10 text-purple-500',
  higher_secondary: 'bg-indigo-500/10 text-indigo-500',
  diploma: 'bg-blue-500/10 text-blue-500',
  undergraduate: 'bg-green-500/10 text-green-500',
  postgraduate: 'bg-orange-500/10 text-orange-500',
  doctorate: 'bg-red-500/10 text-red-500',
  professional: 'bg-yellow-500/10 text-yellow-500',
  certification: 'bg-cyan-500/10 text-cyan-500',
}

interface EducationSectionProps {
  education: any[]
  userId: string
  isOwnProfile: boolean
}

export function EducationSection({ education: initialEducation, userId, isOwnProfile }: EducationSectionProps) {
  const router = useRouter()
  const supabase = createClient()
  const [education, setEducation] = useState(initialEducation)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this education entry?')) return
    
    const { error } = await supabase.from('user_education').delete().eq('id', id)
    
    if (error) {
      toast.error('Failed to delete')
    } else {
      toast.success('Education removed')
      setEducation(education.filter(e => e.id !== id))
      router.refresh()
    }
  }

  const handleSaved = (edu: any, isEdit: boolean) => {
    if (isEdit) {
      setEducation(education.map(e => e.id === edu.id ? edu : e))
    } else {
      setEducation([edu, ...education])
    }
    setModalOpen(false)
    setEditing(null)
    router.refresh()
  }

  if (education.length === 0 && !isOwnProfile) return null

  return (
    <>
      <div className="bg-card border rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-indigo-500" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Education</h2>
              <p className="text-xs text-muted-foreground">
                {education.length > 0 
                  ? `${education.length} ${education.length === 1 ? 'entry' : 'entries'}`
                  : 'Educational background'
                }
              </p>
            </div>
          </div>

          {isOwnProfile && (
            <Button size="sm" onClick={() => { setEditing(null); setModalOpen(true) }}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Education
            </Button>
          )}
        </div>

        {education.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <GraduationCap className="w-10 h-10 mx-auto text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground italic">
              Add your educational background
            </p>
            {isOwnProfile && (
              <button
                onClick={() => { setEditing(null); setModalOpen(true) }}
                className="text-xs text-blue-500 hover:underline font-medium"
              >
                Add your first entry →
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {education.map((edu) => (
                <motion.div
                  key={edu.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex gap-4 group"
                >
                  {/* Institution Logo */}
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-5 h-5 text-indigo-500" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-sm">
                            {edu.institutions?.name || edu.institution_name || 'Institution'}
                          </h3>
                          {edu.education_level && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${levelColors[edu.education_level] || 'bg-muted text-muted-foreground'}`}>
                              {levelLabels[edu.education_level] || edu.education_level}
                            </span>
                          )}
                          {edu.is_current && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-green-500/10 text-green-500">
                              Current
                            </span>
                          )}
                        </div>
                        
                        {(edu.degree || edu.field) && (
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {edu.degree}
                            {edu.degree && edu.field && ' in '}
                            {edu.field}
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground flex-wrap">
                          {(edu.start_year || edu.end_year) && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {edu.start_year}
                              {edu.end_year && ` - ${edu.end_year}`}
                              {edu.is_current && ' - Present'}
                            </span>
                          )}
                          {edu.grade && (
                            <span className="flex items-center gap-1">
                              <Award className="w-3 h-3" />
                              Grade: {edu.grade}
                            </span>
                          )}
                        </div>
                      </div>

                      {isOwnProfile && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="sm" variant="ghost" onClick={() => { setEditing(edu); setModalOpen(true) }}>
                            <Edit3 className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(edu.id)}>
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {edu.description && (
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed whitespace-pre-wrap">
                        {edu.description}
                      </p>
                    )}

                    {edu.activities && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">Activities: </span>
                        {edu.activities}
                      </div>
                    )}

                    {edu.societies && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">Societies: </span>
                        {edu.societies}
                      </div>
                    )}

                    {edu.skills_gained && edu.skills_gained.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {edu.skills_gained.slice(0, 6).map((skill: string) => (
                          <span key={skill} className="text-[10px] px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded font-medium">
                            {skill}
                          </span>
                        ))}
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
        <EducationModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          education={editing}
          userId={userId}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}