'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProfileCard, ProfileCardHeader } from '../shared/ProfileCard'
import { LinkIcon } from '../shared/LinkIcon'
import {
  LinkedinLogo, TwitterLogo, InstagramLogo, FacebookLogo,
  GlobeSimple, Envelope,
  PencilSimple, Plus, X, Trash, Check, ArrowSquareOut, Spinner,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface SocialSlot {
  key: 'linkedin_url' | 'twitter_url' | 'instagram_url' | 'facebook_url' | 'website' | 'contact_email'
  label: string
  Icon: any
  iconClassName: string     // colored brand class
  isEmail?: boolean
  placeholder: string
  displayFn: (raw: string) => string
}

const SLOTS: SocialSlot[] = [
  {
    key: 'linkedin_url', label: 'LinkedIn',
    Icon: LinkedinLogo,
    iconClassName: 'text-[#0A66C2]',
    placeholder: 'linkedin.com/in/username',
    displayFn: (raw) => raw.replace(/^https?:\/\//, '').replace(/\/$/, ''),
  },
  {
    key: 'twitter_url', label: 'Twitter / X',
    Icon: TwitterLogo,
    iconClassName: 'text-zinc-100',
    placeholder: 'twitter.com/username',
    displayFn: (raw) => raw.replace(/^https?:\/\//, '').replace(/\/$/, ''),
  },
  {
    key: 'instagram_url', label: 'Instagram',
    Icon: InstagramLogo,
    // Instagram uses a real CSS gradient — apply via inline style below
    iconClassName: 'instagram-gradient-icon',
    placeholder: 'instagram.com/username',
    displayFn: (raw) => raw.replace(/^https?:\/\//, '').replace(/\/$/, ''),
  },
  {
    key: 'facebook_url', label: 'Facebook',
    Icon: FacebookLogo,
    iconClassName: 'text-[#1877F2]',
    placeholder: 'facebook.com/username',
    displayFn: (raw) => raw.replace(/^https?:\/\//, '').replace(/\/$/, ''),
  },
  {
    key: 'website', label: 'Website',
    Icon: GlobeSimple,
    iconClassName: 'text-emerald-400',
    placeholder: 'yourdomain.com',
    displayFn: (raw) => raw.replace(/^https?:\/\//, '').replace(/\/$/, ''),
  },
  {
    key: 'contact_email', label: 'Email',
    Icon: Envelope,
    iconClassName: 'text-red-400',
    isEmail: true,
    placeholder: 'you@domain.com',
    displayFn: (raw) => raw,
  },
]

interface CustomLink {
  id: string
  title: string
  url: string
  icon: string
  position: number
}

interface SocialLinksSectionProps {
  profile: any
  isOwner: boolean
  onSocialChange: (updates: Partial<any>) => void
}

export function SocialLinksSection({ profile, isOwner, onSocialChange }: SocialLinksSectionProps) {
  const [socialEditorOpen, setSocialEditorOpen] = useState(false)
  const [customEditorOpen, setCustomEditorOpen] = useState(false)
  const [editingCustomLink, setEditingCustomLink] = useState<CustomLink | null>(null)
  const [customLinks, setCustomLinks] = useState<CustomLink[]>([])
  const [loadingCustom, setLoadingCustom] = useState(true)

  useEffect(() => {
    if (!profile?.id) return
    ;(async () => {
      try {
        const res = await fetch(`/api/profile/custom-links?user_id=${profile.id}`)
        if (res.ok) {
          const data = await res.json()
          setCustomLinks(data.links || [])
        }
      } finally {
        setLoadingCustom(false)
      }
    })()
  }, [profile?.id])

  const filledSlots = SLOTS.filter((slot) => !!profile[slot.key])
  const hasAnyContent = filledSlots.length > 0 || customLinks.length > 0
  if (!hasAnyContent && !isOwner) return null

  return (
    <>
      <ProfileCard className="p-3">
        <ProfileCardHeader
          title="Links"
          action={
            isOwner && (
              <button
                onClick={() => setSocialEditorOpen(true)}
                className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Edit
              </button>
            )
          }
        />

        {/* All links in a single compact list (predefined + custom, no divider) */}
        <div className="space-y-0">
          {/* Predefined */}
          {filledSlots.map((slot) => (
            <PredefinedLinkRow key={slot.key} slot={slot} value={profile[slot.key]} />
          ))}

          {/* Custom (below predefined, seamless) */}
          {!loadingCustom && customLinks.map((link) => (
            <CustomLinkRow
              key={link.id}
              link={link}
              isOwner={isOwner}
              onEdit={() => { setEditingCustomLink(link); setCustomEditorOpen(true) }}
              onDelete={async () => {
                if (!confirm(`Delete "${link.title}"?`)) return
                const res = await fetch(`/api/profile/custom-links/${link.id}`, { method: 'DELETE' })
                if (res.ok) {
                  setCustomLinks((cur) => cur.filter((l) => l.id !== link.id))
                  toast.success('Link deleted')
                } else {
                  toast.error('Failed to delete')
                }
              }}
            />
          ))}
        </div>

        {/* Owner CTAs */}
        {isOwner && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-800/60">
            {filledSlots.length === 0 && (
              <button
                onClick={() => setSocialEditorOpen(true)}
                className="text-[10.5px] font-semibold text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                + Add social
              </button>
            )}
            <button
              onClick={() => { setEditingCustomLink(null); setCustomEditorOpen(true) }}
              className="text-[10.5px] font-semibold text-zinc-500 hover:text-zinc-300 transition-colors ml-auto"
            >
              + Custom link
            </button>
          </div>
        )}
      </ProfileCard>

      <AnimatePresence>
        {socialEditorOpen && (
          <SocialLinksEditor
            profile={profile}
            onSave={(updates) => { onSocialChange(updates); setSocialEditorOpen(false) }}
            onCancel={() => setSocialEditorOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {customEditorOpen && (
          <CustomLinkEditor
            link={editingCustomLink}
            onSave={(saved) => {
              if (editingCustomLink) {
                setCustomLinks((cur) => cur.map((l) => l.id === saved.id ? saved : l))
              } else {
                setCustomLinks((cur) => [...cur, saved])
              }
              setCustomEditorOpen(false)
              setEditingCustomLink(null)
            }}
            onCancel={() => { setCustomEditorOpen(false); setEditingCustomLink(null) }}
          />
        )}
      </AnimatePresence>

      {/* Instagram gradient style — global for the icon */}
      <style jsx global>{`
        .instagram-gradient-icon {
          background: linear-gradient(45deg, #F58529 0%, #DD2A7B 50%, #8134AF 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>
    </>
  )
}

function PredefinedLinkRow({ slot, value }: { slot: SocialSlot; value: string }) {
  const href = slot.isEmail ? `mailto:${value}` : value

  // Instagram uses gradient via SVG — needs special rendering
  const isInstagram = slot.key === 'instagram_url'

  return (
    <a
      href={href}
      target={slot.isEmail ? undefined : '_blank'}
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 py-1 px-1.5 -mx-1.5 rounded-md hover:bg-zinc-800/40 transition-colors group"
    >
      {isInstagram ? (
        <div className="w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(45deg, #F58529 0%, #DD2A7B 50%, #8134AF 100%)' }}
        >
          <slot.Icon className="w-3 h-3 text-white" weight="fill" />
        </div>
      ) : (
        <slot.Icon className={cn('w-4 h-4 flex-shrink-0', slot.iconClassName)} weight="fill" />
      )}
      <span className="text-[12px] text-zinc-300 truncate flex-1">{slot.displayFn(value)}</span>
      <ArrowSquareOut className="w-2.5 h-2.5 text-zinc-700 group-hover:text-zinc-500 flex-shrink-0 transition-colors" weight="bold" />
    </a>
  )
}

function CustomLinkRow({ link, isOwner, onEdit, onDelete }: {
  link: CustomLink; isOwner: boolean; onEdit: () => void; onDelete: () => void
}) {
  return (
    <div className="group flex items-center gap-2.5 py-1 px-1.5 -mx-1.5 rounded-md hover:bg-zinc-800/40 transition-colors">
      <a
        href={link.url} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-2.5 flex-1 min-w-0"
      >
        <LinkIcon icon={link.icon} className="w-4 h-4 flex-shrink-0" />
        <span className="text-[12px] text-zinc-300 truncate flex-1">{link.title}</span>
      </a>
      {isOwner && (
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="w-5 h-5 rounded flex items-center justify-center text-zinc-600 hover:text-zinc-200 hover:bg-zinc-800" title="Edit">
            <PencilSimple className="w-2.5 h-2.5" weight="bold" />
          </button>
          <button onClick={onDelete} className="w-5 h-5 rounded flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10" title="Delete">
            <Trash className="w-2.5 h-2.5" weight="bold" />
          </button>
        </div>
      )}
    </div>
  )
}

// Editors unchanged from before
function SocialLinksEditor({ profile, onSave, onCancel }: {
  profile: any; onSave: (updates: Partial<any>) => void; onCancel: () => void
}) {
  const [draft, setDraft] = useState<Record<string, string>>({
    linkedin_url:  profile.linkedin_url  || '',
    twitter_url:   profile.twitter_url   || '',
    instagram_url: profile.instagram_url || '',
    facebook_url:  profile.facebook_url  || '',
    website:       profile.website       || '',
    contact_email: profile.contact_email || '',
  })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/profile/social-links', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(err.error || 'Failed')
      }
      const data = await res.json()
      onSave(data.links)
      toast.success('Social links updated')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0, y: 8 }}
        transition={{ duration: 0.15 }}
        className="bg-zinc-950 border border-zinc-800/60 rounded-2xl w-full max-w-md shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_24px_64px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
          <h2 className="text-[15px] font-bold text-zinc-100 tracking-tight">Social Links</h2>
          <button onClick={onCancel} disabled={saving} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors">
            <X className="w-4 h-4" weight="bold" />
          </button>
        </div>

        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          {SLOTS.map((slot) => (
            <div key={slot.key} className="space-y-1.5">
              <label className="flex items-center gap-2 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                <slot.Icon className={cn('w-3.5 h-3.5', slot.iconClassName)} weight="fill" />
                {slot.label}
              </label>
              <Input
                value={draft[slot.key]}
                onChange={(e) => setDraft((d) => ({ ...d, [slot.key]: e.target.value }))}
                placeholder={slot.placeholder}
                type={slot.isEmail ? 'email' : 'url'}
                className="bg-zinc-900/60 border-zinc-700 text-zinc-200 h-9"
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-zinc-800/60">
          <Button variant="outline" onClick={onCancel} disabled={saving} className="border-zinc-700 bg-transparent text-zinc-400 hover:text-zinc-200">
            Cancel
          </Button>
          <Button onClick={save} disabled={saving} className="bg-white text-black hover:bg-zinc-100 min-w-[100px]">
            {saving ? 'Saving...' : <><Check className="w-4 h-4 mr-1.5" weight="bold" />Save</>}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function CustomLinkEditor({ link, onSave, onCancel }: {
  link: CustomLink | null; onSave: (saved: CustomLink) => void; onCancel: () => void
}) {
  const [title, setTitle] = useState(link?.title || '')
  const [url, setUrl] = useState(link?.url || '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!title.trim()) { toast.error('Title required'); return }
    if (!url.trim()) { toast.error('URL required'); return }
    setSaving(true)
    try {
      const res = link
        ? await fetch(`/api/profile/custom-links/${link.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, url }) })
        : await fetch('/api/profile/custom-links', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, url }) })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(err.error || 'Failed')
      }
      const data = await res.json()
      onSave(data.link)
      toast.success(link ? 'Link updated' : 'Link added')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0, y: 8 }}
        transition={{ duration: 0.15 }}
        className="bg-zinc-950 border border-zinc-800/60 rounded-2xl w-full max-w-md shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_24px_64px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
          <h2 className="text-[15px] font-bold text-zinc-100 tracking-tight">
            {link ? 'Edit Custom Link' : 'Add Custom Link'}
          </h2>
          <button onClick={onCancel} disabled={saving} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors">
            <X className="w-4 h-4" weight="bold" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Title *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., GitHub, Portfolio, Blog" maxLength={60} autoFocus className="bg-zinc-900/60 border-zinc-700 text-zinc-200 h-9" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">URL *</label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="github.com/username" className="bg-zinc-900/60 border-zinc-700 text-zinc-200 h-9" onKeyDown={(e) => e.key === 'Enter' && save()} />
            <p className="text-[10px] text-zinc-600">Icon auto-detected from URL</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-zinc-800/60">
          <Button variant="outline" onClick={onCancel} disabled={saving} className="border-zinc-700 bg-transparent text-zinc-400 hover:text-zinc-200">Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-white text-black hover:bg-zinc-100 min-w-[100px]">
            {saving ? 'Saving...' : <><Check className="w-4 h-4 mr-1.5" weight="bold" />{link ? 'Save' : 'Add Link'}</>}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}