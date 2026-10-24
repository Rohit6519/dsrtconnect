'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from '@phosphor-icons/react'
import type { TeamUpItem } from '@/types/teamup'

interface Props {
  item: TeamUpItem
}

export function RequestDetailBody({ item }: Props) {
  const context = item.venture || item.project

  return (
    <div className="space-y-6">
      {/* Description */}
      {item.description && (
        <Section title="About this opportunity">
          <p className="text-[14px] text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {item.description}
          </p>
        </Section>
      )}

      {/* What you'll do */}
      {item.what_youll_do && item.what_youll_do !== item.description && (
        <Section title="What you'll work on">
          <p className="text-[14px] text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {item.what_youll_do}
          </p>
        </Section>
      )}

      {/* Responsibilities */}
      {item.responsibilities && item.responsibilities.length > 0 && (
        <Section title="Responsibilities">
          <ul className="space-y-2">
            {item.responsibilities.map((r, i) => (
              <li key={i} className="flex gap-3 text-[14px] text-zinc-300 leading-relaxed">
                <span className="text-zinc-600 shrink-0 mt-[7px]">
                  <span className="block w-1 h-1 rounded-full bg-zinc-600" />
                </span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Required skills */}
      {item.required_skills && item.required_skills.length > 0 && (
        <Section title="Required skills">
          <div className="flex flex-wrap gap-1.5">
            {item.required_skills.map(s => (
              <span
                key={s}
                className="inline-flex items-center h-7 px-2.5 rounded text-[12px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-200"
              >
                {s}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Nice-to-have skills */}
      {item.nice_to_have_skills && item.nice_to_have_skills.length > 0 && (
        <Section title="Nice to have">
          <div className="flex flex-wrap gap-1.5">
            {item.nice_to_have_skills.map(s => (
              <span
                key={s}
                className="inline-flex items-center h-7 px-2.5 rounded text-[12px] font-medium border border-zinc-800 text-zinc-400"
              >
                {s}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* About the context (venture/project card) */}
      {context && (
        <Section title={item.venture ? 'About the venture' : 'About the project'}>
          <Link
            href={item.venture ? `/ventures/${context.slug}` : `/projects/${context.slug}`}
            className="group block rounded-xl border border-zinc-800/80 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-900/40 transition-all p-4"
          >
            <div className="flex items-start gap-3">
              {context.logo_url ? (
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 shrink-0 relative">
                  <Image
                    src={context.logo_url}
                    alt={context.name}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center text-[16px] font-medium text-zinc-400 shrink-0">
                  {context.name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-[14.5px] font-semibold text-white group-hover:text-blue-400 transition-colors">
                    {context.name}
                  </h4>
                </div>
                {context.tagline && (
                  <p className="text-[13px] text-zinc-400 mt-0.5 line-clamp-2">
                    {context.tagline}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-zinc-500 group-hover:text-blue-400 transition-colors mt-1">
                <ArrowRight size={14} weight="bold" />
              </div>
            </div>
          </Link>
        </Section>
      )}

      {/* Application requirements */}
      {(item.custom_questions && item.custom_questions.length > 0) && (
        <Section title="Application questions">
          <div className="space-y-2">
            {item.custom_questions.map((q: any, i: number) => (
              <div
                key={i}
                className="flex gap-3 text-[13.5px] text-zinc-300 leading-relaxed p-3 rounded-lg border border-zinc-800/80 bg-zinc-950/40"
              >
                <span className="text-zinc-500 font-mono text-[11px] shrink-0 mt-0.5">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>{q.question || q}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-3">
        {title}
      </h2>
      {children}
    </div>
  )
}
