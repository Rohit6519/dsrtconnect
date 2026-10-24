'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { Check, X, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

const colorMap: Record<string, string> = {
  blue: 'from-blue-500 to-blue-600',
  purple: 'from-purple-500 to-purple-600',
  green: 'from-green-500 to-emerald-600',
  orange: 'from-orange-500 to-red-500',
  pink: 'from-pink-500 to-rose-500',
}

export function InvitationAccept({ invitation, currentUser }: any) {
  const router = useRouter()
  const supabase = createClient()
  const [processing, setProcessing] = useState(false)

  const isExpired = new Date(invitation.expires_at) < new Date()
  const isAlreadyAccepted = invitation.status === 'accepted'
  const isDeclined = invitation.status === 'declined'
  const project = invitation.projects
  const inviter = invitation.inviter

  // Not logged in
  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto p-6 pt-20">
        <div className="bg-card border rounded-2xl p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 mx-auto text-orange-500" />
          <h1 className="text-xl font-bold">Please Log In</h1>
          <p className="text-sm text-muted-foreground">
            You need to be logged in to accept this invitation.
          </p>
          <Button onClick={() => router.push(`/login?redirect=/invitations/${invitation.token}`)}>
            Log In
          </Button>
        </div>
      </div>
    )
  }

  // Wrong user
  if (invitation.invited_email !== currentUser.email && invitation.invited_user_id !== currentUser.id) {
    return (
      <div className="max-w-md mx-auto p-6 pt-20">
        <div className="bg-card border rounded-2xl p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 mx-auto text-red-500" />
          <h1 className="text-xl font-bold">Wrong Account</h1>
          <p className="text-sm text-muted-foreground">
            This invitation is for {invitation.invited_email}.
            You are logged in as {currentUser.email}.
          </p>
        </div>
      </div>
    )
  }

  const handleAccept = async () => {
    setProcessing(true)

    // Update invitation status
    const { error: inviteError } = await supabase
      .from('project_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        invited_user_id: currentUser.id,
      })
      .eq('token', invitation.token)

    if (inviteError) {
      toast.error('Failed to accept invitation')
      setProcessing(false)
      return
    }

    // Add to project_roles
    const { error: roleError } = await supabase
      .from('project_roles')
      .insert({
        project_id: project.id,
        user_id: currentUser.id,
        role: invitation.role,
        permissions: invitation.role === 'admin'
          ? { view: true, edit: true, admin: true, delete: false }
          : { view: true, edit: true, admin: false, delete: false },
        invited_by: invitation.invited_by,
      })

    if (roleError && !roleError.message.includes('duplicate')) {
      toast.error('Failed to join project')
      setProcessing(false)
      return
    }

    toast.success(`Welcome to ${project.name}`)
    router.push(`/projects/${project.slug}`)
  }

  const handleDecline = async () => {
    setProcessing(true)

    await supabase
      .from('project_invitations')
      .update({ status: 'declined' })
      .eq('token', invitation.token)

    toast.info('Invitation declined')
    router.push('/')
  }

  return (
    <div className="max-w-md mx-auto p-6 pt-16">
      <div className="bg-card border rounded-2xl p-8 space-y-6">
        {/* Status states */}
        {isExpired && (
          <div className="text-center space-y-2">
            <Clock className="w-10 h-10 mx-auto text-orange-500" />
            <h2 className="font-bold">Invitation Expired</h2>
            <p className="text-sm text-muted-foreground">
              This invitation expired {formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true })}
            </p>
          </div>
        )}

        {isAlreadyAccepted && !isExpired && (
          <div className="text-center space-y-2">
            <Check className="w-10 h-10 mx-auto text-green-500" />
            <h2 className="font-bold">Already Accepted</h2>
            <Button onClick={() => router.push(`/projects/${project.slug}`)}>
              Go to Project
            </Button>
          </div>
        )}

        {isDeclined && !isExpired && (
          <div className="text-center space-y-2">
            <X className="w-10 h-10 mx-auto text-red-500" />
            <h2 className="font-bold">Invitation Declined</h2>
          </div>
        )}

        {!isExpired && !isAlreadyAccepted && !isDeclined && (
          <>
            <div className="text-center space-y-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
                You've been invited
              </p>
              
              <div className={cn(
                'w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br flex items-center justify-center text-white text-3xl font-bold shadow-lg',
                colorMap[project.color] || colorMap.blue
              )}>
                {project.icon}
              </div>

              <div>
                <h1 className="text-xl font-bold">{project.name}</h1>
                <p className="text-xs text-muted-foreground">{project.sector}</p>
              </div>

              {project.description && (
                <p className="text-sm text-muted-foreground">
                  {project.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
              <Avatar className="w-8 h-8">
                <AvatarImage src={inviter?.avatar_url} />
                <AvatarFallback>
                  {inviter?.full_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">
                  {inviter?.full_name} invited you
                </p>
                <p className="text-[10px] text-muted-foreground">
                  As a {invitation.role} · Expires {formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true })}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleDecline}
                disabled={processing}
              >
                Decline
              </Button>
              <Button
                className="flex-1"
                onClick={handleAccept}
                disabled={processing}
              >
                {processing ? 'Joining...' : 'Accept'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}