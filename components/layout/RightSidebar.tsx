'use client'

import Link from 'next/link'
import {
  Bell,
  TrendingUp,
  Sparkles,
  Users,
  ChevronDown,
  Hash,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface RightSidebarProps {
  user: any
}

export function RightSidebar({ user }: RightSidebarProps) {
  const [pulseItems, setPulseItems] = useState<any[]>([])
  const [unreadNotifs, setUnreadNotifs] = useState(0)
  const [showAllNews, setShowAllNews] = useState(false)
  const [suggestedBuilders, setSuggestedBuilders] = useState<any[]>([])
  const [trendingBuilds, setTrendingBuilds] = useState<any[]>([])
  const [trendingTags, setTrendingTags] = useState<any[]>([])

  useEffect(() => {
    const supabase = createClient()

    const fetchData = async () => {
      const { data: pulse } = await supabase
        .from('editorial_posts')
        .select('id, headline, published_at, view_count')
        .order('published_at', { ascending: false })
        .limit(showAllNews ? 12 : 5)

      setPulseItems(pulse || [])

      const { count: notifs } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)

      setUnreadNotifs(notifs || 0)

      try {
        const trendRes = await fetch('/api/trending')
        const trendData = await trendRes.json()
        const combined = [
          ...(trendData.ventures || []).map((v: any) => ({
            ...v,
            type: 'venture',
            name: v.name,
            href: `/ventures/${v.slug}`,
          })),
          ...(trendData.projects || []).map((p: any) => ({
            ...p,
            type: 'project',
            name: p.title,
            href: `/projects/${p.slug}`,
          })),
        ]
        setTrendingBuilds(combined.slice(0, 3))
      } catch {}

      try {
        const res = await fetch('/api/matching/suggest?type=builders')
        const data = await res.json()
        setSuggestedBuilders((data.items || []).slice(0, 3))
      } catch {}

      try {
        const tagsRes = await fetch('/api/trending/tags')
        const tagsData = await tagsRes.json()
        setTrendingTags((tagsData.tags || []).slice(0, 8))
      } catch {}
    }

    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [user.id, showAllNews])

  return (
    <aside className="hidden lg:flex flex-col fixed right-0 top-14 bottom-0 w-72 overflow-y-auto border-l border-border">
      <div className="p-3 space-y-3">
        {/* Notifications */}
        <div className="skeu-card p-2">
          <Link
            href="/notifications"
            className="flex items-center justify-between gap-2 px-2 py-1.5 rounded hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-2">
              <Bell
                className={`w-4 h-4 ${
                  unreadNotifs > 0
                    ? 'text-primary animate-pulse'
                    : 'text-muted-foreground'
                }`}
              />
              <span className="text-sm font-medium">Notifications</span>
            </div>
            {unreadNotifs > 0 && (
              <span className="chip chip-cerulean numeric">
                {unreadNotifs}
              </span>
            )}
          </Link>
        </div>

        {/* DSRT News */}
        <div className="skeu-card p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="accent-dot" />
              <p className="section-label">DSRT NEWS</p>
            </div>
            <span className="text-[9px] text-emerald-500 font-mono uppercase tracking-wider">
              Live
            </span>
          </div>

          <div className="space-y-2">
            {pulseItems.length === 0 ? (
              <p className="text-xs text-muted-foreground">Loading...</p>
            ) : (
              pulseItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/pulse/${item.id}`}
                  className="block group py-1"
                >
                  <p className="text-xs font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {item.headline}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 numeric">
                    {formatDistanceToNow(new Date(item.published_at), {
                      addSuffix: true,
                    })}{' '}
                    · {item.view_count || 0}
                  </p>
                </Link>
              ))
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowAllNews(!showAllNews)}
            className="mt-2 pt-2 border-t border-border w-full flex items-center justify-center gap-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            {showAllNews ? 'Less' : 'More'}
            <ChevronDown
              className={`w-3 h-3 transition-transform ${
                showAllNews ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>

        {/* Trending Builds */}
        {trendingBuilds.length > 0 && (
          <div className="skeu-card p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="w-3 h-3 text-muted-foreground" />
              <p className="section-label">TRENDING</p>
            </div>
            <div className="space-y-1.5">
              {trendingBuilds.map((b: any) => (
                <Link
                  key={`${b.type}-${b.id}`}
                  href={b.href}
                  className="block group"
                >
                  <div className="flex items-start gap-1.5">
                    <span className="text-xs mt-0.5">
                      {b.type === 'venture' ? '◈' : '◇'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate group-hover:text-primary">
                        {b.name}
                      </p>
                      {b.tagline && (
                        <p className="text-[10px] text-muted-foreground line-clamp-1">
                          {b.tagline}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Trending Tags */}
        {trendingTags.length > 0 && (
          <div className="skeu-card p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Hash className="w-3 h-3 text-muted-foreground" />
              <p className="section-label">TAGS</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {trendingTags.map((t: any) => (
                <Link
                  key={t.tag}
                  href={`/explore?tag=${t.tag}`}
                  className="chip chip-cerulean hover:opacity-80"
                >
                  #{t.tag}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Builders */}
        <div className="skeu-card p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Users className="w-3 h-3 text-muted-foreground" />
            <p className="section-label">SUGGESTED</p>
          </div>
          {suggestedBuilders.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">
              Complete profile
            </p>
          ) : (
            <div className="space-y-2">
              {suggestedBuilders.map((s: any) => (
                <Link
                  key={s.user.id}
                  href={`/profile/${s.user.username}`}
                  className="flex items-start gap-2 group"
                >
                  <Avatar className="w-7 h-7 border border-border">
                    <AvatarImage src={s.user.avatar_url} />
                    <AvatarFallback className="text-[9px]">
                      {s.user.full_name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate group-hover:text-primary">
                      {s.user.full_name}
                    </p>
                    {s.reasons?.[0] && (
                      <p className="text-[10px] text-primary numeric">
                        {s.reasons[0]}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Break — Games */}
        <div className="skeu-card p-3 bg-gradient-to-br from-purple-500/5 to-transparent border-purple-500/20">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <p className="section-label">BREAK</p>
          </div>
          <div className="space-y-1">
            <Link
              href="/games/pingpong"
              className="flex items-center gap-2 text-xs px-1.5 py-1 rounded hover:bg-muted"
            >
              <span>🏓</span>
              <span>Ping Pong</span>
            </Link>
            <Link
              href="/games/blockcube"
              className="flex items-center gap-2 text-xs px-1.5 py-1 rounded hover:bg-muted"
            >
              <span>🎲</span>
              <span>Block Cube</span>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 pb-4 space-y-1">
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] font-mono uppercase tracking-wider text-muted-foreground/60">
            <a href="#" className="hover:text-foreground">About</a>
            <span>·</span>
            <a href="#" className="hover:text-foreground">Privacy</a>
            <span>·</span>
            <a href="#" className="hover:text-foreground">Terms</a>
          </div>
          <p className="text-[9px] text-muted-foreground/40 font-mono">
            DSRT © 2025
          </p>
        </div>
      </div>
    </aside>
  )
}