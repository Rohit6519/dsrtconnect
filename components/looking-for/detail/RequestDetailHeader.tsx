'use client'

import Image from 'next/image'
import Link from 'next/link'
import { CheckCircle, Sparkle } from '@phosphor-icons/react'
import type { TeamUpItem } from '@/types/teamup'
import { REQUEST_TYPE_LABELS } from '@/types/teamup'

interface Props {
  item: TeamUpItem
}

export function RequestDetailHeader({ item }: Props) {
  const typeLabel = REQUEST_TYPE_LABELS[item.request_type] || item.request_type
  const context = item.venture || item.project

  const isUrgent =
    item.urgency === 'urgent' ||
    item.urgency === 'high' ||
    item.status === 'closing_soon'

  return (
    <div>
      {/* Top badges */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <span className="inline-flex items-center h-5 px-1.5 rounded text-[10px] font-medium uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
          {typeLabel}
        </span>
        {item.is_featured && (
          <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded text-[10px] font-medium uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Sparkle size={9} weight="fill" />
            Featured
          </span>
        )}
        {item.is_verified && (
          <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded text-[10px] font-medium uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle size={9} weight="fill" />
            Verified
          </span>
        )}
        {isUrgent && (
          <span className="inline-flex items-center h-5 px-1.5 rounded text-[10px] font-medium uppercase tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/20">
            {item.status === 'closing_soon' ? 'Closing soon' : 'Urgent'}
          </span>
        )}
      </div>

      {/* Title */}
      <h1 className="text-[26px] md:text-[30px] font-semibold tracking-tight text-white leading-tight mb-3">
        {item.title}
      </h1>

      {item.tagline && (
        <p className="text-[14.5px] text-zinc-400 leading-relaxed mb-4">
          {item.tagline}
        </p>
      )}

      {/* Context: owner + venture/project */}
      <div className="flex items-center gap-4 flex-wrap">
        {item.owner && (
          <Link
            href={`/profile/${item.owner.username}`}
            className="inline-flex items-center gap-2 group"
          >
            {item.owner.avatar_url ? (
              <div className="w-6 h-6 rounded-full overflow-hidden bg-zinc-800 relative">
                <Image
                  src={item.owner.avatar_url}
                  alt={item.owner.full_name}
                  fill
                  className="object-cover"
                  sizes="24px"
                />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-medium text-zinc-400">
                {item.owner.full_name?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <span className="text-[13px] text-zinc-300 group-hover:text-white transition-colors">
              {item.owner.full_name}
            </span>
            {item.owner.is_verified && (
              <CheckCircle size={12} weight="fill" className="text-blue-400" />
            )}
          </Link>
        )}

        {context && (
          <>
            <span className="w-1 h-1 rounded-full bg-zinc-700" />
            <Link
              href={
                item.venture
                  ? `/ventures/${context.slug}`
                  : `/projects/${context.slug}`
              }
              className="inline-flex items-center gap-2 group"
            >
              {context.logo_url ? (
                <div className="w-5 h-5 rounded-sm overflow-hidden bg-zinc-800 relative">
                  <Image
                    src={context.logo_url}
                    alt={context.name}
                    fill
                    className="object-cover"
                    sizes="20px"
                  />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-sm bg-zinc-800 flex items-center justify-center text-[10px] font-medium text-zinc-400">
                  {context.name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <span className="text-[13px] font-medium text-zinc-300 group-hover:text-white transition-colors">
                {context.name}
              </span>
            </Link>
          </>
        )}

        {item.reference_number && (
          <>
            <span className="w-1 h-1 rounded-full bg-zinc-700" />
            <span className="text-[11.5px] font-mono text-zinc-600">
              {item.reference_number}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
