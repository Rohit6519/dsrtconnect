'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash, Briefcase, MapPin, Clock, CurrencyDollar, ListChecks, Question, Sparkle, Check } from '@phosphor-icons/react'

const EMPLOYMENT_TYPES = [
  { id: 'full-time', label: 'Full-time' },
  { id: 'part-time', label: 'Part-time' },
  { id: 'contract', label: 'Contract' },
  { id: 'internship', label: 'Internship' },
  { id: 'volunteer', label: 'Volunteer' },
]

const LOCATION_TYPES = [
  { id: 'remote', label: 'Remote' },
  { id: 'hybrid', label: 'Hybrid' },
  { id: 'onsite', label: 'On-site' },
]

const COMPENSATION_TYPES = [
  { id: 'unpaid', label: 'Unpaid' },
  { id: 'equity', label: 'Equity only' },
  { id: 'stipend', label: 'Stipend' },
  { id: 'salaried', label: 'Salaried' },
  { id: 'hourly', label: 'Hourly' },
  { id: 'negotiable', label: 'Negotiable' },
]

interface Props {
  slug: string
  role?: any  // if provided, editing
  onClose: () => void
  onSaved: () => void
}

export function RoleCreateModal({ slug, role, onClose, onSaved }: Props) {
  const editing = !!role
  const [title, setTitle] = useState(role?.title || '')
  const [description, setDescription] = useState(role?.description || '')
  const [employmentType, setEmploymentType] = useState(role?.employment_type || 'full-time')
  const [locationType, setLocationType] = useState(role?.location_type || 'remote')
  const [compensationType, setCompensationType] = useState(role?.compensation_type || 'unpaid')
  const [compensationDetails, setCompensationDetails] = useState(role?.compensation_details || '')
  const [minHours, setMinHours] = useState<number>(role?.min_commitment_hours || 0)
  const [positions, setPositions] = useState<number>(role?.positions_open || 1)

  const [responsibilities, setResponsibilities] = useState<string[]>(role?.responsibilities || [''])
  const [keySkills, setKeySkills] = useState<string[]>(role?.key_skills || role?.skills_needed || [''])
  const [deliverables, setDeliverables] = useState<string[]>(role?.deliverables || [''])
  const [customQuestions, setCustomQuestions] = useState<Array<{ question: string; required: boolean }>>(
    Array.isArray(role?.custom_questions) && role.custom_questions.length > 0
      ? role.custom_questions
      : []
  )

  const [saving, setSaving] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const updateList = (setter: any, list: string[], i: number, val: string) => {
    const next = [...list]
    next[i] = val
    setter(next)
  }

  const canSubmit = title.trim().length >= 3 && !saving

  const submit = async () => {
    if (!canSubmit) return
    setSaving(true)
    try {
      const body = {
        title: title.trim(),
        description: description.trim() || null,
        employment_type: employmentType,
        location_type: locationType,
        compensation_type: compensationType,
        compensation_details: compensationDetails.trim() || null,
        min_commitment_hours: minHours > 0 ? minHours : null,
        positions_open: positions,
        responsibilities: responsibilities.filter(x => x.trim().length > 0).map(s => s.trim()),
        key_skills: keySkills.filter(x => x.trim().length > 0).map(s => s.trim()),
        deliverables: deliverables.filter(x => x.trim().length > 0).map(s => s.trim()),
        custom_questions: customQuestions
          .filter(q => q.question.trim().length > 0)
          .map(q => ({ question: q.question.trim(), required: !!q.required })),
      }

      const url = editing
        ? '/api/projects/' + slug + '/roles/' + role.id
        : '/api/projects/' + slug + '/roles'
      const method = editing ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = await res.json()
        alert(j.error || 'Failed')
        return
      }
      onSaved()
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-start md:items-center justify-center p-0 md:p-4 overflow-y-auto">
      <div className="bg-[#0f0f18] border border-white/[0.08] w-full max-w-[680px] md:rounded-2xl overflow-hidden flex flex-col min-h-screen md:min-h-0 md:max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-orange-500/12 border border-orange-500/25 flex items-center justify-center">
              <Briefcase size={16} weight="fill" className="text-orange-300" />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-white">{editing ? 'Edit role' : 'Post an open role'}</h3>
              <p className="text-[12px] text-white/45">Attract builders to join your project</p>
            </div>
          </div>
          <button onClick={onClose} disabled={saving} className="text-white/50 hover:text-white p-1 disabled:opacity-50">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Title */}
          <div>
            <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5 block">Role title *</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 120))}
              placeholder="e.g. ML Engineer, Product Designer"
              className="w-full h-11 bg-white/[0.04] border border-white/[0.1] rounded-lg px-3.5 text-[15px] text-white placeholder:text-white/30 outline-none focus:border-white/25"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5 block">Role description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 5000))}
              rows={4}
              placeholder="What will they do? What impact will they have? Why should they join?"
              className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3.5 py-2.5 text-[14px] text-white placeholder:text-white/30 outline-none focus:border-white/25 resize-y"
            />
          </div>

          {/* Meta pills */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <PillGroup label="Employment" icon={<Clock size={11} />} options={EMPLOYMENT_TYPES} value={employmentType} onChange={setEmploymentType} />
            <PillGroup label="Location" icon={<MapPin size={11} />} options={LOCATION_TYPES} value={locationType} onChange={setLocationType} />
            <PillGroup label="Compensation" icon={<CurrencyDollar size={11} />} options={COMPENSATION_TYPES} value={compensationType} onChange={setCompensationType} />
          </div>

          {compensationType !== 'unpaid' && (
            <div>
              <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5 block">Compensation details</label>
              <input
                value={compensationDetails}
                onChange={(e) => setCompensationDetails(e.target.value.slice(0, 200))}
                placeholder="e.g. $80–100K + equity, $2K/mo stipend"
                className="w-full h-10 bg-white/[0.04] border border-white/[0.1] rounded-md px-3 text-[14px] text-white placeholder:text-white/30 outline-none focus:border-white/25"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5 block">Positions open</label>
              <input
                type="number"
                min={1}
                max={20}
                value={positions}
                onChange={(e) => setPositions(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full h-10 bg-white/[0.04] border border-white/[0.1] rounded-md px-3 text-[14px] text-white outline-none focus:border-white/25"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5 block">Min. hours / week</label>
              <input
                type="number"
                min={0}
                max={80}
                value={minHours}
                onChange={(e) => setMinHours(Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="0 = flexible"
                className="w-full h-10 bg-white/[0.04] border border-white/[0.1] rounded-md px-3 text-[14px] text-white outline-none focus:border-white/25"
              />
            </div>
          </div>

          {/* Responsibilities */}
          <ListInput
            label="Core responsibilities"
            icon={<ListChecks size={12} />}
            items={responsibilities}
            setItems={setResponsibilities}
            placeholder="e.g. Design ML models for crop detection"
          />

          {/* Key skills */}
          <ListInput
            label="Key skills required"
            icon={<Sparkle size={12} />}
            items={keySkills}
            setItems={setKeySkills}
            placeholder="e.g. Python, PyTorch, Computer Vision"
            inline
          />

          {/* Deliverables */}
          <ListInput
            label="Expected deliverables"
            icon={<Check size={12} />}
            items={deliverables}
            setItems={setDeliverables}
            placeholder="e.g. Working prototype in 3 months"
          />

          {/* Custom questions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider flex items-center gap-1">
                <Question size={12} /> Application questions (optional)
              </label>
              <button
                onClick={() => setCustomQuestions([...customQuestions, { question: '', required: false }])}
                className="text-[11px] font-semibold text-white/70 hover:text-white flex items-center gap-1"
              >
                <Plus size={11} weight="bold" /> Add question
              </button>
            </div>
            <p className="text-[11px] text-white/40 mb-2">Applicants will answer these when applying to your role.</p>
            {customQuestions.length === 0 ? (
              <p className="text-[12px] text-white/35 py-3 text-center bg-white/[0.02] border border-white/[0.06] rounded-md">No custom questions added</p>
            ) : (
              <div className="space-y-2">
                {customQuestions.map((q, i) => (
                  <div key={i} className="flex items-start gap-2 bg-white/[0.03] border border-white/[0.08] rounded-lg p-3">
                    <div className="flex-1 space-y-1.5">
                      <input
                        value={q.question}
                        onChange={(e) => {
                          const next = [...customQuestions]
                          next[i] = { ...next[i], question: e.target.value.slice(0, 300) }
                          setCustomQuestions(next)
                        }}
                        placeholder="e.g. Describe your ML background..."
                        className="w-full h-9 bg-white/[0.04] border border-white/[0.08] rounded-md px-3 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-white/25"
                      />
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={q.required}
                          onChange={(e) => {
                            const next = [...customQuestions]
                            next[i] = { ...next[i], required: e.target.checked }
                            setCustomQuestions(next)
                          }}
                          className="w-3.5 h-3.5 accent-white"
                        />
                        <span className="text-[11px] text-white/60">Required</span>
                      </label>
                    </div>
                    <button
                      onClick={() => setCustomQuestions(customQuestions.filter((_, x) => x !== i))}
                      className="text-white/40 hover:text-red-400 p-1"
                    >
                      <Trash size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/[0.06] px-6 py-3 flex items-center justify-end gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 h-9 text-[13px] text-white/70 hover:text-white border border-white/[0.1] rounded-md hover:bg-white/[0.04] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="px-5 h-9 text-[13px] font-semibold bg-white text-black hover:bg-white/90 rounded-md disabled:opacity-40 flex items-center gap-1.5"
          >
            {saving ? (
              <><div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" /> Saving</>
            ) : (
              <><Check size={13} weight="bold" /> {editing ? 'Save changes' : 'Post role'}</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function PillGroup({ label, icon, options, value, onChange }: {
  label: string; icon: React.ReactNode; options: { id: string; label: string }[]; value: string; onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5 flex items-center gap-1">
        {icon} {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 bg-white/[0.04] border border-white/[0.1] rounded-md px-3 text-[13px] text-white outline-none focus:border-white/25 cursor-pointer"
      >
        {options.map(o => <option key={o.id} value={o.id} className="bg-[#12121a]">{o.label}</option>)}
      </select>
    </div>
  )
}

function ListInput({ label, icon, items, setItems, placeholder, inline = false }: {
  label: string; icon: React.ReactNode; items: string[]; setItems: (v: string[]) => void; placeholder: string; inline?: boolean
}) {
  const add = () => setItems([...items, ''])
  const update = (i: number, v: string) => {
    const next = [...items]
    next[i] = v
    setItems(next)
  }
  const remove = (i: number) => {
    if (items.length === 1) { setItems(['']); return }
    setItems(items.filter((_, x) => x !== i))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider flex items-center gap-1">
          {icon} {label}
        </label>
        <button onClick={add} className="text-[11px] font-semibold text-white/70 hover:text-white flex items-center gap-1">
          <Plus size={11} weight="bold" /> Add
        </button>
      </div>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={item}
              onChange={(e) => update(i, e.target.value.slice(0, inline ? 40 : 200))}
              placeholder={placeholder}
              className="flex-1 h-9 bg-white/[0.04] border border-white/[0.08] rounded-md px-3 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-white/25"
            />
            {(item || items.length > 1) && (
              <button onClick={() => remove(i)} className="text-white/40 hover:text-red-400 p-1.5">
                <Trash size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
