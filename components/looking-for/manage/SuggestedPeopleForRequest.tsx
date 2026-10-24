'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Sparkle, CheckCircle, PaperPlaneTilt, Warning,
} from '@phosphor-icons/react'
import { EmptyState } from '../EmptyState'
import { InviteModal } from '../suggested/InviteModal'

interface Person {
  id: string
  username: string
  full_name: string
  avatar_url: string | null
  tagline: string | null
  location: string | null
  availability: string | null
  is_verified: boolean
  is_open_to_work: boolean
  follower_count: number
  skills: string[]
  matched_skills: string[]
  missing_required: string[]
  skill_match_count: number
  required_skills_total: number
}

interface Props {
  requestId: string
  source: string
  requestTitle: string
  requiredSkills: string[]
}

export function SuggestedPeopleForRequest({ requestId, source, requestTitle, requiredSkills }: Props) {
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invitePerson, setInvitePerson] = useState<Person | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/looking-for/suggested?type=people&for_request_id=${requestId}&source=${source}&limit=30`
      )
      if (!res.ok) throw new Error('Failed to load suggestions')
      const data = await res.json()
      setPeople(data.suggestions || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [requestId, source])

  useEffect(() => {
    load()
  }, [load])

  const removeFromList = (personId: string) => {
    setPeople(prev => prev.filter(p => p.id !== personId))
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-28 rounded-xl border border-zinc-800/80 bg-zinc-950/40 animate-pulse" />
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

  if (people.length === 0) {
    return (
      <div>
        {requiredSkills.length === 0 ? (
          <EmptyState
            icon={<Sparkle size={20} weight="regular" />}
            title="Add required skills to get suggestions"
            description="Edit this request and add the skills you're looking for. We'll suggest people who match."
          />
        ) : (
          <EmptyState
            icon={<Sparkle size={20} weight="regular" />}
            title="No matching people found"
            description="No one on DSRT currently matches these skills. Try broader skills, or wait — new builders join every day."
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-[12px]">
        <div className="text-zinc-500">
          {people.length} {people.length === 1 ? 'person' : 'people'} match the skills for this request
        </div>
      </div>

      <div className="space-y-2">
        {people.map(p => (
          <PersonRow
            key={p.id}
            person={p}
            onInvite={() => setInvitePerson(p)}
          />
        ))}
      </div>

      {invitePerson && (
        <InviteModal
          person={invitePerson}
          requests={[{ id: requestId, title: requestTitle, required_skills: requiredSkills }]}
          preselectedRequestId={requestId}
          onClose={() => setInvitePerson(null)}
          onSuccess={() => {
            const id = invitePerson.id
            setInvitePerson(null)
            removeFromList(id)
          }}
        />
      )}
    </div>
  )
}

function PersonRow({ person, onInvite }: { person: Person; onInvite: () => void }) {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 hover:border-zinc-700 transition-colors p-4">
      <div className="flex items-start gap-4">
        {person.avatar_url ? (
          <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-800 shrink-0 relative">
            <Image src={person.avatar_url} alt="" fill className="object-cover" sizes="44px" />
          </div>
        ) : (
          <div className="w-11 h-11 rounded-full bg-zinc-800 flex items-center justify-center text-[14px] font-medium text-zinc-400 shrink-0">
            {person.full_name?.[0]?.toUpperCase() || '?'}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Link
              href={`/profile/${person.username}`}
              className="text-[14px] font-semibold text-white hover:text-blue-400 transition-colors truncate max-w-[260px]"
            >
              {person.full_name}
            </Link>
            {person.is_verified && <CheckCircle size={11} weight="fill" className="text-blue-400" />}
            {person.is_open_to_work && (
              <span className="inline-flex items-center h-5 px-1.5 rounded text-[10px] font-medium uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Open to work
              </span>
            )}
            <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded text-[10px] font-medium uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Sparkle size={9} weight="fill" />
              {person.matched_skills.length} of {person.required_skills_total} skills
            </span>
          </div>

          {person.tagline && (
            <div className="text-[12.5px] text-zinc-400 truncate mb-1.5">
              {person.tagline}
            </div>
          )}

          <div className="flex items-center gap-3 text-[11.5px] text-zinc-500 mb-2">
            {person.location && <span>{person.location}</span>}
            {person.availability && (
              <>
                {person.location && <span className="w-1 h-1 rounded-full bg-zinc-700" />}
                <span className="capitalize">{person.availability.replace('_', ' ')}</span>
              </>
            )}
          </div>

          {/* Matched skills */}
          {person.matched_skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {person.matched_skills.map(s => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 h-5 px-1.5 rounded text-[10.5px] font-medium bg-blue-500/10 border border-blue-500/20 text-blue-300"
                >
                  <CheckCircle size={8} weight="fill" />
                  {s}
                </span>
              ))}
            </div>
          )}

          {/* Missing required */}
          {person.missing_required && person.missing_required.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              <span className="text-[10.5px] text-zinc-500 uppercase tracking-wider">Missing:</span>
              {person.missing_required.slice(0, 4).map(s => (
                <span
                  key={s}
                  className="inline-flex items-center h-5 px-1.5 rounded text-[10.5px] font-medium border border-zinc-800 text-zinc-500"
                >
                  {s}
                </span>
              ))}
              {person.missing_required.length > 4 && (
                <span className="text-[10.5px] text-zinc-600">+{person.missing_required.length - 4}</span>
              )}
            </div>
          )}
        </div>

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
            View
          </Link>
        </div>
      </div>
    </div>
  )
}
