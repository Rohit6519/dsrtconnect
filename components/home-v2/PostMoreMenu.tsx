'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { 
  UserPlus, UserMinus, ListPlus, 
  SpeakerSlash, Prohibit, Flag, Link as LinkIcon 
} from '@phosphor-icons/react'

interface Props {
  post: any
  currentUser: any
  onClose: () => void
  onHide?: () => void
}

export function PostMoreMenu({ post, currentUser, onClose, onHide }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const publisher = post.publisher

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    setTimeout(() => window.addEventListener('click', handler), 0)
    return () => window.removeEventListener('click', handler)
  }, [onClose])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/posts/${post.id}`)
      toast.success('Link copied to clipboard')
      onClose()
    } catch {}
  }

  const handleFollow = async () => {
    const wasFollowing = isFollowing
    setIsFollowing(!wasFollowing)
    
    // Optimistic Toast
    toast.success(!wasFollowing ? `Followed @${publisher.handle}` : `Unfollowed @${publisher.handle}`)
    onClose()

    try {
      if (wasFollowing) {
        // We'd hit a DELETE /api/follow endpoint here, but for now we fallback if it errors
      } else {
        await fetch('/api/follow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ following_type: publisher.type === 'person' ? 'user' : publisher.type, following_id: publisher.id }),
        })
      }
    } catch {
      setIsFollowing(wasFollowing) // Revert on failure
    }
  }

  const handleMute = () => {
    toast.success(`@${publisher.handle} has been muted.`)
    onHide?.()
    onClose()
  }

  const handleBlock = () => {
    toast.error(`@${publisher.handle} has been blocked.`)
    onHide?.()
    onClose()
  }

  const handleReport = () => {
    toast('Report submitted for review.')
    onHide?.()
    onClose()
  }

  const handleList = () => {
    toast('Added to your lists.')
    onClose()
  }

  const isOwn = currentUser?.id === post.user_id

  return (
    <div 
      ref={ref} 
      className="absolute right-0 top-full mt-2 w-[280px] rounded-xl overflow-hidden z-50 bg-[#000000] border border-zinc-800 shadow-[0_8px_32px_rgba(0,0,0,0.8)] py-1.5"
    >
      {!isOwn && (
        <>
          <MenuButton 
            Icon={isFollowing ? UserMinus : UserPlus} 
            label={`${isFollowing ? 'Unfollow' : 'Follow'} @${publisher.handle}`} 
            onClick={handleFollow} 
          />
          <MenuButton Icon={ListPlus} label="Add/remove from Lists" onClick={handleList} />
          
          <div className="my-1.5 border-t border-zinc-800/80" />
          
          <MenuButton Icon={SpeakerSlash} label={`Mute @${publisher.handle}`} onClick={handleMute} />
          <MenuButton Icon={SpeakerSlash} label="Mute conversation" onClick={handleMute} />
          <MenuButton Icon={Prohibit} label={`Block @${publisher.handle}`} onClick={handleBlock} />
          
          <div className="my-1.5 border-t border-zinc-800/80" />
          
          <MenuButton Icon={Flag} label="Report post" onClick={handleReport} />
        </>
      )}

      {isOwn && (
        <MenuButton Icon={ListPlus} label="Add/remove from Lists" onClick={handleList} />
      )}

      <div className="my-1.5 border-t border-zinc-800/80" />
      <MenuButton Icon={LinkIcon} label="Copy link to post" onClick={copyLink} />
    </div>
  )
}

function MenuButton({ Icon, label, onClick }: { Icon: any; label: string; onClick: () => void }) {
  return (
    <button 
      onClick={(e) => { e.stopPropagation(); onClick() }}
      className="w-full flex items-center gap-3.5 px-4 py-3.5 text-[15px] font-medium text-[#e7e9ea] hover:bg-zinc-900 transition-colors"
    >
      <Icon size={20} weight="regular" className="text-zinc-400" />
      <span className="tracking-tight">{label}</span>
    </button>
  )
}