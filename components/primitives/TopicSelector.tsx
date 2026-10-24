'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export interface Topic {
  id: string
  canonical_name: string
  category?: string
  emoji?: string
}

interface Props {
  selected: string[] // canonical_name array
  onChange: (topics: string[]) => void
  minTopics?: number
  maxTopics?: number
  className?: string
}

export function TopicSelector({ 
  selected, 
  onChange, 
  minTopics = 3,
  maxTopics = 10,
  className 
}: Props) {
  const [query, setQuery] = useState('')
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchTopics = useCallback(async (searchQuery: string = '') => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('search_topics', {
        p_query: searchQuery,
        p_limit: 45
      })
      if (!error && data) setTopics(data)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchTopics('')
  }, [fetchTopics])

  useEffect(() => {
    if (query.length === 0) {
      fetchTopics('')
      return
    }
    const timer = setTimeout(() => fetchTopics(query), 200)
    return () => clearTimeout(timer)
  }, [query, fetchTopics])

  const toggle = (topicName: string) => {
    if (selected.includes(topicName)) {
      onChange(selected.filter(t => t !== topicName))
    } else {
      if (selected.length >= maxTopics) return
      onChange([...selected, topicName])
    }
  }

  const grouped = topics.reduce((acc, topic) => {
    const cat = topic.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(topic)
    return acc
  }, {} as Record<string, Topic[]>)

  const categoryOrder = [
    'Technology',
    'Business',
    'Creative',
    'Industry',
    'Frontier',
    'Impact',
    'Academic',
    'Society',
    'Lifestyle',
    'Other'
  ]

  const sortedCategories = Object.keys(grouped).sort(
    (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
  )

  const isBelowMin = selected.length < minTopics
  const isAtMax = selected.length >= maxTopics

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Search */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search topics — AI, Startups, Design, Climate..."
          className="w-full h-10 pl-10 pr-10 rounded-md bg-[#050505] border border-white/10 text-white text-[13px] placeholder:text-white/30 focus:outline-none focus:border-[#4F7CFF] focus:ring-1 focus:ring-[#4F7CFF] transition-all"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin text-white/40" />
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center justify-between">
        <p className={cn(
          "text-[11px]",
          isBelowMin ? "text-amber-400/80" : "text-white/40"
        )}>
          {isBelowMin 
            ? `Choose ${minTopics - selected.length} more (minimum ${minTopics})` 
            : `Select up to ${maxTopics} topics`}
        </p>
        <p className="text-[11px] text-white/30 font-mono">{selected.length}/{maxTopics}</p>
      </div>

      {/* Topics Grid */}
      <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1 -mr-1">
        {sortedCategories.map((category) => (
          <div key={category}>
            <p className="text-[10px] font-bold text-white/40 tracking-widest uppercase mb-2">
              {category}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {grouped[category].map((topic) => {
                const isSelected = selected.includes(topic.canonical_name)
                const isDisabled = !isSelected && isAtMax
                
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => toggle(topic.canonical_name)}
                    disabled={isDisabled}
                    className={cn(
                      "inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-medium transition-all border",
                      isSelected 
                        ? "bg-[#4F7CFF]/10 border-[#4F7CFF]/40 text-[#7B99FF]" 
                        : "bg-[#050505] border-white/10 text-white/70 hover:border-white/25 hover:text-white",
                      isDisabled && "opacity-30 cursor-not-allowed"
                    )}
                  >
                    {topic.emoji && <span className="text-[13px]">{topic.emoji}</span>}
                    {topic.canonical_name}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        {topics.length === 0 && !loading && (
          <p className="text-[13px] text-white/40 text-center py-8">
            No topics found for "{query}"
          </p>
        )}
      </div>
    </div>
  )
}