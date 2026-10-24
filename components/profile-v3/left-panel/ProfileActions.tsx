'use client'

import { ConnectButton } from '@/components/shared/ConnectButton'
import { FollowButton } from '@/components/shared/FollowButton'

interface Props {
  userId: string
  username: string
  fullName: string
  isOwner: boolean
}

export function ProfileActions({ userId, username, fullName, isOwner }: Props) {
  if (isOwner) {
    return (
      <div className="w-full">
        <button 
          onClick={() => window.location.href = '/settings'}
          className="w-full h-9 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[13px] font-semibold text-white transition-colors"
        >
          Edit Profile
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1">
        <FollowButton 
          userId={userId} 
          username={username}
          className="w-full h-9 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[13px] font-semibold text-white transition-colors"
        />
      </div>
      
      <ConnectButton
        entityType="user"
        entityId={userId}
        entityName={fullName || username}
        entitySlug={username}
        sourceType="connect"
        variant="primary"
        label="Connect"
        icon={true}
        className="flex-1"
      />
    </div>
  )
}