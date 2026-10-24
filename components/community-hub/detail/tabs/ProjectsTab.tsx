'use client'

import Link from 'next/link'
import { FolderKanban, ArrowUpRight } from 'lucide-react'
import type { CommunityDetail } from '@/hooks/useCommunityDetail'
import { useCommunityProjectsRef } from '@/hooks/useCommunityDetail'
import { DsrtPanel, DsrtEmpty, DsrtGrid, DsrtSkeleton } from '@/components/dsrt'

const REL_LABEL: Record<string, string> = {
  FEATURED: 'Featured',
  CREATED_BY_MEMBER: 'Built by a member',
  BUILT_WITHIN: 'Built within community',
  CONTEST_ENTRY: 'Contest entry',
  PARTNER: 'Partner',
  SUPPORTED: 'Supported',
}

export function ProjectsTab({ detail }: { detail: CommunityDetail }) {
  const { items, loading } = useCommunityProjectsRef(detail.community.slug)

  if (loading) {
    return (
      <DsrtGrid cols={{ base: 1, md: 2, lg: 3 }}>
        {[1, 2, 3].map(i => <DsrtSkeleton key={i} className="h-32 w-full rounded-2xl" />)}
      </DsrtGrid>
    )
  }

  if (items.length === 0) {
    return (
      <DsrtPanel>
        <DsrtEmpty
          icon={FolderKanban}
          title="No projects linked yet"
          description="Members can share their projects here so the whole community sees what's being built."
        />
      </DsrtPanel>
    )
  }

  return (
    <DsrtGrid cols={{ base: 1, md: 2, lg: 3 }}>
      {items.map((it: any) => (
        <Link
          key={it.project.id}
          href={`/projects/${it.project.slug}`}
          className="group h-full"
        >
          <DsrtPanel padding="md" className="h-full hover:border-white/[0.14] transition-colors flex flex-col">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/50 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.08]">
                {REL_LABEL[it.relationship_type] || it.relationship_type}
              </span>
              <ArrowUpRight className="w-4 h-4 text-white/30 group-hover:text-[#93c5fd] transition-colors shrink-0" strokeWidth={2} />
            </div>
            <p className="text-[15px] font-bold text-white truncate group-hover:text-[#93c5fd] transition-colors">
              {it.project.name || 'Untitled project'}
            </p>
            {it.project.tagline && (
              <p className="mt-1.5 text-[13px] text-white/60 line-clamp-2 leading-relaxed">
                {it.project.tagline}
              </p>
            )}
          </DsrtPanel>
        </Link>
      ))}
    </DsrtGrid>
  )
}