'use client'

import { useState, useEffect } from 'react'
import { Warning, X, CircleNotch, CaretDown } from '@phosphor-icons/react'

const REASONS = [
  { value: 'not_specified', label: 'Prefer not to say' },
  { value: 'no_longer_interested', label: 'No longer interested' },
  { value: 'accepted_another', label: 'Accepted another opportunity' },
  { value: 'availability_changed', label: 'My availability changed' },
  { value: 'not_a_fit', label: 'Opportunity does not fit my skills' },
  { value: 'other', label: 'Other' },
]

interface Props {
  isOpen: boolean
  opportunityTitle: string
  isLoading: boolean
  onConfirm: (reason: string, note: string) => void
  onCancel: () => void
}

export function WithdrawModal({ isOpen, opportunityTitle, isLoading, onConfirm, onCancel }: Props) {
  const [reason, setReason] = useState('not_specified')
  const [note, setNote] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setReason('not_specified')
      setNote('')
      setShowDropdown(false)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  const currentReason = REASONS.find(r => r.value === reason)?.label

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={() => !isLoading && onCancel()}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-[#0c0d10] shadow-[0_20px_80px_rgba(0,0,0,0.8)] overflow-visible flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-950/50">
          <div className="flex items-center gap-2">
            <Warning size={18} weight="fill" className="text-amber-400" />
            <h2 className="text-[15px] font-bold text-white">Withdraw Application</h2>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors disabled:opacity-50"
          >
            <X size={15} weight="bold" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <p className="text-[13.5px] text-zinc-400 leading-relaxed">
            You are about to withdraw your application for <strong className="text-zinc-200">{opportunityTitle}</strong>. 
            The employer may be notified. You might not be able to apply again.
          </p>

          <div className="space-y-4">
            {/* Reason Dropdown */}
            <div className="relative">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                Why are you withdrawing? (Optional)
              </label>
              
              <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                disabled={isLoading}
                className="w-full flex items-center justify-between h-11 px-4 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-[13px] font-medium text-zinc-300 transition-colors focus:border-zinc-600 focus:outline-none"
              >
                <span>{currentReason}</span>
                <CaretDown size={14} className="text-zinc-500" weight="bold" />
              </button>

              {showDropdown && (
                <div className="absolute left-0 top-full mt-2 w-full rounded-xl border border-zinc-800 bg-[#121215] shadow-2xl z-50 py-1.5 max-h-60 overflow-y-auto">
                  {REASONS.map(r => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => { setReason(r.value); setShowDropdown(false) }}
                      className={
                        'w-full text-left px-4 py-2.5 text-[13px] transition-colors ' +
                        (reason === r.value ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-white hover:bg-zinc-900')
                      }
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Optional Note */}
            {reason === 'other' && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Additional Details
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={isLoading}
                  placeholder="Please specify..."
                  rows={2}
                  className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-none transition-colors"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800/80 bg-[#090a0c]">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="h-10 px-4 rounded-xl border border-zinc-800 hover:border-zinc-700 text-[13px] font-semibold text-zinc-300 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason, note)}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 h-10 px-6 rounded-xl text-[13px] font-bold transition-all disabled:opacity-60 bg-red-500 text-white hover:bg-red-400 shadow-[0_2px_12px_rgba(239,68,68,0.25)]"
          >
            {isLoading ? (
              <>
                <CircleNotch size={14} className="animate-spin" />
                Withdrawing...
              </>
            ) : (
              'Withdraw Application'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}