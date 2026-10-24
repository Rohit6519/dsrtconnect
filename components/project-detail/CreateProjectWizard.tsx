'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  X, ArrowRight, ArrowLeft, Check, Rocket, Sparkle, Globe, Eye, EyeSlash,
  MagnifyingGlass, Plus
} from '@phosphor-icons/react'

const PROJECT_TYPES = [
  { id: 'startup', label: 'Startup / Venture', desc: 'Building a business or company' },
  { id: 'product', label: 'Product', desc: 'A specific product or app' },
  { id: 'research', label: 'Research', desc: 'Academic or scientific work' },
  { id: 'open-source', label: 'Open Source', desc: 'Community-driven code' },
  { id: 'community', label: 'Community Initiative', desc: 'For a group or community' },
  { id: 'social-impact', label: 'Social Impact', desc: 'Nonprofit or social good' },
  { id: 'personal', label: 'Personal Project', desc: 'Something you build for yourself' },
  { id: 'other', label: 'Other', desc: 'Something else entirely' },
]

interface Props {
  onClose: () => void
}

export function CreateProjectWizard({ onClose }: Props) {
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [creating, setCreating] = useState(false)

  // Step 1
  const [name, setName] = useState('')
  const [tagline, setTagline] = useState('')
  const [projectType, setProjectType] = useState('personal')

  // Step 2
  const [industryQuery, setIndustryQuery] = useState('')
  const [industryResults, setIndustryResults] = useState<any[]>([])
  const [selectedIndustry, setSelectedIndustry] = useState('')
  const [techQuery, setTechQuery] = useState('')
  const [techResults, setTechResults] = useState<any[]>([])
  const [selectedTech, setSelectedTech] = useState<string[]>([])

  // Step 3
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public')
  const [showInExplore, setShowInExplore] = useState(true)

  // Industry autocomplete
  useEffect(() => {
    if (step !== 2 || industryQuery.length < 1) { setIndustryResults([]); return }
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/sectors/search?q=' + encodeURIComponent(industryQuery))
        const json = await res.json()
        setIndustryResults(json.sectors || [])
      } catch { setIndustryResults([]) }
    }, 200)
    return () => clearTimeout(t)
  }, [industryQuery, step])

  // Tech autocomplete (reuse sectors as skill pool - lightweight)
  useEffect(() => {
    if (step !== 2 || techQuery.length < 1) { setTechResults([]); return }
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/sectors/search?q=' + encodeURIComponent(techQuery))
        const json = await res.json()
        setTechResults((json.sectors || []).filter((s: any) => !selectedTech.includes(s.name)))
      } catch { setTechResults([]) }
    }, 200)
    return () => clearTimeout(t)
  }, [techQuery, step, selectedTech])

  const addTech = (tech: string) => {
    if (selectedTech.length >= 4) return
    if (selectedTech.includes(tech)) return
    setSelectedTech(prev => [...prev, tech])
    setTechQuery('')
  }

  const removeTech = (tech: string) => {
    setSelectedTech(prev => prev.filter(t => t !== tech))
  }

  const addCustomTech = () => {
    const v = techQuery.trim()
    if (!v || selectedTech.length >= 4 || selectedTech.includes(v)) return
    setSelectedTech(prev => [...prev, v])
    setTechQuery('')
  }

  const canProceed1 = name.trim().length >= 3
  const canProceed2 = !!selectedIndustry

  const submit = async () => {
    setCreating(true)
    try {
      const category: string[] = [selectedIndustry, ...selectedTech].filter(Boolean).slice(0, 5)

      const res = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          tagline: tagline.trim() || null,
          short_description: tagline.trim() || null,
          project_type: projectType,
          industry: selectedIndustry,
          category,
          tech_stack: selectedTech,
          visibility,
          is_public: visibility === 'public',
          show_in_explore: visibility === 'public' && showInExplore,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create')

      // Redirect to inline editor
      router.push('/projects/' + json.project.slug)
      onClose()
    } catch (e: any) {
      alert(e?.message || 'Failed to create project')
    } finally { setCreating(false) }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0f0f18] border border-white/[0.08] rounded-2xl w-full max-w-[560px] max-h-[92vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
              <Rocket size={16} weight="fill" className="text-white" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-white">Create a project</h3>
              <p className="text-[11px] text-white/45">Step {step} of 3</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 pt-3 pb-1">
          <div className="flex gap-1.5">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className={
                  'h-1 flex-1 rounded-full transition-colors ' +
                  (s <= step ? 'bg-white' : 'bg-white/10')
                }
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {step === 1 && (
            <>
              <h2 className="text-[20px] font-bold text-white mb-1">Start with the basics</h2>
              <p className="text-[13px] text-white/55 mb-5">What are you building? You can change any of this later.</p>

              <div className="space-y-4">
                <div>
                  <label className="text-[12px] font-semibold text-white/60 uppercase tracking-wider mb-1.5 block">
                    Project name *
                  </label>
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, 120))}
                    placeholder="e.g. DSRT Connect"
                    className="w-full h-11 bg-white/[0.04] border border-white/[0.1] rounded-lg px-3.5 text-[15px] text-white placeholder:text-white/30 outline-none focus:border-white/30"
                  />
                </div>

                <div>
                  <label className="text-[12px] font-semibold text-white/60 uppercase tracking-wider mb-1.5 block">
                    Short description
                  </label>
                  <input
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value.slice(0, 200))}
                    placeholder="One line about what it does"
                    className="w-full h-11 bg-white/[0.04] border border-white/[0.1] rounded-lg px-3.5 text-[14px] text-white placeholder:text-white/30 outline-none focus:border-white/30"
                  />
                  <p className="text-[11px] text-white/35 mt-1">{tagline.length}/200</p>
                </div>

                <div>
                  <label className="text-[12px] font-semibold text-white/60 uppercase tracking-wider mb-2 block">
                    Project type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {PROJECT_TYPES.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setProjectType(t.id)}
                        className={
                          'text-left px-3 py-2.5 rounded-lg border transition-colors ' +
                          (projectType === t.id
                            ? 'bg-white/[0.06] border-white/[0.25]'
                            : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.04]')
                        }
                      >
                        <p className={'text-[13px] font-semibold ' + (projectType === t.id ? 'text-white' : 'text-white/80')}>{t.label}</p>
                        <p className="text-[11px] text-white/45 mt-0.5">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-[20px] font-bold text-white mb-1">Industry & tech</h2>
              <p className="text-[13px] text-white/55 mb-5">Helps DSRT recommend your project to the right people.</p>

              <div className="space-y-5">
                {/* Industry */}
                <div>
                  <label className="text-[12px] font-semibold text-white/60 uppercase tracking-wider mb-1.5 block">
                    Industry * (pick one)
                  </label>
                  {selectedIndustry ? (
                    <div className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/[0.2] rounded-lg px-3 py-1.5 mb-2">
                      <Check size={12} weight="bold" className="text-white" />
                      <span className="text-[13px] text-white">{selectedIndustry}</span>
                      <button onClick={() => setSelectedIndustry('')} className="text-white/50 hover:text-white ml-1">
                        <X size={12} />
                      </button>
                    </div>
                  ) : null}
                  <div className="relative">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={13} />
                    <input
                      value={industryQuery}
                      onChange={(e) => setIndustryQuery(e.target.value)}
                      placeholder="Type to search industries..."
                      className="w-full pl-9 h-10 bg-white/[0.04] border border-white/[0.1] rounded-lg text-[14px] text-white placeholder:text-white/30 outline-none focus:border-white/30"
                    />
                  </div>
                  {industryResults.length > 0 && (
                    <div className="mt-1.5 max-h-[180px] overflow-y-auto bg-white/[0.03] border border-white/[0.08] rounded-lg py-1">
                      {industryResults.map(s => (
                        <button
                          key={s.id}
                          onClick={() => { setSelectedIndustry(s.name); setIndustryQuery('') }}
                          className="w-full text-left px-3 py-2 text-[13px] text-white/85 hover:bg-white/[0.05]"
                        >
                          {s.name}
                          {s.popular && <span className="ml-2 text-[10px] text-white/40 font-semibold">POPULAR</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tech / Skills */}
                <div>
                  <label className="text-[12px] font-semibold text-white/60 uppercase tracking-wider mb-1.5 block">
                    Tech / skills (up to 4)
                  </label>
                  {selectedTech.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {selectedTech.map(t => (
                        <span key={t} className="inline-flex items-center gap-1.5 bg-white/[0.06] border border-white/[0.15] rounded-md px-2.5 py-1 text-[13px] text-white">
                          {t}
                          <button onClick={() => removeTech(t)} className="text-white/50 hover:text-white">
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {selectedTech.length < 4 && (
                    <div className="relative">
                      <input
                        value={techQuery}
                        onChange={(e) => setTechQuery(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTech() } }}
                        placeholder="e.g. React, Python, IoT (Enter to add custom)"
                        className="w-full h-10 bg-white/[0.04] border border-white/[0.1] rounded-lg px-3.5 text-[14px] text-white placeholder:text-white/30 outline-none focus:border-white/30"
                      />
                    </div>
                  )}
                  {techResults.length > 0 && techQuery.length > 0 && (
                    <div className="mt-1.5 max-h-[150px] overflow-y-auto bg-white/[0.03] border border-white/[0.08] rounded-lg py-1">
                      {techResults.slice(0, 6).map(s => (
                        <button
                          key={s.id}
                          onClick={() => addTech(s.name)}
                          className="w-full text-left px-3 py-1.5 text-[13px] text-white/85 hover:bg-white/[0.05] flex items-center justify-between"
                        >
                          <span>{s.name}</span>
                          <Plus size={11} className="text-white/40" />
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] text-white/35 mt-1.5">{selectedTech.length}/4 selected · Not seeing it? Type and press Enter.</p>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-[20px] font-bold text-white mb-1">Visibility</h2>
              <p className="text-[13px] text-white/55 mb-5">You can change this any time from project settings.</p>

              <div className="space-y-2">
                {[
                  { id: 'public', label: 'Public', desc: 'Anyone on DSRT can discover this project', icon: Globe },
                  { id: 'unlisted', label: 'Unlisted', desc: 'Only people with the link can view', icon: Eye },
                  { id: 'private', label: 'Private', desc: 'Only invited team members', icon: EyeSlash },
                ].map(opt => {
                  const Icon = opt.icon
                  const active = visibility === opt.id
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setVisibility(opt.id as any)}
                      className={
                        'w-full flex items-start gap-3 p-4 rounded-lg border text-left transition-colors ' +
                        (active
                          ? 'bg-white/[0.06] border-white/[0.25]'
                          : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.04]')
                      }
                    >
                      <div className={
                        'w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ' +
                        (active ? 'border-white bg-white' : 'border-white/25')
                      }>
                        {active && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                      </div>
                      <Icon size={16} className={active ? 'text-white' : 'text-white/50'} />
                      <div className="min-w-0 flex-1">
                        <p className={'text-[14px] font-semibold ' + (active ? 'text-white' : 'text-white/80')}>{opt.label}</p>
                        <p className="text-[12px] text-white/55 mt-0.5">{opt.desc}</p>
                      </div>
                    </button>
                  )
                })}
              </div>

              {visibility === 'public' && (
                <div className="mt-4 p-4 bg-white/[0.03] border border-white/[0.08] rounded-lg">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showInExplore}
                      onChange={(e) => setShowInExplore(e.target.checked)}
                      className="w-4 h-4 accent-white mt-0.5"
                    />
                    <div>
                      <p className="text-[14px] font-semibold text-white">Show in Explore Projects</p>
                      <p className="text-[12px] text-white/55 mt-0.5">
                        Let DSRT recommend your project to matching users.
                      </p>
                    </div>
                  </label>
                </div>
              )}

              <div className="mt-6 p-4 bg-white/[0.03] border border-white/[0.08] rounded-lg">
                <p className="text-[12px] text-white/55 flex items-start gap-2">
                  <Sparkle size={13} weight="fill" className="text-purple-300 flex-shrink-0 mt-0.5" />
                  <span>
                    After creating, you'll be taken to your project page where you can add a logo, cover image, detailed description, team members, links, and more.
                  </span>
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.06]">
          <button
            onClick={step === 1 ? onClose : () => setStep(step - 1)}
            disabled={creating}
            className="flex items-center gap-1.5 px-4 h-9 text-[13px] text-white/70 hover:text-white border border-white/[0.1] rounded-md hover:bg-white/[0.04] disabled:opacity-50"
          >
            <ArrowLeft size={13} /> {step === 1 ? 'Cancel' : 'Back'}
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={(step === 1 && !canProceed1) || (step === 2 && !canProceed2)}
              className="flex items-center gap-1.5 px-5 h-9 text-[13px] font-semibold bg-white text-black hover:bg-white/90 rounded-md disabled:opacity-40"
            >
              Continue <ArrowRight size={13} />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={creating}
              className="flex items-center gap-1.5 px-5 h-9 text-[13px] font-semibold bg-white text-black hover:bg-white/90 rounded-md disabled:opacity-50"
            >
              {creating ? (
                <><div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" /> Creating</>
              ) : (
                <><Rocket size={13} weight="fill" /> Create project</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
