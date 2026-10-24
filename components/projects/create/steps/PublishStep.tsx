// components/projects/create/steps/PublishStep.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Circle, Globe, Eye, EyeSlash, Copy, Check, ArrowRight, EnvelopeSimple } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useProjectCreationStore } from '@/stores/projectCreationStore'
import { QRCodeSVG } from '../QRCodeSVG'

export function PublishStep() {
  const router = useRouter()
  const { data, updateData, setSaving, reset } = useProjectCreationStore()
  const [publishedResult, setPublishedResult] = useState<{
    slug: string
    projectNumber: string
    dsrtEmail: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  const handlePublish = async () => {
    if (!data.id) {
      toast.error('Project draft ID missing. Please ensure draft is saved.')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/projects/draft/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()

      if (!res.ok) throw new Error(json.error)

      setPublishedResult({
        slug: json.slug,
        projectNumber: json.project_number || 'PRJ-' + Math.floor(100000 + Math.random() * 900000),
        dsrtEmail: `${json.slug}@dsrt.connect`,
      })
    } catch (e: any) {
      toast.error(e.message || 'Failed to publish project')
    } finally {
      setSaving(false)
    }
  }

  const projectUrl = publishedResult ? `${window.location.origin}/projects/${publishedResult.slug}` : ''

  const handleCopyLink = () => {
    navigator.clipboard.writeText(projectUrl)
    setCopied(true)
    toast.success('Link copied')
    setTimeout(() => setCopied(false), 2000)
  }

  const finishAndExit = (path: string) => {
    reset()
    router.push(path)
  }

  // ─── POST-PUBLISH SUCCESS SCREEN ───
  if (publishedResult) {
    return (
      <div className="animate-in fade-in duration-300 space-y-6">
        <div className="rounded-md border border-white/[0.06] bg-[#0A0A0C] p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <Check className="w-4 h-4 text-white" weight="bold" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-white">Project Published</h2>
              <p className="text-[13px] text-white/60">
                <strong className="text-white">{data.name}</strong> is now live on DSRT Connect.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#050505] border border-white/10 p-4 rounded-md">
              <p className="text-[10px] font-bold text-white/40 tracking-widest uppercase">Project ID</p>
              <p className="text-[13px] font-mono font-semibold text-white mt-1">{publishedResult.projectNumber}</p>
            </div>
            <div className="bg-[#050505] border border-white/10 p-4 rounded-md">
              <p className="text-[10px] font-bold text-white/40 tracking-widest uppercase">DSRT Mail</p>
              <p className="text-[12px] font-mono text-white/70 truncate mt-1 flex items-center gap-1.5">
                <EnvelopeSimple size={12} /> {publishedResult.dsrtEmail}
              </p>
            </div>
          </div>

          <div className="bg-[#050505] border border-white/10 p-4 rounded-md flex items-center gap-5">
            <div className="bg-white p-1.5 rounded-md">
              <QRCodeSVG value={projectUrl} size={70} />
            </div>
            <div className="space-y-2 flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white">Share Project</p>
              <p className="text-[12px] text-white/40">Copy link to share on social media or invite collaborators.</p>
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-white/10 hover:bg-white/20 text-white text-[12px] font-medium transition-colors mt-1"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy link'}
              </button>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-white/[0.06]">
            <p className="text-[10px] font-bold text-white/40 tracking-widest uppercase mb-3 mt-2">
              Next steps
            </p>
            <button
              type="button"
              onClick={() => finishAndExit(`/projects/${publishedResult.slug}`)}
              className="w-full flex items-center justify-between p-3.5 rounded-md border border-white/10 bg-[#050505] hover:bg-white/[0.04] transition-colors group"
            >
              <div>
                <p className="text-[13px] font-semibold text-white">Open Project Workspace</p>
                <p className="text-[11px] text-white/40 mt-0.5">Add documentation, technical notes, and updates.</p>
              </div>
              <ArrowRight size={14} className="text-white/40 group-hover:text-white" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── PRE-PUBLISH CHECKLIST ───
  const checks = [
    { label: 'Project Name & Type', desc: data.name, complete: !!(data.name && data.project_type) },
    { label: 'Tagline', desc: data.tagline, complete: !!data.tagline },
    { label: 'Description', desc: `${data.description?.length || 0} characters`, complete: !!(data.description && data.description.length >= 10) },
    { label: 'Domains', desc: data.primary_domain || 'None selected', complete: !!data.primary_domain },
    { label: 'Development Stage', desc: data.stage, complete: !!data.stage },
  ]

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-[13px] font-medium text-white/90 block">
          Project Card Preview
        </label>
        <div className="w-full max-w-[320px] bg-[#0A0A0C] border border-white/10 rounded-md overflow-hidden pointer-events-none">
          <div className="relative w-full aspect-[16/9] bg-[#050505]">
            {data.cover_image_url ? (
              <img src={data.cover_image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-zinc-900/40 flex items-center justify-center text-white/20 text-xs">No Cover</div>
            )}
            <div className="absolute bottom-2 left-2 w-8 h-8 rounded bg-[#050505] border border-white/10 overflow-hidden flex items-center justify-center font-bold text-white text-xs">
              {data.logo_url ? <img src={data.logo_url} alt="" className="w-full h-full object-cover" /> : (data.name || '?')[0]}
            </div>
          </div>
          <div className="p-3">
            <p className="text-[13px] font-semibold text-white truncate">{data.name || 'Untitled Project'}</p>
            <p className="text-[11px] text-white/50 truncate mt-0.5">{data.tagline || 'Tagline...'}</p>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-white/[0.06] space-y-3">
        <label className="text-[13px] font-medium text-white/90 block">
          Completeness Checklist
        </label>
        <div className="space-y-1.5">
          {checks.map((check, i) => (
            <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-md border border-white/[0.06] bg-[#0A0A0C]">
              {check.complete ? (
                <CheckCircle size={16} weight="fill" className="text-white shrink-0" />
              ) : (
                <Circle size={16} className="text-white/20 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <span className={`text-[12px] font-semibold ${check.complete ? 'text-white' : 'text-white/40'}`}>
                  {check.label}
                </span>
                <span className="text-[11px] text-white/40 ml-2 truncate">— {check.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-white/[0.06] space-y-3">
        <label className="text-[13px] font-medium text-white/90 block">
          Publish Visibility
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'public', label: 'Public', icon: Globe },
            { id: 'unlisted', label: 'Unlisted', icon: Eye },
            { id: 'private', label: 'Private', icon: EyeSlash },
          ].map(opt => {
            const active = data.visibility === opt.id
            const Icon = opt.icon
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => updateData({ visibility: opt.id as any })}
                className={`p-2.5 rounded-md border text-left transition-all ${
                  active ? 'bg-white/[0.06] border-white/30 text-white' : 'bg-[#050505] border-white/10 text-white/50 hover:bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Icon size={13} />
                  <span className="text-[12px] font-semibold">{opt.label}</span>
                </div>
              </button>
            )
          })}
        </div>
        {data.visibility === 'public' && (
          <div className="mt-2 bg-[#0A0A0C] border border-white/10 p-3 rounded-md">
             <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={data.show_in_explore}
                onChange={e => updateData({ show_in_explore: e.target.checked })}
                className="w-4 h-4 rounded bg-[#050505] border-white/20 text-[#4F7CFF] focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-[12px] text-white/80">Make project discoverable in DSRT Explore</span>
            </label>
          </div>
        )}
      </div>

      <div className="hidden">
        <button id="hidden-publish-trigger" type="button" onClick={handlePublish} />
      </div>
    </div>
  )
}