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
import { X, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { SearchSelector } from './SearchSelector'

const educationLevels = [
  { id: 'primary', label: 'Primary School', color: 'border-pink-500/30 bg-pink-500/10' },
  { id: 'secondary', label: 'Secondary School', color: 'border-purple-500/30 bg-purple-500/10' },
  { id: 'higher_secondary', label: 'Higher Secondary (12th)', color: 'border-indigo-500/30 bg-indigo-500/10' },
  { id: 'diploma', label: 'Diploma', color: 'border-blue-500/30 bg-blue-500/10' },
  { id: 'undergraduate', label: 'Undergraduate (Bachelor)', color: 'border-green-500/30 bg-green-500/10' },
  { id: 'postgraduate', label: 'Postgraduate (Master)', color: 'border-orange-500/30 bg-orange-500/10' },
  { id: 'doctorate', label: 'Doctorate (PhD)', color: 'border-red-500/30 bg-red-500/10' },
  { id: 'professional', label: 'Professional (CA/CS)', color: 'border-yellow-500/30 bg-yellow-500/10' },
  { id: 'certification', label: 'Certification/Course', color: 'border-cyan-500/30 bg-cyan-500/10' },
]

const institutionTypes: Record<string, string> = {
  primary: 'primary_school',
  secondary: 'secondary_school',
  higher_secondary: 'high_school',
  diploma: 'polytechnic',
  undergraduate: 'college',
  postgraduate: 'university',
  doctorate: 'university',
  professional: 'college',
  certification: 'online',
}

interface EducationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  education?: any
  userId: string
  onSaved: (edu: any, isEdit: boolean) => void
}

export function EducationModal({ open, onOpenChange, education, userId, onSaved }: EducationModalProps) {
  const supabase = createClient()
  const isEdit = !!education

  const [level, setLevel] = useState(education?.education_level || 'undergraduate')
  const [institution, setInstitution] = useState<any>(
    education?.institutions ? { id: education.institution_id, name: education.institutions.name, city: education.institutions.city, state: education.institutions.state } : 
    education?.institution_name ? { id: null, name: education.institution_name } : null
  )
  const [selectedDegree, setSelectedDegree] = useState<any>(
    education?.degree ? { id: education.degree_id, name: education.degree, short_name: education.degree } : null
  )
  const [selectedField, setSelectedField] = useState<any>(
    education?.field ? { id: education.field_id, name: education.field } : null
  )
  const [startYear, setStartYear] = useState(education?.start_year?.toString() || '')
  const [endYear, setEndYear] = useState(education?.end_year?.toString() || '')
  const [isCurrent, setIsCurrent] = useState(education?.is_current ?? true)
  const [grade, setGrade] = useState(education?.grade || '')
  const [description, setDescription] = useState(education?.description || '')
  const [activities, setActivities] = useState(education?.activities || '')
  const [societies, setSocieties] = useState(education?.societies || '')
  const [skillsGained, setSkillsGained] = useState<string[]>(education?.skills_gained || [])
  const [skillInput, setSkillInput] = useState('')
  const [saving, setSaving] = useState(false)

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 60 }, (_, i) => currentYear - 40 + i)
  const showAcademicFields = !['primary', 'secondary'].includes(level)

  const addSkill = () => {
    const s = skillInput.trim()
    if (s && !skillsGained.includes(s) && skillsGained.length < 20) {
      setSkillsGained([...skillsGained, s])
      setSkillInput('')
    }
  }

  const removeSkill = (s: string) => {
    setSkillsGained(skillsGained.filter(x => x !== s))
  }

  const createInstitution = async (name: string) => {
    const res = await fetch('/api/institutions/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name, 
        institution_type: institutionTypes[level] || 'college' 
      }),
    })
    const data = await res.json()
    return data.institution
  }

  const createDegree = async (name: string) => {
    const res = await fetch('/api/degrees/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, level }),
    })
    const data = await res.json()
    return data.degree
  }

  const createField = async (name: string) => {
    const res = await fetch('/api/fields/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()
    return data.field
  }

  const handleSave = async () => {
    if (!institution?.name && !institution?.id) {
      toast.error('Institution is required')
      return
    }

    setSaving(true)

    const data: any = {
      user_id: userId,
      education_level: level,
      institution_id: institution?.id || null,
      institution_name: institution?.id ? null : institution?.name,
      is_current: isCurrent,
      start_year: startYear ? parseInt(startYear) : null,
      end_year: !isCurrent && endYear ? parseInt(endYear) : null,
      description: description.trim() || null,
      activities: activities.trim() || null,
      societies: societies.trim() || null,
      skills_gained: skillsGained,
    }

    if (showAcademicFields) {
      data.degree = selectedDegree?.short_name || selectedDegree?.name || null
      data.degree_id = selectedDegree?.id || null
      data.field = selectedField?.name || null
      data.field_id = selectedField?.id || null
      data.grade = grade.trim() || null
    }

    let result
    if (isEdit) {
      result = await supabase
        .from('user_education')
        .update(data)
        .eq('id', education.id)
        .select('*, institutions(*)')
        .single()
    } else {
      result = await supabase
        .from('user_education')
        .insert(data)
        .select('*, institutions(*)')
        .single()
    }

    if (result.error) {
      setSaving(false)
      toast.error('Failed to save: ' + result.error.message)
      return
    }

    // Auto-sync skills gained to user's main skills
    if (skillsGained.length > 0) {
      try {
        await supabase.rpc('sync_skills_from_source', {
          p_user_id: userId,
          p_skill_names: skillsGained,
        })
      } catch (err) {
        console.error('Sync skills error:', err)
      }
    }

    setSaving(false)
    toast.success(isEdit ? 'Education updated' : 'Education added')
    onSaved(result.data, isEdit)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Education' : 'Add Education'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Education Level */}
          <div className="space-y-2">
            <Label>Education Level *</Label>
            <div className="grid grid-cols-3 gap-2">
              {educationLevels.map(l => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLevel(l.id)}
                  className={cn(
                    'p-2 rounded-lg border-2 text-xs font-semibold transition-all',
                    level === l.id ? l.color + ' scale-105' : 'border-border hover:bg-muted'
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Institution */}
          <div className="space-y-2">
            <Label>Institution *</Label>
            <SearchSelector
              value={institution}
              onChange={setInstitution}
              placeholder="Search or add school/college/university..."
              searchEndpoint="/api/institutions/search"
              responseKey="institutions"
              subField="short_name"
              onCreate={createInstitution}
              extraParams={institutionTypes[level] ? { level: institutionTypes[level] } : {}}
            />
            <p className="text-[11px] text-muted-foreground">
              Cannot find yours? Just type it and press "Add to system"
            </p>
          </div>

          {/* Academic Fields (not for primary/secondary) */}
          {showAcademicFields && (
            <>
              {/* Degree */}
              <div className="space-y-2">
                <Label>Degree</Label>
                <SearchSelector
                  value={selectedDegree}
                  onChange={setSelectedDegree}
                  placeholder="Search degree (B.Tech, MBA, PhD, etc.)"
                  searchEndpoint="/api/degrees/search"
                  responseKey="degrees"
                  subField="short_name"
                  onCreate={createDegree}
                  extraParams={{ level }}
                />
              </div>

              {/* Field of Study */}
              <div className="space-y-2">
                <Label>Field of Study</Label>
                <SearchSelector
                  value={selectedField}
                  onChange={setSelectedField}
                  placeholder="Search field (Computer Science, Biology, etc.)"
                  searchEndpoint="/api/fields/search"
                  responseKey="fields"
                  onCreate={createField}
                />
              </div>

              {/* Grade */}
              <div className="space-y-2">
                <Label htmlFor="grade">Grade / CGPA / Percentage</Label>
                <Input
                  id="grade"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="e.g., 8.5 CGPA, First Class, 85%"
                />
              </div>
            </>
          )}

          {/* Dates */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isCurrent}
                onChange={(e) => setIsCurrent(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Currently studying here</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="start_year">Start Year</Label>
                <select
                  id="start_year"
                  value={startYear}
                  onChange={(e) => setStartYear(e.target.value)}
                  className="w-full h-10 px-3 border rounded-md bg-background text-sm"
                >
                  <option value="">Select year</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_year">{isCurrent ? 'Expected End' : 'End Year'}</Label>
                <select
                  id="end_year"
                  value={endYear}
                  onChange={(e) => setEndYear(e.target.value)}
                  className="w-full h-10 px-3 border rounded-md bg-background text-sm"
                >
                  <option value="">Select year</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notable achievements, projects, thesis topic..."
              rows={3}
              maxLength={1000}
            />
          </div>

          {/* Activities & Societies */}
          {showAcademicFields && (
            <>
              <div className="space-y-2">
                <Label htmlFor="activities">Activities</Label>
                <Textarea
                  id="activities"
                  value={activities}
                  onChange={(e) => setActivities(e.target.value)}
                  placeholder="Sports, clubs, volunteering, competitions..."
                  rows={2}
                  maxLength={500}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="societies">Societies & Organizations</Label>
                <Textarea
                  id="societies"
                  value={societies}
                  onChange={(e) => setSocieties(e.target.value)}
                  placeholder="Student council, technical societies, cultural groups..."
                  rows={2}
                  maxLength={500}
                />
              </div>
            </>
          )}

          {/* Skills Gained */}
          <div className="space-y-2">
            <Label>Skills Learned Here</Label>
            <p className="text-[11px] text-muted-foreground">
              These will be automatically added to your main skills section
            </p>
            <div className="flex gap-2">
              <Input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                placeholder="Type a skill and press Enter"
              />
              <Button type="button" variant="outline" onClick={addSkill}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {skillsGained.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {skillsGained.map(s => (
                  <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded text-xs">
                    {s}
                    <button onClick={() => removeSkill(s)} className="hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-3 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || (!institution?.name && !institution?.id)} 
              className="flex-1"
            >
              {saving ? 'Saving...' : (isEdit ? 'Update Education' : 'Add Education')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}