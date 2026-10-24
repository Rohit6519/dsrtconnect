'use client'

import { useState, useRef, useEffect } from 'react'
import { X, PaperPlaneRight, Check, Paperclip, Trash, Warning } from '@phosphor-icons/react'

interface Props {
  slug: string
  role: any
  onClose: () => void
  onApplied: () => void
}

export function ApplyToRoleModal({ slug, role, onClose, onApplied }: Props) {
  const [coverLetter, setCoverLetter] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [availability, setAvailability] = useState('')
  const [expectedHours, setExpectedHours] = useState<number>(0)
  const [startDate, setStartDate] = useState('')
  const [resumeUrl, setResumeUrl] = useState('')
  const [resumeName, setResumeName] = useState('')
  const [uploadingResume, setUploadingResume] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [posting, setPosting] = useState(false)
  const resumeInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const customQuestions: Array<{ question: string; required: boolean }> = Array.isArray(role?.custom_questions)
    ? role.custom_questions
    : []

  const handleResume = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setUploadingResume(true)
    try {
      const fd = new FormData()
      fd.append('file', f)
      const res = await fetch('/api/projects/' + slug + '/resume-upload', {
        method: 'POST',
        body: fd,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Upload failed')
      setResumeUrl(json.url)
      setResumeName(json.name)
    } catch (err: any) {
      alert(err?.message || 'Upload failed')
    } finally {
      setUploadingResume(false)
      e.target.value = ''
    }
  }

  const missingRequiredAnswers = customQuestions
    .filter(q => q.required)
    .filter(q => !(answers[q.question] || '').trim())

  const canSubmit =
    coverLetter.trim().length >= 20 &&
    missingRequiredAnswers.length === 0 &&
    !posting

  const submit = async () => {
    if (!canSubmit) return
    setPosting(true)
    try {
      const body = {
        cover_letter: coverLetter.trim(),
        portfolio_url: portfolioUrl.trim() || null,
        github_url: githubUrl.trim() || null,
        linkedin_url: linkedinUrl.trim() || null,
        resume_url: resumeUrl || null,
        availability: availability.trim() || null,
        expected_hours: expectedHours > 0 ? expectedHours : null,
        start_date: startDate || null,
        answers,
      }
      const res = await fetch('/api/projects/' + slug + '/roles/' + role.id + '/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      onApplied()
      onClose()
    } catch (e: any) {
      alert(e?.message || 'Failed to apply')
    } finally { setPosting(false) }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-start md:items-center justify-center p-0 md:p-4 overflow-y-auto">
      <div className="bg-[#0f0f18] border border-white/[0.08] w-full max-w-[640px] md:rounded-2xl overflow-hidden flex flex-col min-h-screen md:min-h-0 md:max-h-[92vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] flex-shrink-0">
          <div>
            <h3 className="text-[16px] font-semibold text-white">Apply for {role.title}</h3>
            <p className="text-[12px] text-white/45 mt-0.5">Take your time — a strong application makes a real difference</p>
          </div>
          <button onClick={onClose} disabled={posting} className="text-white/50 hover:text-white p-1 disabled:opacity-50">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Cover letter */}
          <div>
            <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5 block">
              Why you? Cover letter * <span className="text-white/30 font-normal">({coverLetter.length}/3000)</span>
            </label>
            <textarea
              autoFocus
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value.slice(0, 3000))}
              rows={6}
              placeholder="Tell the team about yourself, why you want to join, and what makes you a great fit..."
              className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg p-3 text-[14px] text-white placeholder:text-white/30 outline-none focus:border-white/25 resize-y leading-relaxed"
            />
            {coverLetter.length > 0 && coverLetter.length < 20 && (
              <p className="text-[11px] text-orange-400 mt-1 flex items-center gap-1">
                <Warning size={11} weight="fill" /> Please write at least 20 characters
              </p>
            )}
          </div>

          {/* Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5 block">Portfolio</label>
              <input
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                placeholder="https://..."
                className="w-full h-10 bg-white/[0.04] border border-white/[0.1] rounded-md px-3 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-white/25"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5 block">GitHub</label>
              <input
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/..."
                className="w-full h-10 bg-white/[0.04] border border-white/[0.1] rounded-md px-3 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-white/25"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5 block">LinkedIn</label>
              <input
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/..."
                className="w-full h-10 bg-white/[0.04] border border-white/[0.1] rounded-md px-3 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-white/25"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5 block">Resume / CV</label>
              {resumeUrl ? (
                <div className="flex items-center gap-2 h-10 bg-white/[0.04] border border-white/[0.1] rounded-md px-3">
                  <Paperclip size={13} className="text-white/50" />
                  <a href={resumeUrl} target="_blank" rel="noopener noreferrer" className="flex-1 text-[13px] text-white truncate">{resumeName || 'Resume uploaded'}</a>
                  <button onClick={() => { setResumeUrl(''); setResumeName('') }} className="text-white/40 hover:text-red-400">
                    <Trash size={12} />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => resumeInputRef.current?.click()}
                    disabled={uploadingResume}
                    className="w-full h-10 bg-white/[0.04] border border-dashed border-white/[0.15] hover:border-white/[0.3] rounded-md text-[13px] text-white/60 hover:text-white flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {uploadingResume ? (
                      <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Uploading</>
                    ) : (
                      <><Paperclip size={12} /> Upload PDF</>
                    )}
                  </button>
                  <input ref={resumeInputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleResume} />
                </>
              )}
            </div>
          </div>

          {/* Availability */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5 block">Availability</label>
              <input
                value={availability}
                onChange={(e) => setAvailability(e.target.value.slice(0, 120))}
                placeholder="e.g. Weekends, Mon-Fri afternoons"
                className="w-full h-10 bg-white/[0.04] border border-white/[0.1] rounded-md px-3 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-white/25"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5 block">Hours / week</label>
              <input
                type="number"
                min={0}
                max={80}
                value={expectedHours}
                onChange={(e) => setExpectedHours(Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="20"
                className="w-full h-10 bg-white/[0.04] border border-white/[0.1] rounded-md px-3 text-[13px] text-white outline-none focus:border-white/25"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5 block">Can start</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-10 bg-white/[0.04] border border-white/[0.1] rounded-md px-3 text-[13px] text-white outline-none focus:border-white/25"
              />
            </div>
          </div>

          {/* Custom questions */}
          {customQuestions.length > 0 && (
            <div className="pt-3 border-t border-white/[0.06]">
              <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-3">Application questions</p>
              <div className="space-y-4">
                {customQuestions.map((q, i) => (
                  <div key={i}>
                    <label className="text-[13px] font-semibold text-white/85 mb-1.5 block">
                      {q.question}
                      {q.required && <span className="text-orange-400 ml-1">*</span>}
                    </label>
                    <textarea
                      value={answers[q.question] || ''}
                      onChange={(e) => setAnswers({ ...answers, [q.question]: e.target.value.slice(0, 2000) })}
                      rows={3}
                      placeholder="Your answer..."
                      className="w-full bg-white/[0.04] border border-white/[0.1] rounded-md p-3 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-white/25 resize-y"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-white/[0.06] px-6 py-3 flex items-center justify-between gap-3 flex-shrink-0">
          <p className="text-[11px] text-white/40 hidden sm:block">
            Your application will be sent to the project owner
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={posting}
              className="px-4 h-9 text-[13px] text-white/70 hover:text-white border border-white/[0.1] rounded-md disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!canSubmit}
              className="px-5 h-9 text-[13px] font-semibold bg-white text-black hover:bg-white/90 rounded-md disabled:opacity-40 flex items-center gap-1.5"
            >
              {posting ? (
                <><div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" /> Sending</>
              ) : (
                <><PaperPlaneRight size={12} weight="fill" /> Send application</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
