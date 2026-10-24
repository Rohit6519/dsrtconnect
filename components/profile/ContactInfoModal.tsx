'use client'

import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Mail, Phone, Globe, Github, Twitter, Linkedin, MapPin, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface ContactInfoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: any
  isOwnProfile: boolean
}

export function ContactInfoModal({ open, onOpenChange, profile, isOwnProfile }: ContactInfoModalProps) {
  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  }

  const showEmail = isOwnProfile || profile.show_contact
  const showPhone = isOwnProfile || profile.show_contact

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Contact Info</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Profile URL */}
          <ContactRow
            icon={Globe}
            label="Profile"
            value={`dsrtai.com/profile/${profile.username}`}
            onCopy={() => copy(`https://dsrtai.com/profile/${profile.username}`, 'Profile link')}
          />

          {/* Email */}
          {profile.contact_email && showEmail && (
            <ContactRow
              icon={Mail}
              label="Email"
              value={profile.contact_email}
              href={`mailto:${profile.contact_email}`}
              onCopy={() => copy(profile.contact_email, 'Email')}
            />
          )}

          {/* Phone */}
          {profile.contact_phone && showPhone && (
            <ContactRow
              icon={Phone}
              label="Phone"
              value={profile.contact_phone}
              href={`tel:${profile.contact_phone}`}
              onCopy={() => copy(profile.contact_phone, 'Phone')}
            />
          )}

          {/* Location */}
          {profile.location && (
            <ContactRow
              icon={MapPin}
              label="Location"
              value={profile.location}
            />
          )}

          {/* Website */}
          {profile.website && (
            <ContactRow
              icon={Globe}
              label="Website"
              value={profile.website.replace(/^https?:\/\//, '')}
              href={profile.website}
            />
          )}

          {/* Social Links */}
          {profile.github_url && (
            <ContactRow
              icon={Github}
              label="GitHub"
              value={profile.github_url.replace(/^https?:\/\/(www\.)?github\.com\//, '@')}
              href={profile.github_url}
            />
          )}

          {profile.twitter_url && (
            <ContactRow
              icon={Twitter}
              label="Twitter"
              value={profile.twitter_url.replace(/^https?:\/\/(www\.)?(twitter\.com|x\.com)\//, '@')}
              href={profile.twitter_url}
            />
          )}

          {profile.linkedin_url && (
            <ContactRow
              icon={Linkedin}
              label="LinkedIn"
              value={profile.linkedin_url.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, '')}
              href={profile.linkedin_url}
            />
          )}

          {!profile.contact_email && !profile.contact_phone && !profile.website && 
           !profile.github_url && !profile.twitter_url && !profile.linkedin_url && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No contact info added yet
            </p>
          )}
        </div>

        {isOwnProfile && (
          <p className="text-[11px] text-muted-foreground text-center pt-3 border-t">
            Manage what to show publicly in Edit Profile
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ContactRow({ icon: Icon, label, value, href, onCopy }: any) {
  const content = (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group">
      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
          {label}
        </p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
      {onCopy && (
        <button
          onClick={(e) => {
            e.preventDefault()
            onCopy()
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-background rounded"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )

  if (href) {
    return (
      <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">
        {content}
      </a>
    )
  }
  return content
}