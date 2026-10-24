'use client'

import { useState } from 'react'
import { CircleNotch } from '@phosphor-icons/react'

interface Props {
  project: { id: string; slug: string; name: string }
  onClose: () => void
  onDeleted: () => void
}

export function ProjectDeleteModal({ project, onClose, onDeleted }: Props) {
  const [confirmInput, setConfirmInput] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (confirmInput.trim() !== project.name.trim()) return
    setIsDeleting(true)
    await onDeleted()
    setIsDeleting(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#121215] border border-white/[0.1] rounded-2xl w-full max-w-md overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] p-6 space-y-5" onClick={e => e.stopPropagation()}>
        <h3 className="text-[18px] font-bold text-white">Archive project?</h3>
        
        <p className="text-[13.5px] text-zinc-400 leading-relaxed">
          This will archive <strong className="text-white">{project.name}</strong>. 
          Archived projects are hidden from Explore but remain accessible to you and your team.
        </p>
        
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-bold mb-2">
            Type "{project.name}" to confirm
          </label>
          <input
            type="text"
            value={confirmInput}
            onChange={e => setConfirmInput(e.target.value)}
            placeholder={project.name}
            className="w-full h-11 px-4 bg-[#09090b] border border-white/[0.1] rounded-xl text-[13.5px] font-medium text-white focus:outline-none focus:border-white/[0.2] transition-colors"
          />
        </div>
        
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} disabled={isDeleting} className="px-5 h-10 text-[13.5px] font-bold text-zinc-400 hover:text-white transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleDelete} 
            disabled={isDeleting || confirmInput.trim() !== project.name.trim()} 
            className="px-5 h-10 bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white text-red-400 font-bold rounded-xl text-[13.5px] disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {isDeleting ? <><CircleNotch size={14} className="animate-spin" /> Archiving</> : 'Archive Project'}
          </button>
        </div>
      </div>
    </div>
  )
}