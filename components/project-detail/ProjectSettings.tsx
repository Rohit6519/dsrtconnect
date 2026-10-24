'use client'

import { useState } from 'react'
import { ProjectDeleteModal } from '../projects-hub/ProjectDeleteModal'
import { ConvertVentureModal } from './ConvertVentureModal'
import { Trash, Rocket, Info, CaretRight, FloppyDisk } from '@phosphor-icons/react'

interface Props {
  slug: string
  project: any
  onUpdate: (patch: Record<string, any>) => Promise<void>
  onArchive: () => Promise<void>
}

export function ProjectSettings({ slug, project, onUpdate, onArchive }: Props) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [convertModalOpen, setConvertModalOpen] = useState(false)

  // Example Settings State
  const [visibility, setVisibility] = useState(project.visibility || 'public')
  const [allowMatching, setAllowMatching] = useState(project.allow_builder_matching ?? true)
  const [isSaving, setIsSaving] = useState(false)

  const handleSaveSettings = async () => {
    setIsSaving(true)
    await onUpdate({
      visibility,
      is_public: visibility === 'public',
      show_in_explore: visibility === 'public',
      allow_builder_matching: allowMatching
    })
    setIsSaving(false)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      
      {/* General Settings */}
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h3 className="text-[16px] font-bold text-white">General Settings</h3>
          <p className="text-[12.5px] text-zinc-400 mt-0.5">Manage visibility and discovery preferences.</p>
        </div>
        <div className="p-5 space-y-6">
          
          <div className="space-y-3">
            <label className="block text-[12px] font-semibold text-white/70 uppercase tracking-wider">
              Project Visibility
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'public', label: 'Public', desc: 'Visible to everyone on DSRT' },
                { id: 'unlisted', label: 'Unlisted', desc: 'Anyone with the link can view' },
                { id: 'private', label: 'Private', desc: 'Only team members can view' }
              ].map(opt => (
                <div 
                  key={opt.id}
                  onClick={() => setVisibility(opt.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    visibility === opt.id 
                      ? 'bg-white/[0.06] border-white/[0.25] shadow-sm' 
                      : 'bg-[#09090b] border-white/[0.08] hover:bg-white/[0.02]'
                  }`}
                >
                  <p className={`text-[13px] font-bold ${visibility === opt.id ? 'text-white' : 'text-zinc-300'}`}>{opt.label}</p>
                  <p className="text-[11px] text-zinc-500 mt-1 leading-snug">{opt.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-[12px] font-semibold text-white/70 uppercase tracking-wider">
              Discovery & Matching
            </label>
            <label className="flex items-start gap-3 p-4 bg-[#09090b] border border-white/[0.08] rounded-xl cursor-pointer hover:bg-white/[0.02] transition-colors">
              <input 
                type="checkbox" 
                checked={allowMatching}
                onChange={e => setAllowMatching(e.target.checked)}
                className="w-4 h-4 rounded mt-0.5 bg-zinc-900 border-zinc-700 text-white focus:ring-0 focus:ring-offset-0" 
              />
              <div>
                <p className="text-[13px] font-bold text-white">Allow Builder Matching</p>
                <p className="text-[12px] text-zinc-400 mt-0.5 leading-snug">Let DSRT recommend your project to engineers and designers who match your tech stack and domain.</p>
              </div>
            </label>
          </div>

          <div className="pt-2">
            <button 
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 h-9 bg-white text-black font-semibold rounded-lg text-[12.5px] hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              <FloppyDisk size={14} weight="bold" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* Conversion Zone */}
      {!project.parent_venture_id && (
        <div className="bg-white/[0.03] border border-blue-500/20 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-blue-500/10 flex items-start gap-3 bg-blue-500/[0.02]">
            <Rocket size={20} weight="fill" className="text-blue-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-[16px] font-bold text-blue-100">Graduate to Venture</h3>
              <p className="text-[12.5px] text-blue-200/60 mt-1 max-w-xl leading-relaxed">
                Is this project turning into a real business? You can convert it into a DSRT Venture. This preserves all your technical history, team members, and documentation while unlocking business tools like the 10-step assessment, investor matching, and funding tools.
              </p>
              <button
                onClick={() => setConvertModalOpen(true)}
                className="mt-4 px-4 h-9 bg-blue-500 text-white font-bold rounded-lg text-[12.5px] hover:bg-blue-600 transition-colors flex items-center gap-1.5"
              >
                Graduate to Venture <CaretRight size={12} weight="bold" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div className="bg-white/[0.03] border border-red-500/20 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-red-500/10">
          <h3 className="text-[16px] font-bold text-red-400">Danger Zone</h3>
        </div>
        <div className="p-5 flex items-center justify-between gap-4">
          <div>
            <h4 className="text-[14px] font-bold text-white">Archive Project</h4>
            <p className="text-[12.5px] text-zinc-500 mt-0.5">Remove this project from public discovery. It can be restored later.</p>
          </div>
          <button
            onClick={() => setDeleteModalOpen(true)}
            className="flex items-center gap-1.5 px-4 h-9 bg-red-500/10 border border-red-500/30 text-red-400 font-semibold rounded-lg text-[12.5px] hover:bg-red-500/20 transition-colors shrink-0"
          >
            <Trash size={14} /> Archive Project
          </button>
        </div>
      </div>

      {deleteModalOpen && (
        <ProjectDeleteModal
          project={{ id: project.id, slug: project.slug, name: project.name }}
          onClose={() => setDeleteModalOpen(false)}
          onDeleted={onArchive}
        />
      )}

      {convertModalOpen && (
        <ConvertVentureModal
          project={{ id: project.id, slug: project.slug, name: project.name, parent_venture_id: project.parent_venture_id }}
          onClose={() => setConvertModalOpen(false)}
        />
      )}
    </div>
  )
}