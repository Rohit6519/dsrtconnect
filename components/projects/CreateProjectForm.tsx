'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import slugify from 'slugify'
import { ArrowRight, ArrowLeft, Check, Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const SECTORS = [
  'Technology', 'Healthcare', 'Education', 'Finance', 'Manufacturing',
  'Agriculture', 'Defense', 'Aviation', 'Food & Hospitality', 'Retail',
  'Transportation', 'Energy', 'Construction', 'Media', 'Government',
  'Non-Profit', 'Research', 'Legal', 'Real Estate', 'Sports',
  'Entertainment', 'Telecommunications', 'Automotive', 'Marine',
  'Space', 'Environment', 'Other',
]

const SUGGESTED_CATEGORIES: Record<string, string[]> = {
  'Technology': ['SaaS', 'AI/ML', 'Web App', 'Mobile App', 'API', 'Dev Tools', 'Cloud', 'Cybersecurity', 'Blockchain', 'IoT', 'AR/VR', 'Open Source'],
  'Healthcare': ['Diagnostics', 'Telemedicine', 'Health Records', 'Drug Discovery', 'Medical Devices', 'Mental Health', 'Fitness', 'Clinical Trials'],
  'Education': ['E-Learning', 'EdTech', 'LMS', 'Tutoring', 'Skill Development', 'Assessment', 'Curriculum', 'Research Tools'],
  'Finance': ['FinTech', 'Banking', 'Insurance', 'Trading', 'Payments', 'Lending', 'Accounting', 'Crypto'],
  'Manufacturing': ['Automation', 'Quality Control', 'Supply Chain', 'Inventory', 'Process Optimization', 'Robotics'],
  'Defense': ['Surveillance', 'Communication', 'Logistics', 'Training', 'Simulation', 'Intelligence'],
  'Other': [],
}

const VISIBILITY_OPTIONS = [
  { id: 'private', label: 'Private', desc: 'Only invited team members can see' },
  { id: 'team', label: 'Team', desc: 'Anyone in your organization can see' },
  { id: 'public', label: 'Public', desc: 'Visible to everyone on DSRT' },
]

const COLORS = [
  { id: 'blue', class: 'bg-blue-500' },
  { id: 'purple', class: 'bg-purple-500' },
  { id: 'green', class: 'bg-green-500' },
  { id: 'orange', class: 'bg-orange-500' },
  { id: 'pink', class: 'bg-pink-500' },
  { id: 'red', class: 'bg-red-500' },
  { id: 'cyan', class: 'bg-cyan-500' },
  { id: 'yellow', class: 'bg-yellow-500' },
]

export function CreateProjectForm() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Step 1
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sector, setSector] = useState('')
  const [sectorSearch, setSectorSearch] = useState('')

  // Step 2
  const [categories, setCategories] = useState<string[]>([])
  const [customCategory, setCustomCategory] = useState('')
  const [categorySearch, setCategorySearch] = useState('')

  // Step 3
  const [color, setColor] = useState('blue')
  const [visibility, setVisibility] = useState('private')
  const [goals, setGoals] = useState('')

  const filteredSectors = SECTORS.filter(s =>
    sectorSearch ? s.toLowerCase().includes(sectorSearch.toLowerCase()) : true
  )

  const suggestedCats = SUGGESTED_CATEGORIES[sector] || []
  const filteredCats = suggestedCats.filter(c =>
    categorySearch ? c.toLowerCase().includes(categorySearch.toLowerCase()) : true
  )

  const toggleCategory = (cat: string) => {
    setCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  const addCustomCategory = () => {
    const trimmed = customCategory.trim()
    if (trimmed && !categories.includes(trimmed)) {
      setCategories(prev => [...prev, trimmed])
      setCustomCategory('')
    }
  }

  const handleCreate = async () => {
    if (!name.trim() || !sector) {
      toast.error('Please fill in project name and sector')
      return
    }

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const slug = slugify(name, { lower: true, strict: true }) + '-' + Date.now().toString(36)

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        slug,
        name: name.trim(),
        description: description.trim() || null,
        sector,
        category: categories,
        custom_category: customCategory.trim() || null,
        color,
        visibility,
        goals: goals.trim() || null,
        founder_id: user.id,
        icon: name.charAt(0).toUpperCase(),
      })
      .select()
      .single()

    if (error) {
      console.error('Create project error:', error)
      toast.error('Failed to create project: ' + error.message)
      setLoading(false)
      return
    }

    toast.success('Project created', {
      description: `${name} is ready. Start adding tasks.`,
    })

    router.push(`/projects/${project.slug}`)
  }

  return (
    <div className="space-y-8">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
              step >= s
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}>
              {step > s ? <Check className="w-4 h-4" /> : s}
            </div>
            {s < 3 && (
              <div className={cn(
                'w-16 h-0.5 rounded',
                step > s ? 'bg-primary' : 'bg-muted'
              )} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-lg font-semibold">Basic Information</h2>
              <p className="text-sm text-muted-foreground">What are you building?</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Smart Inventory System, AI Research Lab, Restaurant Manager"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What problem does this project solve? Who is it for?"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Sector *</Label>
              <p className="text-xs text-muted-foreground">
                What industry or domain does this project belong to?
              </p>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={sectorSearch}
                  onChange={e => setSectorSearch(e.target.value)}
                  placeholder="Search sectors..."
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                {filteredSectors.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSector(s)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg border text-sm font-medium transition-all',
                      sector === s
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'hover:bg-muted border-border'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={!name.trim() || !sector}
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-lg font-semibold">Project Type</h2>
              <p className="text-sm text-muted-foreground">
                What kind of {sector.toLowerCase()} project is this?
                Select from suggestions or add your own.
              </p>
            </div>

            {suggestedCats.length > 0 && (
              <div className="space-y-2">
                <Label>Suggested for {sector}</Label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={categorySearch}
                    onChange={e => setCategorySearch(e.target.value)}
                    placeholder="Search categories..."
                    className="pl-9"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {filteredCats.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg border text-sm font-medium transition-all',
                        categories.includes(cat)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'hover:bg-muted border-border'
                      )}
                    >
                      {cat}
                      {categories.includes(cat) && ' ✓'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Custom Category</Label>
              <p className="text-xs text-muted-foreground">
                Cannot find your type? Add your own.
              </p>
              <div className="flex gap-2">
                <Input
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                  placeholder="e.g. Drone Navigation, Farm Analytics"
                  onKeyDown={e => e.key === 'Enter' && addCustomCategory()}
                />
                <Button variant="outline" onClick={addCustomCategory} disabled={!customCategory.trim()}>
                  Add
                </Button>
              </div>
            </div>

            {categories.length > 0 && (
              <div className="space-y-2">
                <Label>Selected ({categories.length})</Label>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <span
                      key={cat}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-sm rounded-lg"
                    >
                      {cat}
                      <button
                        onClick={() => toggleCategory(cat)}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={() => setStep(3)}>
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-lg font-semibold">Settings</h2>
              <p className="text-sm text-muted-foreground">
                Configure visibility and appearance.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Project Color</Label>
              <div className="flex gap-2">
                {COLORS.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    className={cn(
                      'w-8 h-8 rounded-full transition-all',
                      c.class,
                      color === c.id
                        ? 'ring-2 ring-offset-2 ring-offset-background ring-white scale-110'
                        : 'opacity-60 hover:opacity-100'
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Visibility</Label>
              <div className="grid grid-cols-3 gap-3">
                {VISIBILITY_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setVisibility(opt.id)}
                    className={cn(
                      'p-3 rounded-xl border text-left transition-all',
                      visibility === opt.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted'
                    )}
                  >
                    <p className="text-sm font-semibold">{opt.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="goals">Project Goals (optional)</Label>
              <Textarea
                id="goals"
                value={goals}
                onChange={e => setGoals(e.target.value)}
                placeholder="What does success look like? What are you trying to achieve?"
                rows={3}
              />
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? 'Creating...' : 'Create Project'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
