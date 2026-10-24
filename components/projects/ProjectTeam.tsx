'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserPlus, MoreVertical, Shield, Crown } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export function ProjectTeam({ project, members, onlineUsers, isAdmin, currentUser }: any) {
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const supabase = createClient()

  const onlineIds = new Set(onlineUsers.map((u: any) => u.user_id))

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', inviteEmail.trim().toLowerCase())
      .single()

    const { error } = await supabase
      .from('project_invitations')
      .insert({
        project_id: project.id,
        invited_email: inviteEmail.trim().toLowerCase(),
        invited_user_id: existingUser?.id || null,
        invited_by: currentUser.id,
        role: 'member',
      })

    setInviting(false)

    if (error) {
      toast.error('Failed to send invite: ' + error.message)
    } else {
      toast.success(`Invitation sent to ${inviteEmail}`)
      setInviteEmail('')
      setShowInvite(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Team Members</h2>
          <p className="text-xs text-muted-foreground">
            {members.length} member{members.length !== 1 ? 's' : ''} · {onlineUsers.length} online now
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowInvite(!showInvite)}>
            <UserPlus className="w-4 h-4 mr-1" />
            Invite
          </Button>
        )}
      </div>

      {showInvite && (
        <div className="bg-card border rounded-xl p-4 flex gap-2">
          <Input
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="colleague@company.com"
            onKeyDown={e => e.key === 'Enter' && handleInvite()}
          />
          <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
            {inviting ? 'Sending...' : 'Send Invite'}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {members.map((member: any) => {
          const isOnline = onlineIds.has(member.user_id)
          const isOwner = member.role === 'owner'
          const isMemberAdmin = member.permissions?.admin

          return (
            <div key={member.user_id} className="bg-card border rounded-xl p-4 flex items-center gap-3">
              <div className="relative">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={member.users?.avatar_url} />
                  <AvatarFallback>
                    {member.users?.full_name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isOnline && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full animate-pulse" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-sm truncate">{member.users?.full_name}</p>
                  {isOwner && <Crown className="w-3 h-3 text-yellow-500" />}
                  {isMemberAdmin && !isOwner && <Shield className="w-3 h-3 text-blue-500" />}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  @{member.users?.username} · {member.role}
                </p>
              </div>
              {isOnline ? (
                <span className="text-[10px] text-green-500 font-medium">Online</span>
              ) : (
                <span className="text-[10px] text-muted-foreground">Offline</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}