'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { BookmarkSimple, Users, Article, MagnifyingGlass, Check, Heart, ChatCircle, X } from '@phosphor-icons/react'
import { formatDistanceToNow } from 'date-fns'
import { DsrtSection, DsrtInput, DsrtTabs, DsrtEmpty, DsrtAvatar, DsrtCard, DsrtGrid, DsrtCardSkeleton, DsrtRowSkeleton } from '@/components/dsrt'

export function SavedPage({ currentUser }: any) {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'communities' | 'posts'>('communities')
  const [communities, setCommunities] = useState<any[]>([])
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/saved')
    const data = await res.json()
    setCommunities(data.communities || [])
    setPosts(data.posts || [])
    setLoading(false)
  }

  const removeSavedCommunity = async (id: string) => {
    setCommunities(prev => prev.filter(c => c.id !== id))
    await fetch(`/api/discover/save?community_id=${id}`, { method: 'DELETE' })
    toast.success('Removed from saved')
  }

  const removeSavedPost = async (id: string) => {
    setPosts(prev => prev.filter(p => p.id !== id))
    await supabase.from('post_bookmarks').delete().eq('post_id', id).eq('user_id', currentUser.id)
    toast.success('Removed from saved')
  }

  const filteredCommunities = search
    ? communities.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()))
    : communities

  const filteredPosts = search
    ? posts.filter(p => (p.title || p.content)?.toLowerCase().includes(search.toLowerCase()))
    : posts

  return (
    <div className="space-y-6">
      <DsrtSection
        title="Saved Items"
        description="Your bookmarked communities and posts across DSRT."
        actions={
          <div className="w-full sm:w-64">
            <DsrtInput
              placeholder="Search saved..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<MagnifyingGlass size={16} />}
              sizeVariant="sm"
            />
          </div>
        }
      />

      <DsrtTabs
        variant="segmented"
        activeValue={activeTab}
        onValueChange={(val) => setActiveTab(val as any)}
        tabs={[
          { value: 'communities', label: 'Communities', badge: communities.length },
          { value: 'posts', label: 'Posts', badge: posts.length },
        ]}
      />

      {loading ? (
        activeTab === 'communities' ? <DsrtCardSkeleton count={3} /> : <DsrtRowSkeleton count={4} />
      ) : activeTab === 'communities' ? (
        filteredCommunities.length === 0 ? (
          <DsrtEmpty icon={Users} title="No saved communities" description="Communities you bookmark will appear here." />
        ) : (
          <DsrtGrid cols={{ base: 1, md: 2, lg: 3 }}>
            {filteredCommunities.map((c, i) => (
              <SavedCommunityCard key={c.id} community={c} index={i} onRemove={() => removeSavedCommunity(c.id)} />
            ))}
          </DsrtGrid>
        )
      ) : (
        filteredPosts.length === 0 ? (
          <DsrtEmpty icon={Article} title="No saved posts" description="Posts you bookmark from your feed will appear here." />
        ) : (
          <div className="space-y-3">
            {filteredPosts.map((p, i) => (
              <SavedPostCard key={p.id} post={p} index={i} onRemove={() => removeSavedPost(p.id)} />
            ))}
          </div>
        )
      )}
    </div>
  )
}

function SavedCommunityCard({ community, index, onRemove }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
      <DsrtCard padding="none" className="group overflow-hidden relative">
        <div
          className="h-24 bg-gradient-to-br from-[#1e3a5f] to-[#0a0a0f] border-b border-white/[0.04]"
          style={community.cover_url ? { backgroundImage: `url(${community.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
        />
        <button
          onClick={(e) => { e.preventDefault(); onRemove() }}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/80 backdrop-blur-sm"
          title="Remove from saved"
        >
          <X className="w-4 h-4 text-white" weight="bold" />
        </button>
        <div className="p-4 -mt-10 relative">
          <Link href={`/community/${community.slug}`} className="block w-14 h-14 rounded-xl bg-[#05070D] border border-white/[0.12] p-1 shadow-xl mb-3">
            <div className="w-full h-full bg-white/[0.04] rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-white/70" weight="fill" />
            </div>
          </Link>
          <div className="flex items-center gap-1.5">
            <Link href={`/community/${community.slug}`} className="text-[15px] font-semibold tracking-tight text-white truncate hover:underline">
              {community.name}
            </Link>
            {community.is_verified && <Check className="w-3.5 h-3.5 text-blue-400" weight="bold" />}
          </div>
          <p className="text-[12px] text-white/50 line-clamp-2 mt-1 leading-relaxed">{community.description}</p>
          <div className="flex items-center justify-between mt-4 border-t border-white/[0.04] pt-3">
            <p className="text-[11px] font-mono uppercase tracking-wider text-white/40">
              {community.member_count?.toLocaleString() || 0} Members
            </p>
          </div>
        </div>
      </DsrtCard>
    </motion.div>
  )
}

function SavedPostCard({ post, index, onRemove }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
      <DsrtCard padding="md" className="group relative">
        <div className="flex items-start gap-4">
          <Link href={`/profile/${post.users?.username}`} className="shrink-0">
            <DsrtAvatar src={post.users?.avatar_url} name={post.users?.full_name} size="md" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[13px] font-semibold text-white">{post.users?.full_name}</span>
              <span className="text-white/30 text-[11px]">· {formatDistanceToNow(new Date(post.created_at), { addSuffix: false })} ago</span>
            </div>
            <Link href={`/posts/${post.id}`} className="block group/link">
              {post.title && <p className="text-[14px] font-semibold text-white mb-1 group-hover/link:underline">{post.title}</p>}
              <p className="text-[13px] text-white/70 line-clamp-2 leading-relaxed">{post.content}</p>
            </Link>
            <div className="flex items-center gap-4 mt-3">
              <span className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-white/40">
                <Heart size={14} weight="fill" className="text-pink-400/70" /> {post.like_count || 0}
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-white/40">
                <ChatCircle size={14} weight="fill" className="text-blue-400/70" /> {post.comment_count || 0}
              </span>
            </div>
          </div>
          <button
            onClick={onRemove}
            className="shrink-0 p-2 -mr-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all text-white/40 hover:text-white hover:bg-white/[0.08]"
            title="Remove from saved"
          >
            <BookmarkSimple size={18} weight="fill" className="text-amber-400" />
          </button>
        </div>
      </DsrtCard>
    </motion.div>
  )
}