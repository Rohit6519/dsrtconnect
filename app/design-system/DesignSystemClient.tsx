'use client'

import { Compass, Users, Zap, Home, Rocket, Search, Settings } from 'lucide-react'
import {
  PageShell,
  PageHeader,
  SectionHeader,
  EmptyState,
  ErrorState,
  LoadingState,
  ForbiddenState,
  SkeletonCards,
  SkeletonRows,
  TabsNav,
  RightRail,
  RailCard,
  Chip,
} from '@/components/kernel-ui'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function DesignSystemClient() {
  return (
    <PageShell width="wide">
      <PageHeader
        eyebrow="Kernel UI · Phase 1"
        title="DSRT Design System"
        description="Every kernel-ui primitive rendered together. Use this page during design QA."
        breadcrumbs={[
          { label: 'Internal', href: '/design-system' },
          { label: 'Design System' },
        ]}
        actions={
          <>
            <Button variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5 hover:text-white">
              Secondary
            </Button>
            <Button className="bg-white text-black hover:bg-zinc-200">
              Primary Action
            </Button>
          </>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-10">
          {/* CHIPS */}
          <section>
            <SectionHeader
              title="Chips"
              description="Compact status/labels. Six tones, two sizes."
            />
            <div className="flex flex-wrap gap-2">
              <Chip tone="neutral">Neutral</Chip>
              <Chip tone="accent" icon={Compass}>Discover</Chip>
              <Chip tone="success">Active</Chip>
              <Chip tone="warning">Pending</Chip>
              <Chip tone="danger">Suspended</Chip>
              <Chip tone="info" icon={Users}>247 members</Chip>
              <Chip tone="neutral" size="sm">SM</Chip>
              <Chip tone="accent" size="sm">Filter</Chip>
            </div>
          </section>

          {/* TABS */}
          <section>
            <SectionHeader
              title="Tabs Nav"
              description="Cursor-aware tab bar with underline indicator + badges."
            />
            <TabsNav
              tabs={[
                { label: 'Overview', href: '/design-system', icon: Home, matchMode: 'exact' },
                { label: 'Discussion', href: '/design-system#discussion', icon: Users, badge: 12 },
                { label: 'Events', href: '/design-system#events', icon: Rocket, badge: 3 },
                { label: 'People', href: '/design-system#people', badge: 240 },
                { label: 'About', href: '/design-system#about' },
              ]}
            />
          </section>

          {/* CARDS */}
          <section>
            <SectionHeader title="Cards" description="Existing skeu-card + kernel cards side by side." />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="skeu-card p-5">
                <p className="label-mono mb-2">Legacy · skeu-card</p>
                <h4 className="text-white font-semibold">Original card</h4>
                <p className="text-white/60 text-[13px] mt-1.5">
                  Existing skeuomorphic card preserved for continuity.
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                <p className="label-mono mb-2 text-white/40">Kernel · rail card</p>
                <h4 className="text-white font-semibold">Kernel card</h4>
                <p className="text-white/60 text-[13px] mt-1.5">
                  New kernel-ui surface — flat, subtle, mobile-friendly.
                </p>
              </div>
            </div>
          </section>

          {/* STATES */}
          <section>
            <SectionHeader title="States" description="Loading · Empty · Error · Forbidden — designed variants." />
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="bg-surface-1 border-white/[0.06]">
                <LoadingState label="Loading communities…" />
              </Card>
              <Card className="bg-surface-1 border-white/[0.06]">
                <EmptyState
                  icon={Compass}
                  title="No communities yet"
                  description="Discover communities aligned with your skills and interests."
                  action={
                    <Button className="bg-white text-black hover:bg-zinc-200">
                      Explore Discover
                    </Button>
                  }
                />
              </Card>
              <Card className="bg-surface-1 border-white/[0.06]">
                <ErrorState
                  title="Could not load feed"
                  description="A network hiccup prevented us from fetching your feed."
                  errorCode="FEED_FETCH_FAILED"
                />
              </Card>
              <Card className="bg-surface-1 border-white/[0.06]">
                <ForbiddenState
                  title="Members only"
                  description="Join this community to view its discussion feed."
                  actionLabel="Request to join"
                  actionHref="#"
                />
              </Card>
            </div>
          </section>

          {/* SKELETONS */}
          <section>
            <SectionHeader title="Skeletons" description="Card grid + row skeletons for lists." />
            <SkeletonCards count={3} />
            <div className="mt-6">
              <SkeletonRows count={4} />
            </div>
          </section>

          {/* INLINE LOADING */}
          <section>
            <SectionHeader title="Inline loading" variant="mono" />
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <LoadingState variant="inline" label="Syncing 3 changes…" />
            </div>
          </section>
        </div>

        {/* RIGHT RAIL */}
        <RightRail>
          <RailCard title="About">
            <p className="text-[13px] text-white/70 leading-relaxed">
              The Kernel UI primitives are the source of truth for every DSRT
              surface built after Phase 1.
            </p>
          </RailCard>
          <RailCard
            title="Quick actions"
            actions={<Chip tone="accent" size="sm">3</Chip>}
          >
            <div className="space-y-2">
              {[
                { icon: Search, label: 'Search primitives' },
                { icon: Settings, label: 'Token reference' },
                { icon: Zap, label: 'Motion tokens' },
              ].map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-[13px] text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  <Icon className="w-4 h-4" strokeWidth={1.75} />
                  {label}
                </button>
              ))}
            </div>
          </RailCard>
          <RailCard title="Kernel invariants">
            <ul className="space-y-1.5 text-[12px] text-white/60 leading-relaxed">
              <li>· One request pipeline</li>
              <li>· Outbox for every mutation</li>
              <li>· Idempotent consumers</li>
              <li>· Cursor pagination only</li>
              <li>· Deny-by-default authz</li>
            </ul>
          </RailCard>
        </RightRail>
      </div>
    </PageShell>
  )
}