'use client'

import { useState, Suspense } from 'react'
import { BannerSection } from './left-panel/BannerSection'
import { LeftPanel } from './left-panel/LeftPanel'
import { RightPanel } from './right-panel/RightPanel'
import { DsrtPage, DsrtSkeleton } from '@/components/dsrt'

interface ProfileV3PageProps {
  profile: any
  isOwner: boolean
  currentUserId: string | null
  followerCount: number
  followingCount: number
  isFollowing: boolean
}

export function ProfileV3Page(props: ProfileV3PageProps) {
  const [profile, setProfile] = useState(props.profile)
  const [followerCount, setFollowerCount] = useState(props.followerCount)
  const [followingCount, setFollowingCount] = useState(props.followingCount)
  const [isFollowing, setIsFollowing] = useState(props.isFollowing)

  const handleProfileUpdate = (updates: Partial<any>) => {
    setProfile((p: any) => ({ ...p, ...updates }))
  }

  const handleFollowChange = (following: boolean, followers: number, followingC: number) => {
    setIsFollowing(following)
    setFollowerCount(followers)
    setFollowingCount(followingC)
  }

  return (
    <DsrtPage width="wide" padding="none" className="pt-4 pb-12">
      <div className="px-3 sm:px-4 md:px-6">
        {/* Contained Banner — Rounded and integrated with the shell */}
        <div className="rounded-2xl overflow-hidden border border-white/[0.08] shadow-lg">
          <BannerSection
            bannerUrl={profile.cover_url || profile.banner_url}
            isOwner={props.isOwner}
            onBannerChange={(url) => handleProfileUpdate({ cover_url: url })}
          />
        </div>

        {/* Main Grid: Stacks on mobile, side-by-side on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)] gap-4 lg:gap-6 mt-4">
          <aside className="w-full min-w-0">
            <LeftPanel
              profile={profile}
              isOwner={props.isOwner}
              currentUserId={props.currentUserId}
              followerCount={followerCount}
              followingCount={followingCount}
              isFollowing={isFollowing}
              onProfileUpdate={handleProfileUpdate}
              onFollowChange={handleFollowChange}
            />
          </aside>

          <main className="w-full min-w-0">
            <Suspense fallback={<RightPanelSkeleton />}>
              <RightPanel
                profile={profile}
                isOwner={props.isOwner}
                currentUserId={props.currentUserId}
                onProfileUpdate={handleProfileUpdate}
              />
            </Suspense>
          </main>
        </div>
      </div>
    </DsrtPage>
  )
}

function RightPanelSkeleton() {
  return (
    <div className="space-y-4">
      <DsrtSkeleton className="h-12 w-full" />
      <DsrtSkeleton className="h-64 w-full rounded-2xl" />
    </div>
  )
}