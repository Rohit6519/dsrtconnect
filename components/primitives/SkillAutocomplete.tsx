'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Loader2, X, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export interface Skill {
  id: string
  canonical_name: string
  category: string
  subcategory?: string
}

interface Props {
  selected: Skill[]
  onChange: (skills: Skill[]) => void
  maxSkills?: number
  placeholder?: string
  disabled?: boolean
  className?: string
}

let activeSkillRequestId = 0

export function SkillAutocomplete({ 
  selected, 
  onChange, 
  maxSkills = 20,
  placeholder = 'Search skills — try "Python", "Design", "Marketing"...',
  disabled,
  className 
}: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Skill[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const [showAddCustom, setShowAddCustom] = useState(false)
  
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()
  const supabase = createClient()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setHighlightIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const searchSkills = useCallback(async (searchQuery: string) => {
    const requestId = ++activeSkillRequestId
    setLoading(true)

    try {
      const { data, error } = await supabase.rpc('search_skills', {
        p_query: searchQuery,
        p_limit: 10
      })

      if (requestId !== activeSkillRequestId) return

      if (!error && data) {
        const selectedIds = new Set(selected.map(s => s.id))
        const filtered = data.filter((s: Skill) => !selectedIds.has(s.id))
        setResults(filtered)
        setIsOpen(true)
        setShowAddCustom(
          searchQuery.length >= 2 && 
          filtered.length === 0 && 
          !selected.some(s => s.canonical_name.toLowerCase() === searchQuery.toLowerCase())
        )
      }
    } catch {
      // Silent fail
    } finally {
      if (requestId === activeSkillRequestId) {
        setLoading(false)
      }
    }
  }, [selected, supabase])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      searchSkills(query)
    }, 200)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, searchSkills])

  const handleAdd = (skill: Skill) => {
    if (selected.length >= maxSkills) return
    if (selected.some(s => s.id === skill.id)) return
    
    onChange([...selected, skill])
    setQuery('')
    setResults([])
    setIsOpen(false)
    setHighlightIndex(-1)
    inputRef.current?.focus()
  }

  const handleRemove = (skillId: string) => {
    onChange(selected.filter(s => s.id !== skillId))
  }

  const handleAddCustom = () => {
    const trimmed = query.trim()
    if (!trimmed || trimmed.length < 2) return

    const customSkill: Skill = {
      id: `custom_${Date.now()}_${trimmed.toLowerCase().replace(/\s+/g, '_')}`,
      canonical_name: trimmed,
      category: 'Custom'
    }
    handleAdd(customSkill)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && query === '' && selected.length > 0) {
      handleRemove(selected[selected.length - 1].id)
      return
    }

    if (!isOpen) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightIndex >= 0 && highlightIndex < results.length) {
        handleAdd(results[highlightIndex])
      } else if (showAddCustom) {
        handleAddCustom()
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const isAtMax = selected.length >= maxSkills

  return (
    <div className={cn("w-full space-y-3", className)}>
      {/* Selected Chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((skill) => (
            <div
              key={skill.id}
              className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1 rounded-md bg-[#4F7CFF]/10 border border-[#4F7CFF]/25 text-[12px] font-medium text-[#7B99FF]"
            >
              <span>{skill.canonical_name}</span>
              <button
                type="button"
                onClick={() => handleRemove(skill.id)}
                className="w-4 h-4 rounded-sm flex items-center justify-center hover:bg-[#4F7CFF]/20 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative" ref={wrapperRef}>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none">
            <Search className="w-4 h-4" />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            disabled={disabled || isAtMax}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (results.length > 0 || query.length >= 0) {
                searchSkills(query)
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={isAtMax ? `Maximum ${maxSkills} skills reached` : placeholder}
            className={cn(
              "w-full h-10 pl-10 pr-10 rounded-md bg-[#050505] border border-white/10 text-white text-[13px]",
              "placeholder:text-white/30 focus:outline-none focus:border-[#4F7CFF] focus:ring-1 focus:ring-[#4F7CFF]",
              "transition-all",
              (disabled || isAtMax) && "opacity-50 cursor-not-allowed"
            )}
          />

          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {loading && <Loader2 className="w-4 h-4 animate-spin text-white/40" />}
          </div>
        </div>

        {/* Dropdown */}
        {isOpen && (results.length > 0 || showAddCustom) && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#0C0C0E] border border-white/10 rounded-lg shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-100">
            <ul className="max-h-72 overflow-y-auto py-1">
              {results.map((skill, idx) => (
                <li key={skill.id}>
                  <button
                    type="button"
                    onClick={() => handleAdd(skill)}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    className={cn(
                      "w-full text-left px-3 py-2 transition-colors flex items-center justify-between gap-3",
                      highlightIndex === idx ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-white/90 truncate">
                        {skill.canonical_name}
                      </div>
                      <div className="text-[10px] text-white/40 mt-0.5 truncate uppercase tracking-wider">
                        {skill.category}{skill.subcategory ? ` · ${skill.subcategory}` : ''}
                      </div>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                  </button>
                </li>
              ))}

              {showAddCustom && (
                <li className="border-t border-white/[0.04]">
                  <button
                    type="button"
                    onClick={handleAddCustom}
                    className="w-full text-left px-3 py-2.5 hover:bg-white/[0.04] transition-colors flex items-center gap-2.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#4F7CFF]" />
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] text-white/90">Add "<span className="font-semibold">{query}</span>"</span>
                      <div className="text-[10px] text-white/40 mt-0.5 uppercase tracking-wider">Custom skill</div>
                    </div>
                  </button>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Counter */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-white/40">
          {selected.length === 0 
            ? 'Type to search or add custom skills' 
            : `${selected.length} skill${selected.length === 1 ? '' : 's'} selected`}
        </p>
        <p className="text-[11px] text-white/30 font-mono">{selected.length}/{maxSkills}</p>
      </div>
    </div>
  )
}