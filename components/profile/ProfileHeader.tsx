'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  MapPin,
  Link as LinkIcon,
  Github,
  Twitter,
  Linkedin,
  Camera,
  Edit3,
  MessageCircle,
  Mail,
  Phone,
  Users,
  UserCheck,
  FileText,
  Eye,
  MoreHorizontal,
  Share2,
  Flag,
  Award,
  Briefcase,
} from 'lucide-react'
import { EditProfileModal } from './EditProfileModal'
import { UploadImageModal } from './UploadImageModal'
import { ContactInfoModal } from './ContactInfoModal'
import { FollowButton } from '@/components/follow/FollowButton'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ProfileHeaderProps {
  profile: any
  isOwnProfile: boolean
}

export function ProfileHeader({ profile, isOwnProfile }: ProfileHeaderProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [coverOpen, setCoverOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(profile.follower_count || 0)
  const [followingCount] = useState(profile.following_count || 0)
  const [postCount] = useState(profile.post_count || 0)

  useEffect(() => {
    if (isOwnProfile) return

    const check = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_type', 'user')
        .eq('following_id', profile.id)
        .maybeSingle()

      setIsFollowing(!!data)

      await supabase.rpc('log_profile_view', {
        p_profile_id: profile.id,
        p_viewer_id: user.id,
      })
    }
    check()
  }, [profile.id, isOwnProfile])

  const handleFollowChange = (following: boolean) => {
    setIsFollowing(following)
    setFollowerCount((prev: number) => following ? prev + 1 : Math.max(0, prev - 1))
  }

  const handleMessage = async () => {
    const supabase = createClient()
    try {
      const res = await fetch('/api/messages/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otherUserId: profile.id }),
      })
      const data = await res.json()
      if (data.conversationId) {
        router.push(`/messages/${data.conversationId}`)
      }
    } catch (err) {
      toast.error('Failed to start conversation')
    }
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/profile/${profile.username}`
    await navigator.clipboard.writeText(url)
    toast.success('Profile link copied to clipboard')
  }

  return (
    <>
      {/* Cover Banner */}
      <div className="relative">
        <div className="relative h-48 md:h-72 lg:h-80 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 overflow-hidden group">
          {profile.cover_url ? (
            <img
              src={profile.cover_url}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-6xl text-white/10 font-bold tracking-wider">
                {profile.full_name?.[0]?.toUpperCase()}
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
          
          {isOwnProfile && (
            <button
              onClick={() => setCoverOpen(true)}
              className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm px-3 py-2 rounded-lg border shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-105 flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              <span className="text-xs font-medium">Edit Cover</span>
            </button>
          )}
        </div>

        {/* Profile Info Section */}
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="relative -mt-20 md:-mt-24 pb-4">
            <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-6">
              {/* Avatar */}
              <div className="relative inline-block group/avatar">
                <div className="relative">
                  <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-background bg-background shadow-2xl">
                    <AvatarImage src={profile.avatar_url} className="object-cover" />
                    <AvatarFallback className="text-4xl font-bold bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                      {profile.full_name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {profile.is_verified && (
                    <div className="absolute bottom-1 right-1 bg-blue-500 rounded-full p-1.5 border-2 border-background">
                      <UserCheck className="w-4 h-4 text-white" strokeWidth={3} />
                    </div>
                  )}
                </div>
                {isOwnProfile && (
                  <button
                    onClick={() => setAvatarOpen(true)}
                    className="absolute bottom-2 right-2 bg-primary text-primary-foreground p-2.5 rounded-full shadow-xl hover:scale-110 transition-transform"
                  >
                    <Camera className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                )}
              </div>

              {/* Actions */}
              <div className="flex-1 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div />
                <div className="flex gap-2">
                  {isOwnProfile ? (
                    <>
                      <Button variant="outline" size="sm" onClick={handleShare}>
                        <Share2 className="w-4 h-4 mr-1.5" />
                        Share
                      </Button>
                      <Button onClick={() => setEditOpen(true)}>
                        <Edit3 className="w-4 h-4 mr-1.5" />
                        Edit Profile
                      </Button>
                    </>
                  ) : (
                    <>
                      <FollowButton
                        targetId={profile.id}
                        initialFollowing={isFollowing}
                        onFollowChange={handleFollowChange}
                      />
                      <Button variant="outline" onClick={handleMessage}>
                        <MessageCircle className="w-4 h-4 mr-1.5" />
                        Message
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={handleShare}>
                            <Share2 className="w-3.5 h-3.5 mr-2" />
                            Share Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Flag className="w-3.5 h-3.5 mr-2" />
                            Report
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Name + Username */}
            <div className="mt-5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                  {profile.full_name}
                </h1>
                {profile.is_open_to_work && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-500 rounded-md text-[10px] font-bold uppercase tracking-wider border border-green-500/20">
                    <Briefcase className="w-3 h-3" />
                    Open to Work
                  </span>
                )}
                {profile.is_hiring && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded-md text-[10px] font-bold uppercase tracking-wider border border-blue-500/20">
                    <Users className="w-3 h-3" />
                    Hiring
                  </span>
                )}
              </div>

              <p className="text-muted-foreground">@{profile.username}</p>

              {/* Tagline */}
              {profile.tagline && (
                <p className="text-base md:text-lg mt-3 leading-relaxed">
                  {profile.tagline}
                </p>
              )}

              {/* Brings tags */}
              {profile.brings && profile.brings.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {profile.brings.map((b: string) => (
                    <span
                      key={b}
                      className="px-2.5 py-1 bg-primary/10 text-primary text-[11px] font-semibold rounded-full capitalize border border-primary/20"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              )}

              {/* Location + Website */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap mt-4">
                {profile.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {profile.location}
                  </span>
                )}
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-primary transition-colors"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
                {profile.github_url && (
                  <a
                    href={profile.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-primary transition-colors"
                  >
                    <Github className="w-3.5 h-3.5" />
                    GitHub
                  </a>
                )}
                {profile.twitter_url && (
                  <a
                    href={profile.twitter_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-primary transition-colors"
                  >
                    <Twitter className="w-3.5 h-3.5" />
                    Twitter
                  </a>
                )}
                {profile.linkedin_url && (
                  <a
                    href={profile.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-primary transition-colors"
                  >
                    <Linkedin className="w-3.5 h-3.5" />
                    LinkedIn
                  </a>
                )}
              </div>

              {/* Stats Row - Interactive Buttons */}
              <div className="flex items-center gap-1 mt-5 pt-5 border-t flex-wrap">
                <Link
                  href={`/profile/${profile.username}/followers`}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted transition-colors group"
                >
                  <Users className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
                  <span className="font-bold text-sm">{followerCount}</span>
                  <span className="text-xs text-muted-foreground">Followers</span>
                </Link>

                <Link
                  href={`/profile/${profile.username}/following`}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted transition-colors group"
                >
                  <UserCheck className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
                  <span className="font-bold text-sm">{followingCount}</span>
                  <span className="text-xs text-muted-foreground">Following</span>
                </Link>

                <button
                  onClick={() => setContactOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted transition-colors group"
                >
                  <Mail className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
                  <span className="font-medium text-xs">Contact info</span>
                </button>

                <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted/40">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-bold text-sm">{postCount}</span>
                  <span className="text-xs text-muted-foreground">Posts</span>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted/40">
                  <Award className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-bold text-sm">{profile.execution_score || 0}</span>
                  <span className="text-xs text-muted-foreground">Score</span>
                </div>

                {isOwnProfile && (
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted/40 ml-auto">
                    <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-bold text-sm">{profile.profile_views || 0}</span>
                    <span className="text-xs text-muted-foreground">Views</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <EditProfileModal
        open={editOpen}
        onOpenChange={setEditOpen}
        profile={profile}
      />

      <UploadImageModal
        open={avatarOpen}
        onOpenChange={setAvatarOpen}
        type="avatar"
        userId={profile.id}
        currentUrl={profile.avatar_url}
      />

      <UploadImageModal
        open={coverOpen}
        onOpenChange={setCoverOpen}
        type="cover"
        userId={profile.id}
        currentUrl={profile.cover_url}
      />

      <ContactInfoModal
        open={contactOpen}
        onOpenChange={setContactOpen}
        profile={profile}
        isOwnProfile={isOwnProfile}
      />
    </>
  )
}