'use client'

interface BioSectionProps {
  profile: any
  isOwnProfile: boolean
}

export function BioSection({ profile, isOwnProfile }: BioSectionProps) {
  if (!profile.bio && !isOwnProfile) return null

  return (
    <div className="bg-card border rounded-2xl p-6">
      <h2 className="text-lg font-bold mb-3">About</h2>
      {profile.bio ? (
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
          {profile.bio}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground italic">
          Click Edit Profile to add a bio.
        </p>
      )}
    </div>
  )
}