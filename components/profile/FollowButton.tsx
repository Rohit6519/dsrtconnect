'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { UserPlus, UserCheck } from 'lucide-react'

interface FollowButtonProps {
  profileId: string
}

export function FollowButton({ profileId }: FollowButtonProps) {
  const router = useRouter()
  const supabase = createClient()
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const check = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }
      setCurrentUserId(user.id)

      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_type', 'user')
        .eq('following_id', profileId)
        .maybeSingle()

      setFollowing(!!data)
      setLoading(false)
    }
    check()
  }, [profileId])

  const toggle = async () => {
    if (!currentUserId) return
    setLoading(true)

    if (following) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_type', 'user')
        .eq('following_id', profileId)
      setFollowing(false)
    } else {
      await supabase.from('follows').insert({
        follower_id: currentUserId,
        following_type: 'user',
        following_id: profileId,
      })
      setFollowing(true)
    }

    setLoading(false)
    router.refresh()
  }

  return (
    <Button
      onClick={toggle}
      disabled={loading}
      variant={following ? 'outline' : 'default'}
    >
      {following ? (
        <>
          <UserCheck className="w-4 h-4 mr-2" />
          Following
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4 mr-2" />
          Follow
        </>
      )}
    </Button>
  )
}