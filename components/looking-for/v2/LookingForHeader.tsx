'use client'

import Link from 'next/link'
import { Plus, Briefcase } from '@phosphor-icons/react'
import { DsrtSection, DsrtButton } from '@/components/dsrt'

interface Props {
  onCreate: () => void
}

export function LookingForHeader({ onCreate }: Props) {
  return (
    <DsrtSection
      title="Looking For"
      description="Find people to build, work, and grow with."
      headerVariant="large"
      actions={
        <div className="flex items-center gap-2 shrink-0">
          <DsrtButton asChild size="sm" variant="outline">
            <Link href="/looking-for/my-opportunities">
              <Briefcase size={14} weight="fill" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          </DsrtButton>
          <DsrtButton size="sm" variant="white" onClick={onCreate}>
            <Plus size={13} weight="bold" />
            <span className="hidden sm:inline">Create Opportunity</span>
            <span className="sm:hidden">Create</span>
          </DsrtButton>
        </div>
      }
    />
  )
}