'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const questions = [
  {
    id: 'background',
    label: 'Your background',
    placeholder: 'Who are you, what have you built, what is your story?',
  },
  {
    id: 'why_this_idea',
    label: 'Why this idea?',
    placeholder: 'What got you obsessed with this problem?',
  },
  {
    id: 'why_now',
    label: 'Why now?',
    placeholder: 'Why is this the right time to build this?',
  },
  {
    id: 'unique_insight',
    label: 'Your unique insight',
    placeholder: 'What do you know that most people miss?',
  },
  {
    id: 'prior_experience',
    label: 'Prior relevant experience',
    placeholder: 'Have you built in this space before?',
  },
  {
    id: 'biggest_challenge',
    label: 'Biggest challenge ahead',
    placeholder: 'What is the hardest part?',
  },
  {
    id: 'vision_5_years',
    label: 'Vision in 5 years',
    placeholder: 'If this works, what does the world look like?',
  },
  {
    id: 'how_make_money',
    label: 'How will it make money?',
    placeholder: 'How do you imagine generating revenue?',
  },
  {
    id: 'competition',
    label: 'Competition',
    placeholder: 'Who else is solving this? How are you different?',
  },
  {
    id: 'unfair_advantage',
    label: 'Your unfair advantage',
    placeholder: 'What can you do that others cannot?',
  },
]

interface FounderProfileEditorProps {
  ventureId: string
  ventureSlug: string
  userId: string
  existing: any
}

export function FounderProfileEditor({
  ventureId,
  ventureSlug,
  userId,
  existing,
}: FounderProfileEditorProps) {
  const router = useRouter()
  const supabase = createClient()
  const [answers, setAnswers] = useState<Record<string, string>>(
    existing || {}
  )
  const [saving, setSaving] = useState(false)

  const update = (id: string, value: string) => {
    setAnswers({ ...answers, [id]: value })
  }

  const handleSave = async () => {
    setSaving(true)

    const payload: any = {
      startup_id: ventureId,
      user_id: userId,
      updated_at: new Date().toISOString(),
    }
    questions.forEach((q) => {
      payload[q.id] = answers[q.id]?.trim() || null
    })

    if (existing) {
      await supabase
        .from('venture_founder_profiles')
        .update(payload)
        .eq('id', existing.id)
    } else {
      await supabase.from('venture_founder_profiles').insert(payload)
    }

    setSaving(false)
    router.push(`/ventures/${ventureSlug}`)
    router.refresh()
  }

  return (
    <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-6 space-y-5">
      <p className="text-sm text-muted-foreground">
        All questions optional. Answer the ones that help people understand you
        and your vision.
      </p>

      {questions.map((q) => (
        <div key={q.id} className="space-y-2">
          <Label htmlFor={q.id}>{q.label}</Label>
          <Textarea
            id={q.id}
            value={answers[q.id] || ''}
            onChange={(e) => update(q.id, e.target.value)}
            placeholder={q.placeholder}
            rows={3}
            maxLength={1500}
          />
        </div>
      ))}

      <div className="flex gap-3 pt-4 border-t border-border/40">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </div>
  )
}