'use client'

import { useEffect } from 'react'
import { X, CheckCircle, Circle, PaperPlaneTilt } from '@phosphor-icons/react'

interface Props {
  draft: any
  publishing: boolean
  onPublish: () => void
  onClose: () => void
  onGoToField: (field: string) => void
}

interface Check {
  id: string
  label: string
  passed: boolean
  field?: string
}

export function PublishValidator({ draft, publishing, onPublish, onClose, onGoToField }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && !publishing && onClose()
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose, publishing])

  const checks: Check[] = [
    { id: 'title', label: 'Title added', passed: !!draft?.title && draft.title.trim().length > 3, field: 'title' },
    { id: 'subtitle', label: 'Short subtitle added', passed: !!draft?.subtitle && draft.subtitle.trim().length > 5, field: 'subtitle' },
    { id: 'description', label: 'Description written', passed: !!(draft?.content_text || draft?.content_blocks?.some((b: any) => b.content)), field: 'content_blocks' },
    { id: 'category', label: 'Category selected', passed: !!draft?.primary_category_id, field: 'opportunity_type' },
    { id: 'type', label: 'Opportunity type selected', passed: !!draft?.opportunity_type, field: 'opportunity_type' },
    { id: 'skills', label: 'At least one required skill', passed: (draft?.required_skills || []).length > 0 },
    { id: 'compensation', label: 'Compensation type set', passed: !!draft?.compensation_type, field: 'compensation_type' },
    { id: 'work_mode', label: 'Work mode set', passed: !!draft?.work_mode },
  ]

  const passed = checks.filter(c => c.passed).length
  const total = checks.length
  const allPassed = passed === total
  const missing = checks.filter(c => !c.passed)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={!publishing ? onClose : undefined}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-[#0a0a0a] overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500">
              {allPassed ? 'Ready to publish' : `${missing.length} thing${missing.length === 1 ? '' : 's'} to check`}
            </div>
            <h2 className="text-[15px] font-bold text-white mt-0.5">
              Publish opportunity
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={publishing}
            className="w-8 h-8 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900 disabled:opacity-40"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11.5px] text-zinc-500">{passed} of {total} checks passed</span>
            <span className="text-[11.5px] font-bold text-white">{Math.round((passed / total) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
            <div
              className={
                'h-full rounded-full transition-all ' +
                (allPassed ? 'bg-emerald-400' : 'bg-white')
              }
              style={{ width: `${(passed / total) * 100}%` }}
            />
          </div>
        </div>

        {/* Checks */}
        <div className="max-h-72 overflow-y-auto">
          {checks.map(c => (
            <button
              key={c.id}
              onClick={() => !c.passed && c.field && onGoToField(c.field)}
              disabled={c.passed}
              className={
                'w-full flex items-center gap-3 px-6 py-3 text-left transition-colors ' +
                (c.passed
                  ? 'cursor-default'
                  : 'hover:bg-zinc-900 cursor-pointer')
              }
            >
              {c.passed ? (
                <CheckCircle size={14} weight="fill" className="text-emerald-400 shrink-0" />
              ) : (
                <Circle size={14} weight="regular" className="text-zinc-600 shrink-0" />
              )}
              <span className={
                'text-[13px] flex-1 ' +
                (c.passed ? 'text-zinc-400' : 'text-white font-medium')
              }>
                {c.label}
              </span>
              {!c.passed && c.field && (
                <span className="text-[10.5px] font-medium text-zinc-500">Fix →</span>
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-zinc-800 bg-zinc-950/50">
          <button
            onClick={onClose}
            disabled={publishing}
            className="h-9 px-4 rounded-md border border-zinc-800 hover:border-zinc-700 text-[12.5px] font-medium text-zinc-300 hover:text-white disabled:opacity-40 transition-colors"
          >
            Save as draft
          </button>
          <button
            onClick={onPublish}
            disabled={!allPassed || publishing}
            className="inline-flex items-center gap-1.5 h-9 px-5 rounded-md bg-white text-black hover:bg-zinc-100 text-[12.5px] font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_2px_12px_rgba(255,255,255,0.15)]"
          >
            {publishing ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-black/20 border-t-black animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <PaperPlaneTilt size={12} weight="fill" />
                Publish now
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}