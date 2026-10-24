'use client'

import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AutocompleteInput } from '../shared/AutocompleteInput'
import { cn } from '@/lib/utils'
import {
  X,
  Check,
  GraduationCap,
  Plus,
  Trash,
  Spinner,
  ImageSquare,
  Upload,
} from '@phosphor-icons/react'

// ─── Types ─────────────────────────────────────────────────────────────────

interface Institution {
  id: string
  name: string
  short_name?: string
  logo_url?: string
}

interface Degree {
  id?: string
  name: string
  category?: string
}

interface Field {
  id?: string
  name: string
}

interface EducationEntry {
  id?: string
  institution_id?: string | null
  institution_name: string
  degree?: string | null
  field?: string | null
  education_level?: string | null
  start_year?: number | null
  end_year?: number | null
  is_current?: boolean
  grade?: string | null
  tagline?: string | null
  description?: string | null
  activities?: string | null
  images?: string[]
}

// ─── Constants ─────────────────────────────────────────────────────────────

const LEVELS = [
  { value: 'primary',          label: 'Primary School' },
  { value: 'secondary',        label: 'Secondary School (10th)' },
  { value: 'higher_secondary', label: 'Higher Secondary (12th)' },
  { value: 'diploma',          label: 'Diploma' },
  { value: 'bachelor',         label: 'Bachelor\'s Degree' },
  { value: 'master',           label: 'Master\'s Degree' },
  { value: 'phd',              label: 'PhD / Doctorate' },
  { value: 'certification',    label: 'Certification' },
  { value: 'bootcamp',         label: 'Bootcamp' },
  { value: 'other',            label: 'Other' },
]

const CURRENT_YEAR = new Date().getFullYear()

// ─── Props ─────────────────────────────────────────────────────────────────

interface EducationEditorProps {
  entry: EducationEntry | null   // null = create mode
  onSave: (saved: EducationEntry) => void
  onCancel: () => void
}

// ─── Main Component ────────────────────────────────────────────────────────

export function EducationEditor({ entry, onSave, onCancel }: EducationEditorProps) {
  const isEdit = !!entry?.id

  const [institutionName, setInstitutionName] = useState(entry?.institution_name || '')
  const [institutionId, setInstitutionId] = useState<string | null>(entry?.institution_id || null)
  const [degree, setDegree] = useState(entry?.degree || '')
  const [field, setField] = useState(entry?.field || '')
  const [level, setLevel] = useState(entry?.education_level || '')
  const [startYear, setStartYear] = useState(entry?.start_year?.toString() || '')
  const [endYear, setEndYear] = useState(entry?.end_year?.toString() || '')
  const [isCurrent, setIsCurrent] = useState(entry?.is_current || false)
  const [grade, setGrade] = useState(entry?.grade || '')
  const [tagline, setTagline] = useState(entry?.tagline || '')
  const [description, setDescription] = useState(entry?.description || '')
  const [activities, setActivities] = useState(entry?.activities || '')
  const [images, setImages] = useState<string[]>(entry?.images || [])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Autocomplete fetchers ─────────────────────────────────────────────

  const fetchInstitutions = async (q: string): Promise<Institution[]> => {
    try {
      const res = await fetch(`/api/institutions/search?q=${encodeURIComponent(q)}`)
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data.institutions) ? data.institutions : (data.results || [])
    } catch { return [] }
  }

  const fetchDegrees = async (q: string): Promise<Degree[]> => {
    try {
      const res = await fetch(`/api/degrees/search?q=${encodeURIComponent(q)}`)
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data.degrees) ? data.degrees : (data.results || [])
    } catch { return [] }
  }

  const fetchFields = async (q: string): Promise<Field[]> => {
    try {
      const res = await fetch(`/api/fields/search?q=${encodeURIComponent(q)}`)
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data.fields) ? data.fields : (data.results || [])
    } catch { return [] }
  }

  // ── Image upload ──────────────────────────────────────────────────────

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    if (images.length + files.length > 6) {
      toast.error('Max 6 images per education entry')
      return
    }

    setUploading(true)
    const uploadedUrls: string[] = []

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`)
        continue
      }
      if (file.size > 8 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 8MB)`)
        continue
      }

      const fd = new FormData()
      fd.append('file', file)

      try {
        const res = await fetch('/api/profile/education/upload-image', {
          method: 'POST',
          body: fd,
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Upload failed' }))
          toast.error(`${file.name}: ${err.error}`)
          continue
        }
        const data = await res.json()
        uploadedUrls.push(data.url)
      } catch {
        toast.error(`Failed to upload ${file.name}`)
      }
    }

    if (uploadedUrls.length > 0) {
      setImages((cur) => [...cur, ...uploadedUrls])
      toast.success(`${uploadedUrls.length} image(s) uploaded`)
    }

    setUploading(false)
    e.target.value = ''
  }

  const removeImage = (url: string) => {
    setImages((cur) => cur.filter((u) => u !== url))
  }

  // ── Save ──────────────────────────────────────────────────────────────

  const save = async () => {
    if (!institutionName.trim()) {
      toast.error('Institution name is required')
      return
    }

    // Validate year range
    if (startYear && endYear && !isCurrent) {
      const s = parseInt(startYear)
      const e = parseInt(endYear)
      if (s > e) {
        toast.error('End year cannot be before start year')
        return
      }
    }

    setSaving(true)

    const payload: any = {
      institution_id:   institutionId,
      institution_name: institutionName.trim(),
      degree:           degree.trim() || null,
      field:            field.trim() || null,
      education_level:  level || null,
      start_year:       startYear ? parseInt(startYear) : null,
      end_year:         isCurrent ? null : (endYear ? parseInt(endYear) : null),
      is_current:       isCurrent,
      grade:            grade.trim() || null,
      tagline:          tagline.trim() || null,
      description:      description.trim() || null,
      activities:       activities.trim() || null,
      images,
    }

    try {
      let res: Response
      if (isEdit) {
        res = await fetch('/api/profile/education', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: entry!.id, ...payload }),
        })
      } else {
        res = await fetch('/api/profile/education', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }))
        throw new Error(err.error || 'Save failed')
      }

      const data = await res.json()
      onSave(data.education)
      toast.success(isEdit ? 'Education updated' : 'Education added')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !saving && !uploading) onCancel() }}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 8 }}
        transition={{ duration: 0.15 }}
        className="bg-zinc-950 border border-zinc-800/60 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_24px_64px_rgba(0,0,0,0.6)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-zinc-400" weight="fill" />
            <h2 className="text-[15px] font-bold text-zinc-100 tracking-tight">
              {isEdit ? 'Edit Education' : 'Add Education'}
            </h2>
          </div>
          <button
            onClick={onCancel}
            disabled={saving || uploading}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" weight="bold" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="p-5 space-y-4 overflow-y-auto">

          {/* Level */}
          <FieldWrapper label="Level">
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full h-9 text-[13px] bg-zinc-900/60 border border-zinc-700 rounded-lg text-zinc-200 px-3 focus:outline-none focus:border-zinc-600"
            >
              <option value="">Select level...</option>
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </FieldWrapper>

          {/* Institution — autocomplete */}
          <FieldWrapper label="Institution *">
            <AutocompleteInput<Institution>
              value={institutionName}
              onChange={(v) => {
                setInstitutionName(v)
                setInstitutionId(null) // clear ID when typing manually
              }}
              onSelect={(inst) => {
                setInstitutionName(inst.name)
                setInstitutionId(inst.id)
              }}
              fetchSuggestions={fetchInstitutions}
              renderItem={(inst) => (
                <div className="flex items-center gap-2">
                  {inst.logo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={inst.logo_url} alt="" className="w-5 h-5 rounded object-cover flex-shrink-0" />
                  )}
                  <div>
                    <p className="text-[13px] font-medium">{inst.name}</p>
                    {inst.short_name && inst.short_name !== inst.name && (
                      <p className="text-[10px] text-zinc-600">{inst.short_name}</p>
                    )}
                  </div>
                </div>
              )}
              getItemKey={(inst) => inst.id}
              getItemLabel={(inst) => inst.name}
              placeholder="e.g., MIT, Stanford, IIT Delhi"
              allowCreate
              onCreate={(name) => {
                setInstitutionName(name)
                setInstitutionId(null)
              }}
            />
          </FieldWrapper>

          {/* Degree + Field — side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FieldWrapper label="Degree">
              <AutocompleteInput<Degree>
                value={degree}
                onChange={setDegree}
                onSelect={(d) => setDegree(d.name)}
                fetchSuggestions={fetchDegrees}
                renderItem={(d) => (
                  <div>
                    <p className="text-[13px] font-medium">{d.name}</p>
                    {d.category && <p className="text-[10px] text-zinc-600">{d.category}</p>}
                  </div>
                )}
                getItemKey={(d) => d.id || d.name}
                getItemLabel={(d) => d.name}
                placeholder="e.g., B.Tech, MBA"
                allowCreate
                onCreate={(name) => setDegree(name)}
              />
            </FieldWrapper>

            <FieldWrapper label="Field of Study">
              <AutocompleteInput<Field>
                value={field}
                onChange={setField}
                onSelect={(f) => setField(f.name)}
                fetchSuggestions={fetchFields}
                renderItem={(f) => <p className="text-[13px] font-medium">{f.name}</p>}
                getItemKey={(f) => f.id || f.name}
                getItemLabel={(f) => f.name}
                placeholder="e.g., Computer Science"
                allowCreate
                onCreate={(name) => setField(name)}
              />
            </FieldWrapper>
          </div>

          {/* Start / End year */}
          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper label="Start Year">
              <Input
                type="number"
                min="1950"
                max={CURRENT_YEAR + 10}
                value={startYear}
                onChange={(e) => setStartYear(e.target.value)}
                placeholder="2020"
                className="bg-zinc-900/60 border-zinc-700 text-zinc-200 h-9"
              />
            </FieldWrapper>
            <FieldWrapper label="End Year">
              <Input
                type="number"
                min="1950"
                max={CURRENT_YEAR + 15}
                value={endYear}
                onChange={(e) => setEndYear(e.target.value)}
                placeholder={isCurrent ? 'Present' : '2024'}
                disabled={isCurrent}
                className="bg-zinc-900/60 border-zinc-700 text-zinc-200 h-9 disabled:opacity-40"
              />
            </FieldWrapper>
          </div>

          {/* Currently studying */}
          <label className="flex items-center gap-2 text-[13px] text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={isCurrent}
              onChange={(e) => {
                setIsCurrent(e.target.checked)
                if (e.target.checked) setEndYear('')
              }}
              className="rounded"
            />
            I&apos;m currently studying here
          </label>

          {/* Grade */}
          <FieldWrapper label="Grade / CGPA (optional)">
            <Input
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="e.g., 9.2/10, 3.8 GPA, 94%"
              maxLength={40}
              className="bg-zinc-900/60 border-zinc-700 text-zinc-200 h-9"
            />
          </FieldWrapper>

          {/* Tagline */}
          <FieldWrapper label="Tagline (optional)">
            <Input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g., Robotics Focus, Merit Scholar"
              maxLength={100}
              className="bg-zinc-900/60 border-zinc-700 text-zinc-200 h-9"
            />
          </FieldWrapper>

          {/* Description */}
          <FieldWrapper label="Description (optional)">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What did you focus on? Any notable achievements?"
              maxLength={800}
              className="bg-zinc-900/60 border-zinc-700 text-zinc-200 resize-none text-[13px]"
            />
          </FieldWrapper>

          {/* Activities */}
          <FieldWrapper label="Activities & Societies (optional)">
            <Textarea
              value={activities}
              onChange={(e) => setActivities(e.target.value)}
              rows={2}
              placeholder="Clubs, sports, research groups, hackathons..."
              maxLength={400}
              className="bg-zinc-900/60 border-zinc-700 text-zinc-200 resize-none text-[13px]"
            />
          </FieldWrapper>

          {/* Images */}
          <FieldWrapper label={`Photos (${images.length}/6)`}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFilesSelected}
            />

            <div className="space-y-2">
              {/* Grid of uploaded images */}
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {images.map((url) => (
                    <div key={url} className="relative group aspect-square rounded-lg overflow-hidden border border-zinc-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeImage(url)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 border border-white/20 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-500"
                        title="Remove"
                      >
                        <Trash className="w-3 h-3" weight="bold" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload button */}
              {images.length < 6 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed rounded-xl transition-colors',
                    uploading
                      ? 'border-zinc-700 bg-zinc-900/60'
                      : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-900/40'
                  )}
                >
                  {uploading ? (
                    <>
                      <Spinner className="w-4 h-4 text-zinc-400 animate-spin" weight="bold" />
                      <span className="text-[12px] text-zinc-400">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-zinc-500" weight="bold" />
                      <span className="text-[12px] text-zinc-400 font-semibold">
                        {images.length === 0 ? 'Upload campus / institution photos' : 'Add more photos'}
                      </span>
                    </>
                  )}
                </button>
              )}

              <p className="text-[10px] text-zinc-600 leading-relaxed">
                Add photos of the campus, ID card, degree certificate, or memorable moments. Max 6 images, 8MB each.
              </p>
            </div>
          </FieldWrapper>

        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-zinc-800/60 bg-zinc-950">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={saving || uploading}
            className="border-zinc-700 bg-transparent text-zinc-400 hover:text-zinc-200"
          >
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={saving || uploading}
            className="bg-white text-black hover:bg-zinc-100 min-w-[120px]"
          >
            {saving ? 'Saving...' : (
              <>
                <Check className="w-4 h-4 mr-1.5" weight="bold" />
                {isEdit ? 'Save Changes' : 'Add Education'}
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Helper ────────────────────────────────────────────────────────────────

function FieldWrapper({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
        {label}
      </label>
      {children}
    </div>
  )
}