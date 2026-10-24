'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  UsersThree, Warning, CheckCircle, ArrowRight,
  PaperPlaneTilt, Sparkle,
} from '@phosphor-icons/react'
import { EmptyState } from '../EmptyState'
import { InviteModal } from './InviteModal'

interface PersonSuggestion {
  id: string
  username: string
  full_name: string
  avatar_url: string | null
  tagline: string | null
  bio: string | null
  location: string | null
  availability: string | null
  is_verified: boolean
  execution_score: number
  brings: string[] | null
  is_open_to_work: boolean
  follower_count: number
  skills: string[]
  matched_skills?: string[]
  missing_required?: string[]
  skill_match_count: number
  required_skills_total?: number
}

interface UserRequest {
  id: string
  title: string
  required_skills: string[]
}

export function SuggestedPeople() {
  const [people, setPeople] = useState<PersonSuggestion[]>([])
  const [userRequests, setUserRequests] = useState<UserRequest[]>([])
  const [selectedRequestId, setSelectedRequestId] = useState<string | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [noActiveRequests, setNoActiveRequests] = useState(false)
  const [invitePerson, setInvitePerson] = useState<PersonSuggestion | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ type: 'people', limit: '30' })
      if (selectedRequestId !== 'all') {
        params.set('for_request_id', selectedRequestId)
        params.set('source', 'team_up')
      }
      const res = await fetch(`/api/looking-for/suggested?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load suggestions')
      const data = await res.json()

      setPeople(data.suggestions || [])
      setNoActiveRequests(!!data.no_active_requests)

      // On first load, if we don't have requests loaded, populate from response
      if (userRequests.length === 0 && data.user_requests) {
        setUserRequests(data.user_requests)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [selectedRequestId, userRequests.length])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-32 rounded-xl border border-zinc-800/80 bg-zinc-950/40 animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={<Warning size={20} weight="regular" />}
        title="Couldn't load suggestions"
        description={error}
      />
    )
  }

  if (noActiveRequests) {
    return (
      <EmptyState
        icon={<UsersThree size={20} weight="regular" />}
        title="No active requests to suggest people for"
        description="Publish a team-up request first, and we'll suggest people whose skills match what you're looking for."
        action={
          <Link
            href="/looking-for?tab=my-hirings"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-medium"
          >
            Create a request
            <ArrowRight size={12} weight="bold" />
          </Link>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Request selector */}
      {userRequests.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSelectedRequestId('all')}
            className={
              'inline-flex items-center h-8 px-3 rounded-md text-[12px] font-medium border transition-colors ' +
              (selectedRequestId === 'all'
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                : 'bg-transparent border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700')
            }
          >
            All my requests
          </button>
          {userRequests.map(r => (
            <button
              key={r.id}
              onClick={() => setSelectedRequestId(r.id)}
              className={
                'inline-flex items-center h-8 px-3 rounded-md text-[12px] font-medium border transition-colors max-w-[240px] ' +
                (selectedRequestId === r.id
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                  : 'bg-transparent border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700')
              }
              title={r.title}
            >
              <span className="truncate">{r.title}</span>
            </button>
          ))}
        </div>
      )}

      {people.length === 0 ? (
        <EmptyState
          icon={<UsersThree size={20} weight="regular" />}
          title="No matching people found"
          description={selectedRequestId === 'all'
            ? "We couldn't find people matching the skills across your requests yet."
            : "No one on DSRT currently matches the required skills for this request. Try refining your request or invite people directly."}
        />
      ) : (
        <div className="space-y-2">
          {people.map(p => (
            <PersonRow
              key={p.id}
              person={p}
              onInvite={() => setInvitePerson(p)}
            />
          ))}
        </div>
      )}

      {invitePerson && (
        <InviteModal
          person={invitePerson}
          requests={userRequests}
          preselectedRequestId={selectedRequestId !== 'all' ? selectedRequestId : undefined}
          onClose={() => setInvitePerson(null)}
          onSuccess={() => setInvitePerson(null)}
        />
      )}
    </div>
  )
}

function PersonRow({
  person, onInvite,
}: {
  person: PersonSuggestion
  onInvite: () => void
}) {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 hover:border-zinc-700 transition-colors p-4">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        {person.avatar_url ? (
          <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800 shrink-0 relative">
            <Image src={person.avatar_url} alt={person.full_name} fill className="object-cover" sizes="48px" />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-full bg-zinc-800 shrink-0 flex items-center justify-center text-[15px] font-medium text-zinc-400">
            {person.full_name?.[0]?.toUpperCase() || '?'}
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Link
              href={`/profile/${person.username}`}
              className="text-[14px] font-semibold text-white hover:text-blue-400 transition-colors truncate max-w-[280px]"
            >
              {person.full_name}
            </Link>
            {person.is_verified && (
              <CheckCircle size={11} weight="fill" className="text-blue-400" />
            )}
            {person.is_open_to_work && (
              <span className="inline-flex items-center h-5 px-1.5 rounded text-[10px] font-medium uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Open to work
              </span>
            )}
            {person.required_skills_total !== undefined && person.matched_skills && person.matched_skills.length > 0 && (
              <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded text-[10px] font-medium uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Sparkle size={9} weight="fill" />
                {person.matched_skills.length} skill match
              </span>
            )}
          </div>

          {person.tagline && (
            <div className="text-[12.5px] text-zinc-400 truncate mb-1.5">
              {person.tagline}
            </div>
          )}

          <div className="flex items-center gap-3 text-[11.5px] text-zinc-500 mb-2.5">
            {person.location && <span>{person.location}</span>}
            {person.availability && (
              <>
                {person.location && <span className="w-1 h-1 rounded-full bg-zinc-700" />}
                <span className="capitalize">{person.availability.replace('_', ' ')}</span>
              </>
            )}
            {person.follower_count > 0 && (
              <>
                <span className="w-1 h-1 rounded-full bg-zinc-700" />
                <span>{person.follower_count} followers</span>
              </>
            )}
          </div>

          {/* Matched skills (highlight) */}
          {person.matched_skills && person.matched_skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {person.matched_skills.slice(0, 8).map(s => (
                <span
                  key={s}
                  className="inline-flex items-center h-5 px-1.5 rounded text-[10.5px] font-medium bg-blue-500/10 border border-blue-500/20 text-blue-300"
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          {/* Other skills */}
          {(() => {
            const otherSkills = person.skills.filter(s => !(person.matched_skills || []).includes(s))
            if (otherSkills.length === 0) return null
            return (
              <div className="flex flex-wrap gap-1.5">
                {otherSkills.slice(0, 6).map(s => (
                  <span
                    key={s}
                    className="inline-flex items-center h-5 px-1.5 rounded text-[10.5px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-400"
                  >
                    {s}
                  </span>
                ))}
                {otherSkills.length > 6 && (
                  <span className="inline-flex items-center h-5 px-1.5 text-[10.5px] text-zinc-500">
                    +{otherSkills.length - 6}
                  </span>
                )}
              </div>
            )
          })()}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <button
            onClick={onInvite}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-[12px] font-medium"
          >
            <PaperPlaneTilt size={11} weight="fill" />
            Invite
          </button>
          <Link
            href={`/profile/${person.username}`}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-zinc-800 hover:border-zinc-700 text-[12px] text-zinc-300"
          >
            View profile
          </Link>
        </div>
      </div>
    </div>
  )
}
