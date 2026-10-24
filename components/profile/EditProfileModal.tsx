'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Briefcase, Users } from 'lucide-react'

interface EditProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: any
}

export function EditProfileModal({ open, onOpenChange, profile }: EditProfileModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const [fullName, setFullName] = useState(profile.full_name || '')
  const [tagline, setTagline] = useState(profile.tagline || '')
  const [bio, setBio] = useState(profile.bio || '')
  const [location, setLocation] = useState(profile.location || '')
  const [website, setWebsite] = useState(profile.website || '')
  const [github, setGithub] = useState(profile.github_url || '')
  const [twitter, setTwitter] = useState(profile.twitter_url || '')
  const [linkedin, setLinkedin] = useState(profile.linkedin_url || '')
  const [contactEmail, setContactEmail] = useState(profile.contact_email || '')
  const [contactPhone, setContactPhone] = useState(profile.contact_phone || '')
  const [showContact, setShowContact] = useState(profile.show_contact ?? false)
  const [openToWork, setOpenToWork] = useState(profile.is_open_to_work ?? false)
  const [hiring, setHiring] = useState(profile.is_hiring ?? false)

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error('Name is required')
      return
    }

    setLoading(true)

    const { error } = await supabase
      .from('users')
      .update({
        full_name: fullName.trim(),
        tagline: tagline.trim() || null,
        bio: bio.trim() || null,
        location: location.trim() || null,
        website: website.trim() || null,
        github_url: github.trim() || null,
        twitter_url: twitter.trim() || null,
        linkedin_url: linkedin.trim() || null,
        contact_email: contactEmail.trim() || null,
        contact_phone: contactPhone.trim() || null,
        show_contact: showContact,
        is_open_to_work: openToWork,
        is_hiring: hiring,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)

    setLoading(false)

    if (error) {
      toast.error('Failed to update profile: ' + error.message)
    } else {
      toast.success('Profile updated')
      router.refresh()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Basic Info */}
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Basic Info</p>
            
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="One line about you"
                maxLength={120}
              />
              <p className="text-[10px] text-muted-foreground text-right">
                {tagline.length}/120
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, Country"
              />
            </div>
          </div>

          {/* Status Toggles */}
          <div className="space-y-3 pt-3 border-t">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</p>
            
            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/30">
              <input
                type="checkbox"
                checked={openToWork}
                onChange={(e) => setOpenToWork(e.target.checked)}
                className="w-4 h-4"
              />
              <Briefcase className="w-4 h-4 text-green-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">Open to Work</p>
                <p className="text-xs text-muted-foreground">Show that you are looking for opportunities</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/30">
              <input
                type="checkbox"
                checked={hiring}
                onChange={(e) => setHiring(e.target.checked)}
                className="w-4 h-4"
              />
              <Users className="w-4 h-4 text-blue-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">Hiring</p>
                <p className="text-xs text-muted-foreground">Show that you are looking to hire people</p>
              </div>
            </label>
          </div>

          {/* Contact Info */}
          <div className="space-y-4 pt-3 border-t">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contact Info</p>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={showContact}
                  onChange={(e) => setShowContact(e.target.checked)}
                  className="w-3.5 h-3.5"
                />
                Show publicly
              </label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input
                id="contact_email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contact@yourdomain.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_phone">Phone Number</Label>
              <Input
                id="contact_phone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourwebsite.com"
              />
            </div>
          </div>

          {/* Social Links */}
          <div className="space-y-4 pt-3 border-t">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Social Links</p>
            
            <div className="space-y-2">
              <Label htmlFor="github">GitHub</Label>
              <Input
                id="github"
                value={github}
                onChange={(e) => setGithub(e.target.value)}
                placeholder="https://github.com/username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="twitter">Twitter / X</Label>
              <Input
                id="twitter"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                placeholder="https://twitter.com/username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn</Label>
              <Input
                id="linkedin"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/username"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || !fullName.trim()}
              className="flex-1"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}