'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { Github, Linkedin, Twitter, Youtube, Instagram, Figma, Rocket, Music, ShieldCheck, Info, RefreshCw, Check, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { RepoPicker } from './RepoPicker'
import { DsrtSection, DsrtPanel, DsrtButton, DsrtChip } from '@/components/dsrt'

interface IntegrationsHubProps {
  integrations: any[]
  trackedRepos: any[]
}

const providers = [
  {
    id: 'github', name: 'GitHub', icon: Github,
    description: 'Sync your code contributions, commits, and repo activity',
    audience: 'Developers, Engineers, Technical Founders',
    tracked: ['Commit frequency', 'Repository stats', 'Contribution graph', 'Language breakdown'],
    notTracked: ['Your code', 'Private files', 'Issue content'],
    available: true,
  },
  {
    id: 'linkedin', name: 'LinkedIn', icon: Linkedin,
    description: 'Import work history, skills, and professional network',
    audience: 'All professionals across every industry',
    tracked: ['Work history', 'Skills endorsements', 'Company connections', 'Certifications'],
    notTracked: ['Private messages', 'Full connection list', 'Salary info'],
    available: false,
  },
  {
    id: 'twitter', name: 'X (Twitter)', icon: Twitter,
    description: 'Track your public voice and thought leadership metrics',
    audience: 'Thinkers, writers, communicators in any field',
    tracked: ['Post frequency', 'Engagement metrics', 'Topics tweeted'],
    notTracked: ['DMs', 'Private lists', 'Blocked accounts'],
    available: false,
  },
  {
    id: 'youtube', name: 'YouTube', icon: Youtube,
    description: 'Track your content creation and audience growth',
    audience: 'Creators, educators, researchers publishing video',
    tracked: ['Videos published', 'View counts', 'Subscriber growth', 'Content categories'],
    notTracked: ['Video content', 'Comment content', 'Watch history'],
    available: false,
  },
  {
    id: 'instagram', name: 'Instagram', icon: Instagram,
    description: 'Track your visual portfolio and creative work',
    audience: 'Designers, artists, photographers, chefs, creators',
    tracked: ['Post frequency', 'Engagement rate', 'Content categories'],
    notTracked: ['DMs', 'Stories after 24h', 'Followers list'],
    available: false,
  },
  {
    id: 'behance', name: 'Behance', icon: Figma,
    description: 'Showcase your design portfolio automatically',
    audience: 'Designers, illustrators, creative professionals',
    tracked: ['Projects published', 'Views, appreciations', 'Skills tagged'],
    notTracked: ['Client work marked private'],
    available: false,
  },
  {
    id: 'producthunt', name: 'Product Hunt', icon: Rocket,
    description: 'Track your product launches and community impact',
    audience: 'Makers, founders, product creators',
    tracked: ['Launches', 'Upvotes received', 'Comments'],
    notTracked: ['Private drafts'],
    available: false,
  },
  {
    id: 'spotify', name: 'Spotify for Artists', icon: Music,
    description: 'Track your music, podcasts, and audio content',
    audience: 'Musicians, podcasters, audio creators',
    tracked: ['Releases', 'Play counts', 'Listener demographics (aggregate)'],
    notTracked: ['Individual listener data'],
    available: false,
  },
]

export function IntegrationsHub({ integrations, trackedRepos }: IntegrationsHubProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null)
  const [showRepoPicker, setShowRepoPicker] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const connectedMap = new Map(integrations.map(i => [i.provider, i]))

  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success === 'github_connected') {
      toast.success('GitHub connected', { description: 'Choose which repositories to track.' })
      setTimeout(() => setShowRepoPicker(true), 500)
    }
    if (error) {
      toast.error('Connection failed', { description: error.replace(/_/g, ' ') })
    }
  }, [searchParams])

  const handleConnect = (providerId: string) => {
    if (providerId === 'github') {
      window.location.href = '/api/integrations/github/connect'
    } else {
      toast.info(`${providerId} integration coming soon`)
    }
  }

  const handleDisconnect = async (providerId: string) => {
    if (!confirm(`Disconnect ${providerId}? All tracked data will be removed.`)) return
    const res = await fetch(`/api/integrations/${providerId}/disconnect`, { method: 'POST' })
    if (res.ok) {
      toast.success(`${providerId} disconnected`)
      router.refresh()
    } else {
      toast.error('Failed to disconnect')
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/integrations/github/sync', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Synced ${data.synced} commits`, { description: 'Your build analytics are updated.' })
        router.refresh()
      } else {
        toast.error('Sync failed', { description: data.error })
      }
    } catch {
      toast.error('Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      <DsrtSection
        title="Integrations"
        description="Connect your digital identity across platforms. DSRT becomes your central hub."
        headerVariant="large"
      />

      {/* Privacy Manifesto Card */}
      <DsrtPanel variant="accent" padding="md">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-white flex-shrink-0 mt-0.5" strokeWidth={1.75} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-white">Privacy-First Integration</p>
            <p className="text-[12px] text-white/80 mt-1 leading-relaxed">
              We analyze <strong className="text-white">behavior and metadata</strong>, never content.
              We look at HOW you build, not WHAT you build.
            </p>
            <Link href="/settings/privacy" className="text-[12px] font-semibold text-white/90 hover:text-white underline underline-offset-2 inline-flex items-center gap-1 mt-2">
              Read full privacy policy
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </DsrtPanel>

      {/* Integration Cards */}
      <div className="space-y-3">
        {providers.map((provider) => {
          const Icon = provider.icon
          const connected = connectedMap.get(provider.id)
          const isExpanded = expandedProvider === provider.id

          return (
            <motion.div key={provider.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
              <DsrtPanel padding="none" className="overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-wrap">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0f172a] to-[#1e3a5f] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-white/80" strokeWidth={1.75} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[14px] font-bold text-white">{provider.name}</p>
                        {connected && (
                          <DsrtChip size="sm" tone="success">
                            <Check className="w-3 h-3" />
                            Connected
                          </DsrtChip>
                        )}
                        {!provider.available && !connected && (
                          <DsrtChip size="sm" tone="neutral">Coming Soon</DsrtChip>
                        )}
                      </div>
                      <p className="text-[12px] text-white/60 mt-1">{provider.description}</p>
                      <p className="text-[10px] font-mono uppercase tracking-wider text-white/40 mt-1.5 italic">
                        For: {provider.audience}
                      </p>
                      {connected && (
                        <p className="text-[10px] text-white/50 mt-1.5 font-mono">
                          @{connected.provider_username}
                          {connected.last_synced_at && ` · Last synced ${new Date(connected.last_synced_at).toLocaleString()}`}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 flex-wrap w-full sm:w-auto">
                      <DsrtButton size="xs" variant="ghost" onClick={() => setExpandedProvider(isExpanded ? null : provider.id)}>
                        <Info className="w-4 h-4" />
                      </DsrtButton>
                      {connected ? (
                        <>
                          {provider.id === 'github' && (
                            <>
                              <DsrtButton size="xs" variant="outline" onClick={() => setShowRepoPicker(true)}>
                                Manage Repos ({trackedRepos.length})
                              </DsrtButton>
                              <DsrtButton size="xs" variant="outline" onClick={handleSync} loading={syncing}>
                                <RefreshCw className={cn('w-3 h-3', syncing && 'animate-spin')} />
                                Sync
                              </DsrtButton>
                            </>
                          )}
                          <DsrtButton size="xs" variant="ghost" onClick={() => handleDisconnect(provider.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                            Disconnect
                          </DsrtButton>
                        </>
                      ) : (
                        <DsrtButton size="xs" variant="primary" onClick={() => handleConnect(provider.id)} disabled={!provider.available}>
                          Connect
                        </DsrtButton>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 pt-4 border-t border-white/[0.06] space-y-3">
                      <div>
                        <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400 mb-2">What we track</p>
                        <div className="flex flex-wrap gap-1.5">
                          {provider.tracked.map(item => (
                            <span key={item} className="text-[11px] px-2 py-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-md font-medium">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-red-400 mb-2">What we NEVER access</p>
                        <div className="flex flex-wrap gap-1.5">
                          {provider.notTracked.map(item => (
                            <span key={item} className="text-[11px] px-2 py-1 bg-red-500/10 text-red-300 border border-red-500/20 rounded-md font-medium">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </DsrtPanel>
            </motion.div>
          )
        })}
      </div>

      {showRepoPicker && connectedMap.has('github') && (
        <RepoPicker onClose={() => { setShowRepoPicker(false); router.refresh() }} />
      )}
    </div>
  )
}