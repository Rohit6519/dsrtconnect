'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Radio, TrendingUp, Users, RefreshCw, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { FollowButton } from '@/components/follow/FollowButton'

interface NewsItem {
  id: string
  title: string
  source: string
  url: string
  published_at: string
  read_count: number
}

interface Suggestion {
  id: string
  full_name: string
  username: string
  avatar_url: string | null
  tagline: string | null
  brings: string[]
  follower_count: number
  score: number
  reason: string
}

export function BuilderFeed({ items }: { items: any[] }) {
  const [news, setNews] = useState<NewsItem[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchAll = async () => {
    setRefreshing(true)
    try {
      const [newsRes, suggestRes] = await Promise.all([
        fetch('/api/news/latest'),
        fetch('/api/suggestions/builders?limit=4'),
      ])
      
      const newsData = await newsRes.json()
      const suggestData = await suggestRes.json()
      
      if (newsData.news) setNews(newsData.news)
      if (suggestData.suggestions) setSuggestions(suggestData.suggestions)
    } catch (err) {
      console.error('Failed to fetch:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const handleFollowChange = (userId: string, following: boolean) => {
    if (following) {
      // Remove from suggestions after following
      setTimeout(() => {
        setSuggestions(prev => prev.filter(s => s.id !== userId))
      }, 800)
    }
  }

  return (
    <div className="p-4 space-y-4 sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
      {/* DSRT News */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Radio className="w-3.5 h-3.5 text-red-500" />
              <span className="absolute top-0.5 left-0.5 w-1 h-1 bg-red-500 rounded-full animate-ping" />
            </div>
            <p className="text-[10px] uppercase tracking-[0.15em] font-bold">
              DSRT News
            </p>
          </div>
          <button
            onClick={fetchAll}
            disabled={refreshing}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className={cn('w-3 h-3', refreshing && 'animate-spin')} />
          </button>
        </div>

        <div className="divide-y">
          {loading ? (
            [1, 2, 3, 4].map(i => (
              <div key={i} className="p-3 space-y-2 animate-pulse">
                <div className="h-3 bg-muted rounded w-3/4" />
                <div className="h-2 bg-muted rounded w-1/2" />
              </div>
            ))
          ) : news.length === 0 ? (
            <p className="p-4 text-xs text-muted-foreground text-center">
              No news yet
            </p>
          ) : (
            news.slice(0, 6).map((item, idx) => (
              <motion.a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * idx }}
                className="block p-3 hover:bg-muted/30 transition-colors group"
              >
                <p className="text-xs leading-snug font-medium group-hover:text-primary transition-colors">
                  {item.title}
                </p>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                  <span>{item.source}</span>
                  <span>·</span>
                  <span>{formatDistanceToNow(new Date(item.published_at), { addSuffix: true })}</span>
                </div>
              </motion.a>
            ))
          )}
        </div>
      </div>

      {/* Suggested Builders */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b">
          <Sparkles className="w-3.5 h-3.5 text-purple-500" />
          <p className="text-[10px] uppercase tracking-[0.15em] font-bold">
            Suggested Builders
          </p>
        </div>
        
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-9 h-9 bg-muted rounded-full" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-muted rounded w-2/3" />
                  <div className="h-2 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : suggestions.length === 0 ? (
          <div className="p-4 text-center">
            <Users className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">
              Complete your profile to see matches
            </p>
            <Link
              href="/settings/integrations"
              className="text-[10px] text-blue-500 hover:underline inline-block mt-1"
            >
              Connect profiles →
            </Link>
          </div>
        ) : (
          <div className="divide-y">
            {suggestions.map((suggestion, idx) => (
              <motion.div
                key={suggestion.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * idx }}
                className="p-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start gap-2.5">
                  <Link href={`/profile/${suggestion.username}`}>
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={suggestion.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {suggestion.full_name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link 
                      href={`/profile/${suggestion.username}`}
                      className="text-xs font-semibold hover:underline block truncate"
                    >
                      {suggestion.full_name}
                    </Link>
                    {suggestion.tagline && (
                      <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                        {suggestion.tagline}
                      </p>
                    )}
                    <p className="text-[9px] text-purple-500 font-medium mt-0.5">
                      {suggestion.reason}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex justify-end">
                  <FollowButton
                    targetId={suggestion.id}
                    size="sm"
                    showText={true}
                    onFollowChange={(f) => handleFollowChange(suggestion.id, f)}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        )}
        
        <Link
          href="/explore"
          className="block p-3 border-t text-center text-[10px] text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          Explore all builders →
        </Link>
      </div>

      {/* Trending Builds */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b">
          <TrendingUp className="w-3.5 h-3.5 text-orange-500" />
          <p className="text-[10px] uppercase tracking-[0.15em] font-bold">
            Trending Builds
          </p>
        </div>
        <div className="p-4 text-center">
          <p className="text-xs text-muted-foreground">
            Ship a project to get featured
          </p>
        </div>
      </div>
    </div>
  )
}