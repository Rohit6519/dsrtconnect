'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Users, Rocket, Home, Compass, Trophy, Sparkles, Bell, Settings, Plus, LogOut, User, Loader2, ArrowRight, Building2, MessageSquare, BookOpen } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

interface CommandItem {
  id: string
  type: 'action' | 'navigation' | 'user' | 'project' | 'community'
  title: string
  subtitle?: string
  icon: any
  color?: string
  onSelect: () => void
  keywords?: string[]
  avatar?: string
  fallback?: string
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter()
  const supabase = createClient()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [searchResults, setSearchResults] = useState<{
    users: any[]
    projects: any[]
    communities: any[]
  }>({ users: [], projects: [], communities: [] })
  const [searching, setSearching] = useState(false)
  const [recentItems, setRecentItems] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  // Load recent items from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('cmdk-recent')
    if (stored) {
      try { setRecentItems(JSON.parse(stored)) } catch {}
    }
  }, [])

  const saveRecent = (id: string) => {
    const updated = [id, ...recentItems.filter(x => x !== id)].slice(0, 5)
    setRecentItems(updated)
    localStorage.setItem('cmdk-recent', JSON.stringify(updated))
  }

  // Navigation actions
  const navigationItems: CommandItem[] = [
    {
      id: 'nav-home',
      type: 'navigation',
      title: 'Home',
      subtitle: 'Command Center',
      icon: Home,
      color: 'text-blue-500 bg-blue-500/10',
      onSelect: () => { router.push('/'); onClose() },
      keywords: ['dashboard', 'command'],
    },
    {
      id: 'nav-feed',
      type: 'navigation',
      title: 'Feed',
      subtitle: 'Latest posts from the community',
      icon: MessageSquare,
      color: 'text-purple-500 bg-purple-500/10',
      onSelect: () => { router.push('/feed'); onClose() },
      keywords: ['posts', 'updates'],
    },
    {
      id: 'nav-projects',
      type: 'navigation',
      title: 'My Projects',
      subtitle: 'View and manage your projects',
      icon: Rocket,
      color: 'text-orange-500 bg-orange-500/10',
      onSelect: () => { router.push('/projects'); onClose() },
      keywords: ['work', 'workspace'],
    },
    {
      id: 'nav-explore',
      type: 'navigation',
      title: 'Explore',
      subtitle: 'Discover builders, projects, communities',
      icon: Compass,
      color: 'text-cyan-500 bg-cyan-500/10',
      onSelect: () => { router.push('/explore'); onClose() },
      keywords: ['discover', 'browse'],
    },
    {
      id: 'nav-communities',
      type: 'navigation',
      title: 'Communities',
      subtitle: 'Join builder communities',
      icon: Users,
      color: 'text-green-500 bg-green-500/10',
      onSelect: () => { router.push('/community'); onClose() },
      keywords: ['groups', 'colleges', 'domains'],
    },
    {
      id: 'nav-leaderboard',
      type: 'navigation',
      title: 'Leaderboard',
      subtitle: 'Top builders and projects',
      icon: Trophy,
      color: 'text-yellow-500 bg-yellow-500/10',
      onSelect: () => { router.push('/leaderboard'); onClose() },
      keywords: ['ranking', 'top'],
    },
    {
      id: 'nav-mentor',
      type: 'navigation',
      title: 'AI Mentor',
      subtitle: 'Chat with your AI advisor',
      icon: Sparkles,
      color: 'text-pink-500 bg-pink-500/10',
      onSelect: () => { router.push('/mentor'); onClose() },
      keywords: ['ai', 'chat', 'help', 'advice'],
    },
    {
      id: 'nav-notifications',
      type: 'navigation',
      title: 'Notifications',
      subtitle: 'View all notifications',
      icon: Bell,
      color: 'text-red-500 bg-red-500/10',
      onSelect: () => { router.push('/notifications'); onClose() },
      keywords: ['alerts', 'updates'],
    },
    {
      id: 'nav-settings',
      type: 'navigation',
      title: 'Settings',
      subtitle: 'Account and preferences',
      icon: Settings,
      color: 'text-gray-500 bg-gray-500/10',
      onSelect: () => { router.push('/settings'); onClose() },
      keywords: ['preferences', 'profile'],
    },
    {
      id: 'nav-resources',
      type: 'navigation',
      title: 'Resources',
      subtitle: 'Guides and templates',
      icon: BookOpen,
      color: 'text-indigo-500 bg-indigo-500/10',
      onSelect: () => { router.push('/resources'); onClose() },
      keywords: ['docs', 'help'],
    },
  ]

  // Quick actions
  const actionItems: CommandItem[] = [
    {
      id: 'action-new-project',
      type: 'action',
      title: 'Create New Project',
      subtitle: 'Start a new project workspace',
      icon: Plus,
      color: 'text-blue-500 bg-blue-500/10',
      onSelect: () => { router.push('/projects/new'); onClose() },
      keywords: ['create', 'add'],
    },
    {
      id: 'action-integrations',
      type: 'action',
      title: 'Connect Integrations',
      subtitle: 'GitHub, LinkedIn, Twitter, and more',
      icon: Building2,
      color: 'text-purple-500 bg-purple-500/10',
      onSelect: () => { router.push('/settings/integrations'); onClose() },
      keywords: ['github', 'connect'],
    },
    {
      id: 'action-logout',
      type: 'action',
      title: 'Log Out',
      subtitle: 'Sign out of DSRT',
      icon: LogOut,
      color: 'text-red-500 bg-red-500/10',
      onSelect: async () => {
        await supabase.auth.signOut()
        router.refresh()
        router.push('/login')
      },
      keywords: ['signout', 'exit'],
    },
  ]

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    
    if (query.trim().length < 2) {
      setSearchResults({ users: [], projects: [], communities: [] })
      setSearching(false)
      return
    }

    setSearching(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setSearchResults(data)
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setSearching(false)
      }
    }, 200)

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [query])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Reset selected index on query change
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Build final list based on search
  const buildFilteredList = (): CommandItem[] => {
    if (!query.trim()) {
      // No query: show recent + navigation
      const recentNav = recentItems
        .map(id => navigationItems.find(n => n.id === id))
        .filter(Boolean) as CommandItem[]
      const remainingNav = navigationItems.filter(n => !recentItems.includes(n.id))
      return [...recentNav, ...remainingNav, ...actionItems]
    }

    // Filter navigation by query
    const q = query.toLowerCase()
    const filteredNav = navigationItems.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.subtitle?.toLowerCase().includes(q) ||
      n.keywords?.some(k => k.toLowerCase().includes(q))
    )

    const filteredActions = actionItems.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.subtitle?.toLowerCase().includes(q) ||
      a.keywords?.some(k => k.toLowerCase().includes(q))
    )

    // Convert search results to CommandItems
    const userItems: CommandItem[] = searchResults.users.map(u => ({
      id: `user-${u.id}`,
      type: 'user',
      title: u.full_name,
      subtitle: u.tagline || `@${u.username}`,
      icon: User,
      avatar: u.avatar_url,
      fallback: u.full_name?.[0]?.toUpperCase(),
      onSelect: () => { router.push(`/profile/${u.username}`); onClose() },
    }))

    const projectItems: CommandItem[] = searchResults.projects.map(p => ({
      id: `project-${p.id}`,
      type: 'project',
      title: p.name,
      subtitle: `${p.sector} · ${p.progress_percent}% complete`,
      icon: Rocket,
      color: `text-${p.color || 'blue'}-500 bg-${p.color || 'blue'}-500/10`,
      onSelect: () => { router.push(`/projects/${p.slug}`); onClose() },
    }))

    const communityItems: CommandItem[] = searchResults.communities.map(c => ({
      id: `community-${c.id}`,
      type: 'community',
      title: c.name,
      subtitle: `${c.member_count} members`,
      icon: Users,
      color: 'text-purple-500 bg-purple-500/10',
      onSelect: () => { router.push(`/community/${c.slug}`); onClose() },
    }))

    return [
      ...filteredNav,
      ...filteredActions,
      ...userItems,
      ...projectItems,
      ...communityItems,
    ]
  }

  const filteredList = buildFilteredList()

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, filteredList.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const item = filteredList[selectedIndex]
        if (item) {
          if (item.type === 'navigation') saveRecent(item.id)
          item.onSelect()
        }
      } else if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, filteredList, selectedIndex, onClose])

  if (!open) return null

  // Group items by type for display
  const grouped = {
    recent: !query.trim() ? recentItems.map(id => filteredList.find(i => i.id === id)).filter(Boolean) as CommandItem[] : [],
    navigation: filteredList.filter(i => i.type === 'navigation' && (!recentItems.includes(i.id) || query.trim())),
    actions: filteredList.filter(i => i.type === 'action'),
    users: filteredList.filter(i => i.type === 'user'),
    projects: filteredList.filter(i => i.type === 'project'),
    communities: filteredList.filter(i => i.type === 'community'),
  }

  let itemIndex = 0
  const renderItem = (item: CommandItem) => {
    const isSelected = itemIndex === selectedIndex
    const Icon = item.icon
    const currentIndex = itemIndex++

    return (
      <button
        key={item.id}
        onClick={() => {
          if (item.type === 'navigation') saveRecent(item.id)
          item.onSelect()
        }}
        onMouseEnter={() => setSelectedIndex(currentIndex)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
          isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
        )}
      >
        {item.avatar !== undefined ? (
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarImage src={item.avatar} />
            <AvatarFallback className="text-[10px]">{item.fallback}</AvatarFallback>
          </Avatar>
        ) : (
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
            item.color || 'bg-muted text-foreground'
          )}>
            <Icon className="w-4 h-4" strokeWidth={2.5} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.title}</p>
          {item.subtitle && (
            <p className="text-[11px] text-muted-foreground truncate">{item.subtitle}</p>
          )}
        </div>
        {isSelected && (
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        )}
      </button>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
      />

      {/* Palette */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ duration: 0.15 }}
        className="fixed left-1/2 top-24 -translate-x-1/2 w-full max-w-2xl z-50 px-4"
      >
        <div className="bg-card border rounded-2xl shadow-2xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b">
            {searching ? (
              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
            ) : (
              <Search className="w-4 h-4 text-muted-foreground" />
            )}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search or type a command..."
              className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground"
            />
            <kbd className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded border">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto p-2">
            {filteredList.length === 0 ? (
              <div className="text-center py-8">
                <Search className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No results for "{query}"
                </p>
              </div>
            ) : (
              <>
                {grouped.recent.length > 0 && (
                  <div className="mb-2">
                    <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                      Recent
                    </p>
                    <div className="space-y-0.5">
                      {grouped.recent.map(renderItem)}
                    </div>
                  </div>
                )}

                {grouped.navigation.length > 0 && (
                  <div className="mb-2">
                    <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                      Navigation
                    </p>
                    <div className="space-y-0.5">
                      {grouped.navigation.map(renderItem)}
                    </div>
                  </div>
                )}

                {grouped.users.length > 0 && (
                  <div className="mb-2">
                    <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                      Builders
                    </p>
                    <div className="space-y-0.5">
                      {grouped.users.map(renderItem)}
                    </div>
                  </div>
                )}

                {grouped.projects.length > 0 && (
                  <div className="mb-2">
                    <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                      Projects
                    </p>
                    <div className="space-y-0.5">
                      {grouped.projects.map(renderItem)}
                    </div>
                  </div>
                )}

                {grouped.communities.length > 0 && (
                  <div className="mb-2">
                    <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                      Communities
                    </p>
                    <div className="space-y-0.5">
                      {grouped.communities.map(renderItem)}
                    </div>
                  </div>
                )}

                {grouped.actions.length > 0 && (
                  <div>
                    <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                      Actions
                    </p>
                    <div className="space-y-0.5">
                      {grouped.actions.map(renderItem)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/20">
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <kbd className="font-mono bg-background px-1 py-0.5 rounded border">↑↓</kbd>
                <span>navigate</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="font-mono bg-background px-1 py-0.5 rounded border">↵</kbd>
                <span>select</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="font-mono bg-background px-1 py-0.5 rounded border">esc</kbd>
                <span>close</span>
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground">
              DSRT Connect
            </div>
          </div>
        </div>
      </motion.div>
    </>
  )
}