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

const stages = [
  { id: 'idea', label: 'Idea', color: 'border-blue-500/30 bg-blue-500/10' },
  { id: 'building', label: 'Building', color: 'border-orange-500/30 bg-orange-500/10' },
  { id: 'launched', label: 'Launched', color: 'border-green-500/30 bg-green-500/10' },
  { id: 'growing', label: 'Growing', color: 'border-purple-500/30 bg-purple-500/10' },
  { id: 'exited', label: 'Exited', color: 'border-emerald-500/30 bg-emerald-500/10' },
  { id: 'paused', label: 'Paused', color: 'border-gray-500/30 bg-gray-500/10' },
]

const industries = [
  'Technology', 'Healthcare', 'Finance', 'Education', 'E-Commerce',
  'Manufacturing', 'Real Estate', 'Media & Entertainment', 'Agriculture',
  'Automotive', 'Aviation', 'Defense', 'Energy', 'Food & Beverage',
  'Fashion', 'Sports', 'Hospitality', 'Legal', 'Consulting', 'Non-Profit',
  'Government', 'Research', 'Arts & Culture', 'Travel & Tourism',
  'Retail', 'Logistics', 'Telecommunications', 'Construction', 'Other'
]

interface VentureModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  venture?: any
  userId: string
  onSaved: (venture: any, isEdit: boolean) => void
}

export function VentureModal({ open, onOpenChange, venture, userId, onSaved }: VentureModalProps) {
  const supabase = createClient()
  const isEdit = !!venture

  const [name, setName] = useState(venture?.name || '')
  const [description, setDescription] = useState(venture?.description || '')
  const [industry, setIndustry] = useState(venture?.industry || '')
  const [role, setRole] = useState(venture?.role || '')
  const [stage, setStage] = useState(venture?.stage || 'building')
  const [isCurrent, setIsCurrent] = useState(venture?.is_current ?? true)
  const [startDate, setStartDate] = useState(venture?.start_date || '')
  const [endDate, setEndDate] = useState(venture?.end_date || '')
  const [website, setWebsite] = useState(venture?.website || '')
  const [teamSize, setTeamSize] = useState(venture?.team_size?.toString() || '1')
  const [location, setLocation] = useState(venture?.location || '')
  const [fundingStage, setFundingStage] = useState(venture?.funding_stage || '')
  const [tags, setTags] = useState<string[]>(venture?.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [achievements, setAchievements] = useState<string[]>(venture?.achievements || [])
  const [achievementInput, setAchievementInput] = useState('')
  const [saving, setSaving] = useState(false)

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t) && tags.length < 10) {
      setTags([...tags, t])
      setTagInput('')
    }
  }

  const removeTag = (t: string) => {
    setTags(tags.filter(x => x !== t))
  }

  const addAchievement = () => {
    const a = achievementInput.trim()
    if (a && achievements.length < 5) {
      setAchievements([...achievements, a])
      setAchievementInput('')
    }
  }

  const removeAchievement = (i: number) => {
    setAchievements(achievements.filter((_, idx) => idx !== i))
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Venture name is required')
      return
    }

    setSaving(true)

    const data = {
      user_id: userId,
      name: name.trim(),
      description: description.trim() || null,
      industry: industry || null,
      role: role.trim() || null,
      stage,
      is_current: isCurrent,
      start_date: startDate || null,
      end_date: !isCurrent && endDate ? endDate : null,
      website: website.trim() || null,
      team_size: parseInt(teamSize) || 1,
      location: location.trim() || null,
      funding_stage: fundingStage || null,
      tags,
      achievements,
      updated_at: new Date().toISOString(),
    }

    let result
    if (isEdit) {
      result = await supabase
        .from('ventures')
        .update(data)
        .eq('id', venture.id)
        .select()
        .single()
    } else {
      result = await supabase
        .from('ventures')
        .insert(data)
        .select()
        .single()
    }

    setSaving(false)

    if (result.error) {
      toast.error('Failed to save: ' + result.error.message)
    } else {
      toast.success(isEdit ? 'Venture updated' : 'Venture added')
      onSaved(result.data, isEdit)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Venture' : 'Add Venture'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Venture Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. DSRT, Airbnb, My Startup"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this venture do? Who does it serve? What problem does it solve?"
              rows={4}
              maxLength={500}
            />
            <p className="text-[10px] text-muted-foreground text-right">
              {description.length} / 500
            </p>
          </div>

          {/* Industry & Role */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <select
                id="industry"
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
            <div className="space-y-2">
              <Label htmlFor="role">Your Role</Label>
              <Input
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Founder, CEO, CTO, etc."
              />
            </div>
          </div>

          {/* Stage */}
          <div className="space-y-2">
            <Label>Stage</Label>
            <div className="grid grid-cols-3 gap-2">
              {stages.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStage(s.id)}
                  className={cn(
                    'p-2 rounded-lg border-2 text-xs font-semibold transition-all',
                    stage === s.id ? s.color + ' scale-105' : 'border-border hover:bg-muted'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
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
              <span className="text-sm">Currently working on this</span>
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

          {/* Team & Location */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="team_size">Team Size</Label>
              <Input
                id="team_size"
                type="number"
                min="1"
                value={teamSize}
                onChange={(e) => setTeamSize(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, Country"
              />
            </div>
          </div>

          {/* Website & Funding */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="funding">Funding Stage</Label>
              <select
                id="funding"
                value={fundingStage}
                onChange={(e) => setFundingStage(e.target.value)}
                className="w-full h-10 px-3 border rounded-md bg-background text-sm"
              >
                <option value="">Not applicable</option>
                <option value="bootstrapped">Bootstrapped</option>
                <option value="pre-seed">Pre-Seed</option>
                <option value="seed">Seed</option>
                <option value="series-a">Series A</option>
                <option value="series-b">Series B</option>
                <option value="series-c">Series C+</option>
                <option value="ipo">IPO</option>
                <option value="acquired">Acquired</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add a tag (press Enter)"
              />
              <Button type="button" variant="outline" onClick={addTag}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map(t => (
                  <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded text-xs">
                    {t}
                    <button onClick={() => removeTag(t)} className="hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Achievements */}
          <div className="space-y-2">
            <Label>Key Achievements (max 5)</Label>
            <div className="flex gap-2">
              <Input
                value={achievementInput}
                onChange={(e) => setAchievementInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAchievement())}
                placeholder="e.g. Raised $1M seed round"
                disabled={achievements.length >= 5}
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={addAchievement}
                disabled={achievements.length >= 5}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {achievements.length > 0 && (
              <div className="space-y-1 mt-2">
                {achievements.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-muted/40 rounded text-sm">
                    <span className="text-green-500">✓</span>
                    <span className="flex-1">{a}</span>
                    <button onClick={() => removeAchievement(i)} className="text-muted-foreground hover:text-destructive">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-3 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()} className="flex-1">
              {saving ? 'Saving...' : (isEdit ? 'Update Venture' : 'Add Venture')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}