'use client'

import { useState, useEffect } from 'react'
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
import { toast } from 'sonner'
import { MagnifyingGlass, UserPlus, Bell, Crown, X, Check } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface TeamMemberModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ventureId: string
  member?: any
  onSaved: (member: any, isEdit: boolean) => void
}

export function TeamMemberModal({ open, onOpenChange, ventureId, member, onSaved }: TeamMemberModalProps) {
  const supabase = createClient()
  const isEdit = !!member

  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [role, setRole] = useState(member?.role || '')
  const [isFounder, setIsFounder] = useState(member?.is_founder || false)
  const [canViewNotifications, setCanViewNotifications] = useState(member?.can_view_notifications || false)
  const [inviting, setInviting] = useState(false)
  const [searching, setSearching] = useState(false)

  // Debounced user search
  useEffect(() => {
    if (query.trim().length < 2) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase
        .from('users')
        .select('id, username, full_name, avatar_url, tagline')
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(8)

      setSearchResults(data || [])
      setSearching(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const handleInvite = async () => {
    if (!selectedUser) {
      toast.error('Please search and select a user')
      return
    }
    if (!role.trim()) {
      toast.error('Please specify their role')
      return
    }

    setInviting(true)

    const data = {
      venture_id: ventureId,
      user_id: selectedUser.id,
      name: selectedUser.full_name,
      role: role.trim(),
      avatar_url: selectedUser.avatar_url,
      is_founder: isFounder,
      can_view_notifications: canViewNotifications,
      joined_date: new Date().toISOString().split('T')[0],
      status: 'pending', // Will show as pending until accepted
    }

    let result
    if (isEdit) {
      result = await supabase
        .from('venture_team_members')
        .update(data)
        .eq('id', member.id)
        .select()
        .single()
    } else {
      result = await supabase
        .from('venture_team_members')
        .insert(data)
        .select()
        .single()
    }

    if (result.error) {
      toast.error('Failed: ' + result.error.message)
      setInviting(false)
      return
    }

    // Send notification to invited user
    try {
      const { data: venture } = await supabase
        .from('ventures')
        .select('name, slug')
        .eq('id', ventureId)
        .single()

      await supabase.rpc('create_notification', {
        p_user_id: selectedUser.id,
        p_type: 'venture_team_invite',
        p_title: `You've been invited to join ${venture?.name}`,
        p_message: `As a ${role}`,
        p_from_user_id: (await supabase.auth.getUser()).data.user?.id,
        p_entity_type: 'venture_team_invite',
        p_entity_id: result.data.id,
        p_action_url: `/ventures/${venture?.slug}`,
        p_icon: 'user',
        p_priority: 'high',
      })
    } catch (err) {
      console.error('Notification error:', err)
    }

    toast.success(`${selectedUser.full_name} has been invited`)
    onSaved(result.data, isEdit)
  }

  // If editing, load current user data
  useEffect(() => {
    if (isEdit && member?.user_id) {
      setSelectedUser({
        id: member.user_id,
        full_name: member.name,
        avatar_url: member.avatar_url,
        username: '',
      })
    }
  }, [isEdit, member])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Team Member' : 'Invite Team Member'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Search (only if adding new) */}
          {!isEdit && !selectedUser && (
            <div className="space-y-2">
              <Label>Search DSRT User</Label>
              <p className="text-xs text-muted-foreground">
                Find them by name or username. They'll receive an invitation notification.
              </p>
              <div className="relative">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" weight="duotone" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type name or username..."
                  className="pl-9"
                  autoFocus
                />
              </div>

              {searching && (
                <p className="text-xs text-muted-foreground text-center py-2">Searching...</p>
              )}

              {!searching && query.length >= 2 && searchResults.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">No users found</p>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-1 max-h-64 overflow-y-auto border rounded-lg p-1">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                    >
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.full_name} className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                          {user.full_name?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{user.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Selected user display */}
          {selectedUser && (
            <div className="p-3 border rounded-lg bg-primary/5 border-primary/30 flex items-center gap-3">
              {selectedUser.avatar_url ? (
                <img src={selectedUser.avatar_url} alt={selectedUser.full_name} className="w-11 h-11 rounded-full object-cover" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                  {selectedUser.full_name?.[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{selectedUser.full_name}</p>
                {selectedUser.username && (
                  <p className="text-xs text-muted-foreground truncate">@{selectedUser.username}</p>
                )}
              </div>
              {!isEdit && (
                <button
                  onClick={() => {
                    setSelectedUser(null)
                    setQuery('')
                  }}
                  className="p-1.5 hover:bg-muted rounded"
                >
                  <X className="w-4 h-4" weight="bold" />
                </button>
              )}
            </div>
          )}

          {/* Role */}
          {selectedUser && (
            <>
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Input
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Co-founder, CTO, Designer, etc."
                />
              </div>

              {/* Toggles */}
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/30">
                  <input
                    type="checkbox"
                    checked={isFounder}
                    onChange={(e) => setIsFounder(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <Crown className="w-4 h-4 text-yellow-500" weight="fill" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Founder / Co-Founder</p>
                    <p className="text-[10px] text-muted-foreground">
                      Shows a founder crown badge
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/30">
                  <input
                    type="checkbox"
                    checked={canViewNotifications}
                    onChange={(e) => setCanViewNotifications(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <Bell className="w-4 h-4 text-blue-500" weight="fill" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Can View Notifications</p>
                    <p className="text-[10px] text-muted-foreground">
                      Allow this member to see connection requests, follows, and messages
                    </p>
                  </div>
                </label>
              </div>

              {/* Info */}
              <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">Note:</span> This user will receive an invitation notification. 
                  Once they accept, they'll appear as an active team member on your venture page.
                </p>
              </div>
            </>
          )}

          <div className="flex gap-2 pt-3 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={inviting} className="flex-1">
              Cancel
            </Button>
            {selectedUser && (
              <Button onClick={handleInvite} disabled={inviting || !role.trim()} className="flex-1">
                {inviting ? 'Sending...' : (isEdit ? 'Update' : (
                  <>
                    <UserPlus className="w-4 h-4 mr-1" weight="bold" />
                    Send Invite
                  </>
                ))}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}