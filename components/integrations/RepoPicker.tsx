'use client'

import { useState, useEffect } from 'react'
import { Search, Lock, Star, GitFork, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { DsrtModal, DsrtInput, DsrtButton, DsrtPanel } from '@/components/dsrt'

interface RepoPickerProps {
  onClose: () => void
}

export function RepoPicker({ onClose }: RepoPickerProps) {
  const [repos, setRepos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/integrations/github/repos')
      .then(r => r.json())
      .then(data => {
        if (data.repos) setRepos(data.repos)
        else toast.error('Failed to load repos')
      })
      .catch(() => toast.error('Failed to load repos'))
      .finally(() => setLoading(false))
  }, [])

  const filteredRepos = repos.filter(r => r.full_name.toLowerCase().includes(search.toLowerCase()))

  const toggleTrack = async (repo: any) => {
    const key = `${repo.owner}/${repo.name}`
    setProcessing(key)

    if (repo.is_tracked) {
      const res = await fetch(`/api/integrations/github/track?owner=${repo.owner}&name=${repo.name}`, { method: 'DELETE' })
      if (res.ok) {
        setRepos(prev => prev.map(r => r.id === repo.id ? { ...r, is_tracked: false } : r))
        toast.success(`Stopped tracking ${repo.name}`)
      } else {
        toast.error('Failed to untrack')
      }
    } else {
      const res = await fetch('/api/integrations/github/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: repo.owner, name: repo.name, url: repo.html_url,
          language: repo.language, stars: repo.stargazers_count, forks: repo.forks_count,
          defaultBranch: repo.default_branch, isPrivate: repo.private,
        }),
      })
      if (res.ok) {
        setRepos(prev => prev.map(r => r.id === repo.id ? { ...r, is_tracked: true } : r))
        toast.success(`Now tracking ${repo.name}`)
      } else {
        toast.error('Failed to track')
      }
    }
    setProcessing(null)
  }

  return (
    <DsrtModal
      open
      onOpenChange={(v) => !v && onClose()}
      title="Select Repositories to Track"
      description="We sync commit metadata (frequency, patterns) — never your code."
      size="xl"
      footer={
        <>
          <span className="text-[11px] font-mono uppercase tracking-wider text-white/40 mr-auto">
            {repos.filter(r => r.is_tracked).length} of {repos.length} tracked
          </span>
          <DsrtButton variant="primary" onClick={onClose}>Done</DsrtButton>
        </>
      }
    >
      <div className="space-y-3">
        <DsrtInput
          placeholder="Search repositories..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          icon={<Search size={14} />}
        />

        <div className="space-y-2 min-h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-white/40" />
            </div>
          ) : filteredRepos.length === 0 ? (
            <p className="text-center text-[13px] text-white/40 py-12">No repositories found</p>
          ) : (
            filteredRepos.map(repo => (
              <DsrtPanel
                key={repo.id}
                padding="sm"
                variant={repo.is_tracked ? 'accent' : 'default'}
                className="flex items-start gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[13px] font-bold text-white truncate">{repo.full_name}</p>
                    {repo.private && <Lock className="w-3 h-3 text-white/40 shrink-0" />}
                  </div>
                  {repo.description && (
                    <p className="text-[11px] text-white/50 mt-0.5 line-clamp-1">{repo.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-white/40">
                    {repo.language && (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#93c5fd]" />
                        {repo.language}
                      </span>
                    )}
                    <span className="flex items-center gap-1"><Star className="w-3 h-3" />{repo.stargazers_count}</span>
                    <span className="flex items-center gap-1"><GitFork className="w-3 h-3" />{repo.forks_count}</span>
                  </div>
                </div>

                <DsrtButton
                  size="xs"
                  variant={repo.is_tracked ? 'outline' : 'primary'}
                  onClick={() => toggleTrack(repo)}
                  loading={processing === `${repo.owner}/${repo.name}`}
                >
                  {repo.is_tracked ? 'Tracking' : 'Track'}
                </DsrtButton>
              </DsrtPanel>
            ))
          )}
        </div>
      </div>
    </DsrtModal>
  )
}