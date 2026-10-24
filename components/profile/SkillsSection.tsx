'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, Plus, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { SearchSelector } from './SearchSelector'

interface SkillsSectionProps {
  skills: any[]
  userId: string
  isOwnProfile: boolean
}

export function SkillsSection({ skills: initialSkills, userId, isOwnProfile }: SkillsSectionProps) {
  const router = useRouter()
  const supabase = createClient()
  const [skills, setSkills] = useState(initialSkills)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedSkill, setSelectedSkill] = useState<any>(null)
  const [adding, setAdding] = useState(false)

  const removeSkill = async (skillId: string) => {
    const { error } = await supabase
      .from('user_skills')
      .delete()
      .eq('user_id', userId)
      .eq('skill_id', skillId)

    if (error) {
      toast.error('Failed to remove')
    } else {
      setSkills(skills.filter(s => s.skill_id !== skillId))
      toast.success('Skill removed')
    }
  }

  const createSkill = async (name: string) => {
    const res = await fetch('/api/skills/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()
    return data.skill
  }

  const addSkill = async () => {
    if (!selectedSkill?.id) {
      toast.error('Please select a skill')
      return
    }

    // Check if already added
    if (skills.some(s => s.skill_id === selectedSkill.id)) {
      toast.error('Skill already in your list')
      return
    }

    setAdding(true)

    const { data, error } = await supabase
      .from('user_skills')
      .insert({
        user_id: userId,
        skill_id: selectedSkill.id,
        level: 'intermediate',
      })
      .select('*, skills(*)')
      .single()

    setAdding(false)

    if (error) {
      toast.error('Failed to add: ' + error.message)
    } else {
      setSkills([...skills, data])
      setSelectedSkill(null)
      toast.success('Skill added')
      router.refresh()
    }
  }

  // Group by category
  const grouped = skills.reduce((acc: any, s: any) => {
    const cat = s.skills?.category || 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(s)
    return acc
  }, {})

  const categoryOrder = ['programming', 'frontend', 'backend', 'database', 'mobile', 'cloud', 'devops', 'ai', 'data', 'design', 'business', 'finance', 'marketing', 'sales', 'hr', 'soft', 'language', 'healthcare', 'legal', 'education', 'media', 'music', 'sports', 'culinary', 'industry', 'research', 'other']

  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    const aIdx = categoryOrder.indexOf(a)
    const bIdx = categoryOrder.indexOf(b)
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx)
  })

  return (
    <>
      <div className="bg-card border rounded-2xl p-5 space-y-4 sticky top-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-yellow-500" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Skills</h2>
              <p className="text-[10px] text-muted-foreground">
                {skills.length} {skills.length === 1 ? 'skill' : 'skills'}
              </p>
            </div>
          </div>

          {isOwnProfile && (
            <Button size="sm" variant="ghost" onClick={() => setModalOpen(true)}>
              <Plus className="w-4 h-4" />
            </Button>
          )}
        </div>

        {skills.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <Sparkles className="w-8 h-8 mx-auto text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground italic">
              No skills added yet
            </p>
            {isOwnProfile && (
              <button
                onClick={() => setModalOpen(true)}
                className="text-xs text-blue-500 hover:underline font-medium"
              >
                Add skills →
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {sortedCategories.map((cat) => (
              <div key={cat}>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">
                  {cat.replace('-', ' ')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <AnimatePresence>
                    {grouped[cat].map((s: any) => (
                      <motion.span
                        key={s.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-muted text-xs rounded-md group"
                      >
                        {s.skills?.name}
                        {s.verified && <span className="text-primary">✓</span>}
                        {isOwnProfile && (
                          <button
                            onClick={() => removeSkill(s.skill_id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive ml-0.5"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Skill Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Skill</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Search or add skill</Label>
              <SearchSelector
                value={selectedSkill}
                onChange={setSelectedSkill}
                placeholder="Type any skill..."
                searchEndpoint="/api/skills/search"
                responseKey="skills"
                onCreate={createSkill}
              />
              <p className="text-[11px] text-muted-foreground">
                Cannot find yours? Type any skill and click "Add to system"
              </p>
            </div>

            <div className="flex gap-2 pt-3 border-t">
              <Button 
                variant="outline" 
                onClick={() => { setModalOpen(false); setSelectedSkill(null) }} 
                disabled={adding} 
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={addSkill} 
                disabled={adding || !selectedSkill?.id} 
                className="flex-1"
              >
                {adding ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding...</>
                ) : (
                  'Add Skill'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}