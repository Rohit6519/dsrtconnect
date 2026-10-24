'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, X } from 'lucide-react'
import slugify from 'slugify'
import { DsrtPanel, DsrtInput, DsrtTextarea, DsrtButton } from '@/components/dsrt'
import { toast } from 'sonner'

interface HackathonFormProps {
  communities: any[]
  adminRole: string
}

export function HackathonForm({
  communities,
  adminRole,
}: HackathonFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [tagline, setTagline] = useState('')
  const [description, setDescription] = useState('')
  const [hostName, setHostName] = useState('')
  const [mode, setMode] = useState('online')
  const [location, setLocation] = useState('')
  const [prizePool, setPrizePool] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [registrationDeadline, setRegistrationDeadline] = useState('')
  const [themeInput, setThemeInput] = useState('')
  const [themes, setThemes] = useState<string[]>([])
  const [communityId, setCommunityId] = useState('')
  const [judgingCriteria, setJudgingCriteria] = useState('')
  const [submissionGuidelines, setSubmissionGuidelines] = useState('')

  const [aiHelping, setAiHelping] = useState(false)
  const [saving, setSaving] = useState(false)

  const addTheme = () => {
    if (themeInput.trim() && !themes.includes(themeInput.trim())) {
      setThemes([...themes, themeInput.trim()])
      setThemeInput('')
    }
  }

  const generateWithAI = async () => {
    if (!title.trim()) {
      toast.error('Add a title first, then AI can help generate the rest')
      return
    }
    setAiHelping(true)

    try {
      const res = await fetch('/api/admin/hackathon-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, tagline, themes }),
      })
      const data = await res.json()

      if (data.description) setDescription(data.description)
      if (data.judging_criteria) setJudgingCriteria(data.judging_criteria)
      if (data.submission_guidelines) setSubmissionGuidelines(data.submission_guidelines)
      if (data.suggested_themes) {
        setThemes([...new Set([...themes, ...data.suggested_themes])])
      }
      toast.success('AI generation complete')
    } catch (err) {
      toast.error('AI generation failed')
    }

    setAiHelping(false)
  }

  const handleSubmit = async () => {
    if (!title.trim() || !hostName.trim() || !startDate) {
      toast.error('Please fill required fields (Title, Host, Start Date)')
      return
    }

    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    const slug = slugify(title, { lower: true, strict: true })

    const { error } = await supabase
      .from('hackathons')
      .insert({
        title, slug, tagline: tagline || null, description, host_name: hostName,
        mode, location: location || null, prize_pool: prizePool || null,
        start_date: startDate, end_date: endDate || null, registration_deadline: registrationDeadline || null,
        themes, community_id: communityId || null, judging_criteria: judgingCriteria || null,
        submission_guidelines: submissionGuidelines || null, created_by: user?.id,
        created_by_admin_role: adminRole, approved: adminRole === 'dsrt_super_admin', status: 'upcoming',
      })

    setSaving(false)

    if (error) {
      toast.error('Error creating hackathon: ' + error.message)
      return
    }

    toast.success('Hackathon created successfully')
    router.push(`/admin/hackathons`)
    router.refresh()
  }

  return (
    <DsrtPanel padding="lg" className="space-y-6">
      {/* AI Assist Bar */}
      <div className="rounded-xl border border-[#2c5282]/40 bg-gradient-to-r from-[#1e3a5f]/30 to-[#0f172a]/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1e3a5f] border border-[#2c5282] flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-[#93c5fd]" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-white">AI Content Assistant</p>
            <p className="text-[11px] text-white/60 mt-0.5">Fill title first, then let AI generate descriptions and criteria.</p>
          </div>
        </div>
        <DsrtButton
          onClick={generateWithAI}
          disabled={!title.trim() || aiHelping}
          loading={aiHelping}
          size="sm"
          variant="primary"
          className="shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
          Generate
        </DsrtButton>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-white/60">Title *</label>
        <DsrtInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="DSRT AI Hackathon 2025" />
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-white/60">Tagline</label>
        <DsrtInput value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Build the future of autonomous intelligence" />
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-white/60">Host Name *</label>
        <DsrtInput value={hostName} onChange={(e) => setHostName(e.target.value)} placeholder="DSRT · IIT Bombay · CGEC" />
      </div>

      {adminRole === 'dsrt_super_admin' && communities.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-white/60">Community (optional)</label>
          <select
            value={communityId}
            onChange={(e) => setCommunityId(e.target.value)}
            className="w-full h-10 px-3 rounded-lg bg-white/[0.03] border border-white/[0.1] text-white text-[13px] focus:outline-none focus:border-[#2c5282] appearance-none"
          >
            <option value="" className="bg-[#0f172a]">DSRT-wide hackathon</option>
            {communities.map((c) => <option key={c.id} value={c.id} className="bg-[#0f172a]">{c.name}</option>)}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-white/60">Mode</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="w-full h-10 px-3 rounded-lg bg-white/[0.03] border border-white/[0.1] text-white text-[13px] focus:outline-none focus:border-[#2c5282] appearance-none"
          >
            <option value="online" className="bg-[#0f172a]">Online</option>
            <option value="in-person" className="bg-[#0f172a]">In-person</option>
            <option value="hybrid" className="bg-[#0f172a]">Hybrid</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-white/60">Prize Pool</label>
          <DsrtInput value={prizePool} onChange={(e) => setPrizePool(e.target.value)} placeholder="$50,000" />
        </div>
      </div>

      {mode !== 'online' && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-white/60">Location</label>
          <DsrtInput value={location} onChange={(e) => setLocation(e.target.value)} placeholder="San Francisco · Campus Center" />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-white/60">Registration Deadline</label>
          <DsrtInput type="date" value={registrationDeadline} onChange={(e) => setRegistrationDeadline(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-white/60">Start Date *</label>
          <DsrtInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-white/60">End Date</label>
          <DsrtInput type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-white/60">Themes</label>
        <div className="flex gap-2">
          <DsrtInput
            value={themeInput}
            onChange={(e) => setThemeInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTheme() } }}
            placeholder="AI, Climate, FinTech..."
          />
          <DsrtButton type="button" onClick={addTheme} variant="outline" className="shrink-0">Add</DsrtButton>
        </div>
        {themes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {themes.map((t) => (
              <span key={t} className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold bg-white/[0.06] border border-white/[0.1] rounded-md text-white/80">
                {t}
                <button type="button" onClick={() => setThemes(themes.filter((x) => x !== t))} className="hover:text-red-400">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-white/60">Description</label>
        <DsrtTextarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the hackathon..." rows={5} />
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-white/60">Judging Criteria</label>
        <DsrtTextarea value={judgingCriteria} onChange={(e) => setJudgingCriteria(e.target.value)} placeholder="How will submissions be evaluated?" rows={4} />
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-white/60">Submission Guidelines</label>
        <DsrtTextarea value={submissionGuidelines} onChange={(e) => setSubmissionGuidelines(e.target.value)} placeholder="What should teams submit?" rows={4} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-white/[0.06]">
        <DsrtButton variant="ghost" onClick={() => router.back()} disabled={saving} className="sm:w-32">Cancel</DsrtButton>
        <DsrtButton variant="white" onClick={handleSubmit} disabled={!title || !hostName || !startDate || saving} loading={saving} className="flex-1">
          Create Hackathon
        </DsrtButton>
      </div>
    </DsrtPanel>
  )
}