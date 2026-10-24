'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { X } from 'lucide-react'
import slugify from 'slugify'

const categories = [
  'AI/ML',
  'Web Development',
  'Mobile',
  'Hardware',
  'Robotics',
  'Research',
  'Open Source',
  'Design',
  'Data Science',
  'DevOps',
  'Game Dev',
  'Other',
]

export function NewProjectForm() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const [title, setTitle] = useState('')
  const [tagline, setTagline] = useState('')
  const [description, setDescription] = useState('')
  const [stage, setStage] = useState('building')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [techStack, setTechStack] = useState<string[]>([])
  const [techInput, setTechInput] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [demoUrl, setDemoUrl] = useState('')
  const [isOpen, setIsOpen] = useState(true)
  const [isHiring, setIsHiring] = useState(false)

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  const addTech = () => {
    const t = techInput.trim()
    if (t && !techStack.includes(t) && techStack.length < 10) {
      setTechStack([...techStack, t])
      setTechInput('')
    }
  }

  const handleSubmit = async () => {
    if (!title.trim()) return
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    let slug = slugify(title, { lower: true, strict: true })
    // Ensure unique slug
    const { data: existing } = await supabase
      .from('projects')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`
    }

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        title: title.trim(),
        slug,
        tagline: tagline.trim() || null,
        description: description.trim() || null,
        stage,
        category: selectedCategories,
        tech_stack: techStack,
        github_url: githubUrl.trim() || null,
        demo_url: demoUrl.trim() || null,
        is_open: isOpen,
        is_hiring: isHiring,
        creator_id: user.id,
        started_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    setLoading(false)

    if (error) {
      console.error(error)
      alert('Failed to create project: ' + error.message)
      return
    }

    router.push(`/projects/${project.slug}`)
  }

  return (
    <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-6 space-y-5">
      <div className="space-y-2">
        <Label htmlFor="title">Project Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Autonomous Irrigation System"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tagline">Tagline</Label>
        <Input
          id="tagline"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="One line about your project"
          maxLength={120}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What are you building? What problem does it solve?"
          rows={5}
          maxLength={2000}
        />
      </div>

      <div className="space-y-2">
        <Label>Stage</Label>
        <div className="grid grid-cols-4 gap-2">
          {['idea', 'building', 'prototype', 'shipped'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStage(s)}
              className={`px-3 py-2 text-xs font-medium rounded-lg border-2 capitalize transition-all ${
                stage === s
                  ? 'border-primary bg-primary/5'
                  : 'border-border/40 hover:border-border'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Categories</Label>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => toggleCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                selectedCategories.includes(cat)
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border/40 hover:border-border'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Tech Stack</Label>
        <div className="flex gap-2">
          <Input
            value={techInput}
            onChange={(e) => setTechInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addTech()
              }
            }}
            placeholder="React, Python, TensorFlow..."
          />
          <Button type="button" variant="outline" size="sm" onClick={addTech}>
            Add
          </Button>
        </div>
        {techStack.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {techStack.map((t) => (
              <span
                key={t}
                className="flex items-center gap-1 px-2.5 py-1 text-xs bg-muted rounded-full"
              >
                {t}
                <button
                  type="button"
                  onClick={() =>
                    setTechStack(techStack.filter((x) => x !== t))
                  }
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="github">GitHub URL</Label>
          <Input
            id="github"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            placeholder="https://github.com/..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="demo">Demo URL</Label>
          <Input
            id="demo"
            value={demoUrl}
            onChange={(e) => setDemoUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-border/40">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isOpen}
            onChange={(e) => setIsOpen(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm">Open to collaborators</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isHiring}
            onChange={(e) => setIsHiring(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm">Actively looking for specific roles</span>
        </label>
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
          onClick={handleSubmit}
          disabled={!title.trim() || loading}
          className="flex-1"
        >
          {loading ? 'Creating...' : 'Create Project'}
        </Button>
      </div>
    </div>
  )
}