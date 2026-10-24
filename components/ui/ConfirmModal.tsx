'use client'

import { Warning, X, CircleNotch } from '@phosphor-icons/react'
import { useEffect } from 'react'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  
  // Prevent background scrolling when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) onCancel()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, isLoading, onCancel])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={() => !isLoading && onCancel()}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-[#0c0d10] shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-950/50">
          <div className="flex items-center gap-2">
            {isDestructive ? (
              <Warning size={18} weight="fill" className="text-red-400" />
            ) : (
              <Warning size={18} weight="fill" className="text-amber-400" />
            )}
            <h2 className="text-[15px] font-bold text-white">{title}</h2>
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
        <div className="p-6">
          <p className="text-[13.5px] text-zinc-400 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800/80 bg-[#090a0c]">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="h-10 px-4 rounded-xl border border-zinc-800 hover:border-zinc-700 text-[13px] font-semibold text-zinc-300 hover:text-white transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={
              'inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl text-[13px] font-bold transition-all disabled:opacity-60 ' +
              (isDestructive
                ? 'bg-red-500 text-white hover:bg-red-400 shadow-[0_2px_12px_rgba(239,68,68,0.25)]'
                : 'bg-white text-black hover:bg-zinc-200 shadow-[0_2px_12px_rgba(255,255,255,0.15)]')
            }
          >
            {isLoading ? (
              <>
                <CircleNotch size={14} className="animate-spin" />
                Processing...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  )
}