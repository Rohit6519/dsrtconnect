'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare, MessageCircle, Bell, FileText, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PostCard } from '@/components/shared/PostCard'
import { motion, AnimatePresence } from 'framer-motion'

const tabs = [
  { id: 'posts', label: 'Posts', icon: MessageSquare },
  { id: 'replies', label: 'Replies', icon: MessageCircle },
  { id: 'updates', label: 'Updates', icon: Bell },
  { id: 'docs', label: 'Docs', icon: FileText },
]

interface ProfileTabsProps {
  userId: string
  isOwnProfile: boolean
  currentUser: any
}

export function ProfileTabs({ userId, isOwnProfile, currentUser }: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState('posts')
  const [content, setContent] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      
      if (activeTab === 'posts') {
        const { data } = await supabase
          .from('posts')
          .select(`*, users:user_id (id, full_name, username, avatar_url, tagline, brings)`)
          .eq('user_id', userId)
          .eq('visibility', 'global')
          .order('created_at', { ascending: false })
          .limit(20)

        // Check likes/bookmarks
        const postIds = data?.map(p => p.id) || []
        const [{ data: likes }, { data: bookmarks }] = await Promise.all([
          supabase.from('post_likes').select('post_id').eq('user_id', currentUser.id).in('post_id', postIds),
          supabase.from('post_bookmarks').select('post_id').eq('user_id', currentUser.id).in('post_id', postIds),
        ])

        const likedSet = new Set(likes?.map(l => l.post_id) || [])
        const bookmarkedSet = new Set(bookmarks?.map(b => b.post_id) || [])

        setContent((data || []).map(p => ({
          ...p,
          is_liked: likedSet.has(p.id),
          is_bookmarked: bookmarkedSet.has(p.id),
        })))
      } else if (activeTab === 'replies') {
        const { data } = await supabase
          .from('post_comments')
          .select(`*, posts (id, content, user_id, users:user_id (full_name, username, avatar_url))`)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20)
        setContent(data || [])
      } else if (activeTab === 'updates') {
        const { data } = await supabase
          .from('activity_events')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20)
        setContent(data || [])
      } else if (activeTab === 'docs') {
        setContent([])
      }
      
      setLoading(false)
    }
    
    load()
  }, [activeTab, userId])

  const handleUpdatePost = (updated: any) => {
    setContent(content.map(p => p.id === updated.id ? { ...p, ...updated } : p))
  }

  const handleDeletePost = (id: string) => {
    setContent(content.filter(p => p.id !== id))
  }

  return (
    <div className="bg-card border rounded-2xl overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap',
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="min-h-[200px]">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" />
          </div>
        ) : content.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              No {activeTab} yet
            </p>
            {activeTab === 'docs' && (
              <p className="text-xs text-muted-foreground/70">
                Docs feature coming soon
              </p>
            )}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-4 space-y-3"
            >
              {activeTab === 'posts' && content.map((post: any) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUser={currentUser}
                  onUpdate={handleUpdatePost}
                  onDelete={handleDeletePost}
                />
              ))}

              {activeTab === 'replies' && content.map((reply: any) => (
                <div key={reply.id} className="p-4 border rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">
                    Replied to @{reply.posts?.users?.username}
                  </p>
                  <p className="text-sm">{reply.content}</p>
                </div>
              ))}

              {activeTab === 'updates' && content.map((event: any) => (
                <div key={event.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <Bell className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{event.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(event.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}