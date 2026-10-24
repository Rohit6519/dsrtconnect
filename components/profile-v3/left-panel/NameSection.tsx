'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle, Envelope, Copy } from '@phosphor-icons/react'
import { InlineEditableText } from '../shared/InlineEditableText'
import { cn } from '@/lib/utils'

interface NameSectionProps {
  fullName: string
  username: string
  isVerified: boolean
  isOwner: boolean
  onNameChange: (newName: string) => void
}

export function NameSection({
  fullName,
  username,
  isVerified,
  isOwner,
  onNameChange,
}: NameSectionProps) {
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const dsrtEmail = username ? `${username.toLowerCase().trim()}@dsrt.com` : null

  const handleSave = async (newName: string) => {
    setSaving(true)
    try {
      const res = await fetch('/api/profile/name', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: newName }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to save' }))
        throw new Error(err.error || 'Failed to save')
      }
      const data = await res.json()
      onNameChange(data.full_name)
      toast.success('Name updated')
    } catch (err: any) {
      toast.error(err.message || 'Failed to update name')
      throw err
    } finally {
      setSaving(false)
    }
  }

  const copyEmail = () => {
    if (!dsrtEmail) return
    navigator.clipboard.writeText(dsrtEmail)
    setCopied(true)
    toast.success('DSRT Mail address copied')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <InlineEditableText
          value={fullName || ''}
          onSave={handleSave}
          isOwner={isOwner}
          placeholder="Your name"
          className="text-[20px] sm:text-[22px] font-bold text-white tracking-tight leading-tight"
          editClassName="text-[20px] sm:text-[22px] font-bold text-white tracking-tight"
          maxLength={80}
        />
        {isVerified && (
          <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0" weight="fill" />
        )}
      </div>
      
      {username && (
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13px] text-white/50 font-medium">@{username}</p>
          
          {/* Formal DSRT Mail Badge - Deep Slate Blue instead of "vibe" gradient */}
          <button 
            onClick={copyEmail}
            className={cn(
              "group flex items-center gap-1.5 px-2 py-0.5 rounded-md border transition-all duration-200 select-none",
              copied 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" 
                : "bg-[#1e3a5f]/40 border-[#2c5282]/40 text-[#93c5fd] hover:bg-[#1e3a5f]/60 hover:border-[#2c5282]/60"
            )}
            title="Copy DSRT Mail address"
          >
            <Envelope className="w-3 h-3" weight={copied ? 'fill' : 'regular'} />
            <span className="text-[10px] font-mono tracking-wide">
              {dsrtEmail}
            </span>
            <Copy className={cn(
              "w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5",
              copied ? "hidden" : "block"
            )} />
          </button>
        </div>
      )}
    </div>
  )
}