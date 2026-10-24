'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Loader2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export interface Role {
  id: string
  canonical_name: string
  category?: string
}

interface Props {
  selected: string[] // canonical_name array
  onChange: (roles: string[]) => void
  maxRoles?: number
  className?: string
}

export function RoleMultiSelect({ 
  selected, 
  onChange, 
  maxRoles = 5,
  className 
}: Props) {
  const [query, setQuery] = useState('')
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchRoles = useCallback(async (searchQuery: string = '') => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('search_roles', {
        p_query: searchQuery,
        p_limit: 30
      })
      if (!error && data) setRoles(data)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchRoles('')
  }, [fetchRoles])

  useEffect(() => {
    if (query.length === 0) {
      fetchRoles('')
      return
    }
    const timer = setTimeout(() => fetchRoles(query), 200)
    return () => clearTimeout(timer)
  }, [query, fetchRoles])

  const toggle = (roleName: string) => {
    if (selected.includes(roleName)) {
      onChange(selected.filter(r => r !== roleName))
    } else {
      if (selected.length >= maxRoles) return
      onChange([...selected, roleName])
    }
  }

  // Group by category
  const grouped = roles.reduce((acc, role) => {
    const cat = role.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(role)
    return acc
  }, {} as Record<string, Role[]>)

  const categoryOrder = [
    'Entrepreneurship',
    'Engineering',
    'Product',
    'Design',
    'Data',
    'AI/ML',
    'Marketing',
    'Sales',
    'Finance',
    'Operations',
    'Executive',
    'Academic',
    'Science',
    'Creative',
    'Independent',
    'Professional',
    'Business',
    'Other'
  ]

  const sortedCategories = Object.keys(grouped).sort(
    (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
  )

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
          placeholder="Search roles — e.g. Founder, Designer, PM..."
          className="w-full h-10 pl-10 pr-10 rounded-md bg-[#050505] border border-white/10 text-white text-[13px] placeholder:text-white/30 focus:outline-none focus:border-[#4F7CFF] focus:ring-1 focus:ring-[#4F7CFF] transition-all"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin text-white/40" />
          </div>
        )}
      </div>

      {/* Selected count */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-white/40">
          Select up to {maxRoles} roles that best describe you
        </p>
        <p className="text-[11px] text-white/30 font-mono">{selected.length}/{maxRoles}</p>
      </div>

      {/* Role Grid Grouped by Category */}
      <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1 -mr-1">
        {sortedCategories.map((category) => (
          <div key={category}>
            <p className="text-[10px] font-bold text-white/40 tracking-widest uppercase mb-2">
              {category}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {grouped[category].map((role) => {
                const isSelected = selected.includes(role.canonical_name)
                const isDisabled = !isSelected && selected.length >= maxRoles
                
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => toggle(role.canonical_name)}
                    disabled={isDisabled}
                    className={cn(
                      "inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-medium transition-all border",
                      isSelected 
                        ? "bg-[#4F7CFF]/10 border-[#4F7CFF]/40 text-[#7B99FF]" 
                        : "bg-[#050505] border-white/10 text-white/70 hover:border-white/25 hover:text-white",
                      isDisabled && "opacity-30 cursor-not-allowed hover:border-white/10 hover:text-white/70"
                    )}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    {role.canonical_name}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        {roles.length === 0 && !loading && (
          <p className="text-[13px] text-white/40 text-center py-8">
            No roles found for "{query}"
          </p>
        )}
      </div>
    </div>
  )
}