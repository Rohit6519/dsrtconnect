'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Edit3, Save, X, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface AboutSectionProps {
  profile: any
  isOwnProfile: boolean
}

export function AboutSection({ profile, isOwnProfile }: AboutSectionProps) {
  const router = useRouter()
  const supabase = createClient()
  const [editing, setEditing] = useState(false)
  const [bio, setBio] = useState(profile.bio || '')
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const handleSave = async () => {
    if (bio.length > 2000) {
      toast.error('Bio must be under 2000 characters')
      return
    }

    setSaving(true)
    const { error } = await supabase
      .from('users')
      .update({ bio: bio.trim() || null, updated_at: new Date().toISOString() })
      .eq('id', profile.id)

    setSaving(false)

    if (error) {
      toast.error('Failed to save')
    } else {
      toast.success('About updated')
      setEditing(false)
      router.refresh()
    }
  }

  const handleCancel = () => {
    setBio(profile.bio || '')
    setEditing(false)
  }

  const displayBio = profile.bio
  const shouldTruncate = displayBio && displayBio.length > 400
  const truncatedBio = shouldTruncate && !expanded 
    ? displayBio.slice(0, 400) + '...' 
    : displayBio

  if (!displayBio && !isOwnProfile) return null

  return (
    <div className="bg-card border rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <FileText className="w-4 h-4 text-blue-500" strokeWidth={2.5} />
          </div>
          <h2 className="text-lg font-bold">About</h2>
        </div>
        
        {isOwnProfile && !editing && (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            <Edit3 className="w-3.5 h-3.5 mr-1.5" />
            Edit
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {editing ? (
          <motion.div
            key="edit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Write about yourself, your journey, what you're building, what you care about, what you want to be known for. Share your story."
              rows={10}
              maxLength={2000}
              className="resize-none text-sm leading-relaxed"
              autoFocus
            />
            <div className="flex items-center justify-between">
              <p className={`text-xs ${bio.length > 1900 ? 'text-orange-500 font-semibold' : 'text-muted-foreground'}`}>
                {bio.length} / 2000 characters
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCancel}
                  disabled={saving}
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Save className="w-3.5 h-3.5 mr-1" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {displayBio ? (
              <>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                  {truncatedBio}
                </p>
                {shouldTruncate && (
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="mt-2 text-sm text-blue-500 hover:text-blue-400 font-medium"
                  >
                    {expanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </>
            ) : (
              <div className="text-center py-8 space-y-2">
                <FileText className="w-8 h-8 mx-auto text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground italic">
                  Tell the world about yourself
                </p>
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs text-blue-500 hover:underline font-medium"
                >
                  Add your story →
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}