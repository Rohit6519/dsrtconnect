'use client'

import { AboutMeSection } from '../AboutMeSection'
import { FeaturedWorkSection } from '../FeaturedWorkSection'
import { SkillsSection } from '../SkillsSection'

interface OverviewTabProps {
  profile: any
  isOwner: boolean
  currentUserId: string | null
  onProfileUpdate: (updates: Partial<any>) => void
}

export function OverviewTab({
  profile,
  isOwner,
  currentUserId,
  onProfileUpdate,
}: OverviewTabProps) {
  return (
    <div className="space-y-4">
      {/* About Me */}
      <AboutMeSection
        aboutHtml={profile.about_me_html}
        bio={profile.bio}
        isOwner={isOwner}
        onUpdate={(html, plain) =>
          onProfileUpdate({ about_me_html: html, bio: plain })
        }
      />

      {/* Featured Work */}
      <FeaturedWorkSection
        userId={profile.id}
        isOwner={isOwner}
      />

      {/* Skills (with description + certificate per skill) */}
      <SkillsSection
        userId={profile.id}
        isOwner={isOwner}
      />
    </div>
  )
}