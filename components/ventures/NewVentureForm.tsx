'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { X, Plus } from 'lucide-react'
import slugify from 'slugify'
import { SectorSelector } from '@/components/shared/SectorSelector'

const stages = [
  { id: 'idea', label: 'Idea', desc: 'Just exploring' },
  { id: 'building', label: 'Building', desc: 'Working on it' },
  { id: 'mvp', label: 'MVP', desc: 'Have a prototype' },
  { id: 'launched', label: 'Launched', desc: 'Live with users' },
  { id: 'growing', label: 'Growing', desc: 'Scaling up' },
  { id: 'funded', label: 'Funded', desc: 'Raised capital' },
]

const founderQuestions = [
  {
    id: 'background',
    label: 'Your background',
    placeholder:
      'Briefly: who are you, what have you built, what is your story?',
  },
  {
    id: 'why_this_idea',
    label: 'Why this idea?',
    placeholder:
      'What got you obsessed with this problem? Why do you care?',
  },
  {
    id: 'why_now',
    label: 'Why now?',
    placeholder:
      'Why is this the right time to build this? What changed?',
  },
  {
    id: 'unique_insight',
    label: 'Your unique insight',
    placeholder:
      'What do you know about this problem that most people miss?',
  },
  {
    id: 'prior_experience',
    label: 'Prior relevant experience',
    placeholder:
      'Have you built anything in this space before? What did you learn?',
  },
  {
    id: 'biggest_challenge',
    label: 'Biggest challenge ahead',
    placeholder: 'What is the hardest part of making this work?',
  },
  {
    id: 'vision_5_years',
    label: 'Vision in 5 years',
    placeholder: 'If this works, what does the world look like in 5 years?',
  },
  {
    id: 'how_make_money',
    label: 'How will it make money?',
    placeholder:
      'Even if early: how do you imagine this generating revenue?',
  },
  {
    id: 'competition',
    label: 'Who are the competitors?',
    placeholder: 'Who else is solving this? How are you different?',
  },
  {
    id: 'unfair_advantage',
    label: 'Your unfair advantage',
    placeholder:
      'What can you do that others cannot? Network, skills, access, insight?',
  },
]

export function NewVentureForm() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'venture' | 'founder'>('venture')

  // Venture fields
  const [name, setName] = useState('')
  const [tagline, setTagline] = useState('')
  const [vision, setVision] = useState('')
  const [description, setDescription] = useState('')
  const [stage, setStage] = useState('idea')
  const [selectedSectors, setSelectedSectors] = useState<string[]>([])
  const [website, setWebsite] = useState('')
  const [milestones, setMilestones] = useState<
    { title: string; target_date: string }[]
  >([{ title: '', target_date: '' }])

  // Founder profile fields
  const [founderAnswers, setFounderAnswers] = useState<Record<string, string>>(
    {}
  )

  const addMilestone = () => {
    if (milestones.length >= 5) return
    setMilestones([...milestones, { title: '', target_date: '' }])
  }

  const updateMilestone = (
    i: number,
    field: 'title' | 'target_date',
    value: string
  ) => {
    const next = [...milestones]
    next[i][field] = value
    setMilestones(next)
  }

  const removeMilestone = (i: number) => {
    setMilestones(milestones.filter((_, idx) => idx !== i))
  }

  const updateAnswer = (id: string, value: string) => {
    setFounderAnswers({ ...founderAnswers, [id]: value })
  }

  const canProceedToFounder =
    name.trim().length > 0 &&
    vision.trim().length > 0 &&
    selectedSectors.length > 0

  const handleSubmit = async () => {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    let slug = slugify(name, { lower: true, strict: true })
    const { data: existing } = await supabase
      .from('startups')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`
    }

    const fullDescription = vision
      ? `## Vision\n${vision}\n\n## About\n${description}`
      : description

    const { data: venture, error } = await supabase
      .from('startups')
      .insert({
        name: name.trim(),
        slug,
        tagline: tagline.trim() || null,
        description: fullDescription || null,
        stage,
        category: selectedSectors,
        website: website.trim() || null,
        founder_id: user.id,
        founded_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    if (error) {
      console.error(error)
      alert('Failed to create venture: ' + error.message)
      setLoading(false)
      return
    }

    // Founder as member
    await supabase.from('startup_members').insert({
      startup_id: venture.id,
      user_id: user.id,
      role: 'Founder',
      title: 'Founder',
      joined_date: new Date().toISOString().split('T')[0],
      status: 'active',
    })

    // Milestones
    const validMilestones = milestones.filter((m) => m.title.trim())
    if (validMilestones.length > 0) {
      await supabase.from('startup_milestones').insert(
        validMilestones.map((m) => ({
          startup_id: venture.id,
          title: m.title.trim(),
          achieved_date: m.target_date || null,
          status: 'target',
          is_public: true,
        }))
      )
    }

    // Founder profile (only if any answers given)
    const hasAnswers = Object.values(founderAnswers).some(
      (v) => v && v.trim().length > 0
    )
    if (hasAnswers) {
      await supabase.from('venture_founder_profiles').insert({
        startup_id: venture.id,
        user_id: user.id,
        ...founderAnswers,
      })
    }

    setLoading(false)
    router.push(`/ventures/${venture.slug}`)
  }

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        <div
          className={`flex-1 h-1 rounded-full ${
            step === 'venture' ? 'bg-primary' : 'bg-primary'
          }`}
        />
        <div
          className={`flex-1 h-1 rounded-full ${
            step === 'founder' ? 'bg-primary' : 'bg-muted'
          }`}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Step {step === 'venture' ? '1' : '2'} of 2 —{' '}
        {step === 'venture' ? 'Venture details' : 'Founder profile'}
      </p>

      {step === 'venture' && (
        <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Venture Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="DSRT"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Building the builder ecosystem"
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vision">Vision *</Label>
            <Textarea
              id="vision"
              value={vision}
              onChange={(e) => setVision(e.target.value)}
              placeholder="What world are you trying to create? What is the long-term mission?"
              rows={4}
              maxLength={1000}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">About</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does the venture do today? Who is it for?"
              rows={4}
              maxLength={2000}
            />
          </div>

          <div className="space-y-2">
            <Label>Stage</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {stages.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStage(s.id)}
                  className={`p-3 text-left rounded-xl border-2 transition-all ${
                    stage === s.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border/40 hover:border-border'
                  }`}
                >
                  <p className="text-sm font-semibold">{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Sectors *</Label>
            <SectorSelector
              selected={selectedSectors}
              onChange={setSelectedSectors}
              max={5}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://..."
            />
          </div>

          {/* Milestones */}
          <div className="space-y-3 pt-2 border-t border-border/40">
            <div className="flex items-center justify-between">
              <Label>Initial Milestones</Label>
              {milestones.length < 5 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addMilestone}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add
                </Button>
              )}
            </div>
            {milestones.map((m, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={m.title}
                  onChange={(e) =>
                    updateMilestone(i, 'title', e.target.value)
                  }
                  placeholder={`Milestone ${i + 1}`}
                  className="flex-1"
                />
                <Input
                  type="date"
                  value={m.target_date}
                  onChange={(e) =>
                    updateMilestone(i, 'target_date', e.target.value)
                  }
                  className="w-44"
                />
                {milestones.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMilestone(i)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => setStep('founder')}
              disabled={!canProceedToFounder}
              className="flex-1"
            >
              Next: Founder Profile →
            </Button>
          </div>
        </div>
      )}

      {step === 'founder' && (
        <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-6 space-y-5">
          <div>
            <h2 className="font-semibold">Founder Profile</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Answer these so visitors understand who you are and why you are
              building this. All optional but powerful. Inspired by Y
              Combinator&apos;s application questions.
            </p>
          </div>

          {founderQuestions.map((q) => (
            <div key={q.id} className="space-y-2">
              <Label htmlFor={q.id}>{q.label}</Label>
              <Textarea
                id={q.id}
                value={founderAnswers[q.id] || ''}
                onChange={(e) => updateAnswer(q.id, e.target.value)}
                placeholder={q.placeholder}
                rows={3}
                maxLength={1500}
              />
            </div>
          ))}

          <div className="flex gap-3 pt-4 border-t border-border/40">
            <Button
              variant="outline"
              onClick={() => setStep('venture')}
              disabled={loading}
            >
              ← Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Creating Venture...' : 'Create Venture'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}