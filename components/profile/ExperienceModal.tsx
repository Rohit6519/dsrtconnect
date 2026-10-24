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

const employmentTypes = [
  { id: 'full-time', label: 'Full-time' },
  { id: 'part-time', label: 'Part-time' },
  { id: 'contract', label: 'Contract' },
  { id: 'internship', label: 'Internship' },
  { id: 'freelance', label: 'Freelance' },
  { id: 'volunteer', label: 'Volunteer' },
  { id: 'self-employed', label: 'Self-employed' },
]

const industries = [
  'Technology', 'Healthcare', 'Finance', 'Education', 'E-Commerce',
  'Manufacturing', 'Real Estate', 'Media', 'Agriculture', 'Automotive',
  'Aviation', 'Defense', 'Energy', 'Food & Beverage', 'Fashion',
  'Sports', 'Hospitality', 'Legal', 'Consulting', 'Non-Profit',
  'Government', 'Research', 'Arts & Culture', 'Travel', 'Retail',
  'Logistics', 'Telecommunications', 'Construction', 'Other'
]

interface ExperienceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  experience?: any
  userId: string
  onSaved: (exp: any, isEdit: boolean) => void
}

export function ExperienceModal({ open, onOpenChange, experience, userId, onSaved }: ExperienceModalProps) {
  const supabase = createClient()
  const isEdit = !!experience

  const [role, setRole] = useState(experience?.role || '')
  const [company, setCompany] = useState(experience?.company || '')
  const [companyUrl, setCompanyUrl] = useState(experience?.company_url || '')
  const [employmentType, setEmploymentType] = useState(experience?.employment_type || 'full-time')
  const [industry, setIndustry] = useState(experience?.industry || '')
  const [location, setLocation] = useState(experience?.location || '')
  const [isCurrent, setIsCurrent] = useState(experience?.is_current ?? true)
  const [startDate, setStartDate] = useState(experience?.start_date || '')
  const [endDate, setEndDate] = useState(experience?.end_date || '')
  const [description, setDescription] = useState(experience?.description || '')
  const [skillsUsed, setSkillsUsed] = useState<string[]>(experience?.skills_used || [])
  const [skillInput, setSkillInput] = useState('')
  const [saving, setSaving] = useState(false)

  const addSkill = () => {
    const s = skillInput.trim()
    if (s && !skillsUsed.includes(s) && skillsUsed.length < 20) {
      setSkillsUsed([...skillsUsed, s])
      setSkillInput('')
    }
  }

  const removeSkill = (s: string) => {
    setSkillsUsed(skillsUsed.filter(x => x !== s))
  }

  const handleSave = async () => {
    if (!role.trim() || !company.trim()) {
      toast.error('Role and company are required')
      return
    }

    setSaving(true)

    const data = {
      user_id: userId,
      role: role.trim(),
      company: company.trim(),
      company_url: companyUrl.trim() || null,
      employment_type: employmentType,
      industry: industry || null,
      location: location.trim() || null,
      is_current: isCurrent,
      start_date: startDate || null,
      end_date: !isCurrent && endDate ? endDate : null,
      description: description.trim() || null,
      skills_used: skillsUsed,
    }

    let result
    if (isEdit) {
      result = await supabase
        .from('user_experience')
        .update(data)
        .eq('id', experience.id)
        .select()
        .single()
    } else {
      result = await supabase
        .from('user_experience')
        .insert(data)
        .select()
        .single()
    }

    if (result.error) {
      setSaving(false)
      toast.error('Failed to save: ' + result.error.message)
      return
    }

    // Auto-add skills to user's main skills section
    if (skillsUsed.length > 0) {
      try {
        await supabase.rpc('sync_skills_from_source', {
          p_user_id: userId,
          p_skill_names: skillsUsed,
        })
      } catch (err) {
        console.error('Sync skills error:', err)
      }
    }

    setSaving(false)
    toast.success(isEdit ? 'Experience updated' : 'Experience added')
    onSaved(result.data, isEdit)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Experience' : 'Add Experience'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Role & Company */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="role">Job Title / Role *</Label>
              <Input
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Software Engineer, Marketing Manager, etc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company / Organization *</Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Company name"
              />
            </div>
          </div>

          {/* Company URL */}
          <div className="space-y-2">
            <Label htmlFor="company_url">Company Website (optional)</Label>
            <Input
              id="company_url"
              value={companyUrl}
              onChange={(e) => setCompanyUrl(e.target.value)}
              placeholder="https://company.com"
            />
          </div>

          {/* Employment Type & Industry */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Employment Type</Label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className="w-full h-10 px-3 border rounded-md bg-background text-sm"
              >
                {employmentTypes.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full h-10 px-3 border rounded-md bg-background text-sm"
              >
                <option value="">Select industry</option>
                {industries.map(i => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, Country or Remote"
            />
          </div>

          {/* Dates */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isCurrent}
                onChange={(e) => setIsCurrent(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">I currently work here</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              {!isCurrent && (
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you do? What impact did you have? What did you achieve?"
              rows={5}
              maxLength={2000}
            />
            <p className="text-[10px] text-muted-foreground text-right">
              {description.length} / 2000
            </p>
          </div>

          {/* Skills */}
          <div className="space-y-2">
            <Label>Skills Used</Label>
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
            {skillsUsed.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {skillsUsed.map(s => (
                  <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded text-xs">
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
            <Button onClick={handleSave} disabled={saving || !role.trim() || !company.trim()} className="flex-1">
              {saving ? 'Saving...' : (isEdit ? 'Update Experience' : 'Add Experience')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}