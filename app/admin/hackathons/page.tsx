import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { AdminNav } from '@/components/admin/AdminNav'
import { Trophy, Plus, Calendar, Users } from 'lucide-react'
import { format } from 'date-fns'
import { DsrtPage, DsrtSection, DsrtGrid, DsrtPanel, DsrtButton, DsrtEmpty, DsrtChip } from '@/components/dsrt'

export const dynamic = 'force-dynamic'

export default async function AdminHackathonsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user!.id)
    .single()

  const { data: hackathons } = await supabase
    .from('hackathons')
    .select('*, community_admins:community_id(users(*))')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-[#05070D] text-white">
      <AdminNav profile={profile} />

      <DsrtPage width="default" className="py-8">
        <DsrtSection
          title="Hackathon Management"
          description="Create and orchestrate DSRT hackathon events globally."
          headerVariant="large"
          className="mb-8"
          actions={
            <DsrtButton asChild variant="primary" size="md">
              <Link href="/admin/hackathons/new">
                <Plus className="w-4 h-4 mr-1.5" />
                Create Hackathon
              </Link>
            </DsrtButton>
          }
        />

        {!hackathons || hackathons.length === 0 ? (
          <DsrtPanel>
            <DsrtEmpty
              icon={Trophy}
              title="No hackathons yet"
              description="Create your first hackathon to open registrations."
            />
          </DsrtPanel>
        ) : (
          <DsrtGrid cols={{ base: 1, md: 2 }} gap="md">
            {hackathons.map((h: any) => (
              <Link key={h.id} href={`/admin/hackathons/${h.slug}`} className="block group">
                <DsrtPanel padding="md" className="hover:border-white/[0.14] transition-all h-full group-hover:-translate-y-0.5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#0f172a] border border-[#2c5282]/40 flex items-center justify-center flex-shrink-0">
                      <Trophy className="w-5 h-5 text-[#93c5fd]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="font-bold text-[15px] text-white truncate">{h.title}</h3>
                        <DsrtChip size="sm" tone={h.approved ? 'success' : 'warning'}>
                          {h.approved ? 'Live' : 'Draft'}
                        </DsrtChip>
                      </div>
                      
                      {h.tagline && (
                        <p className="text-[12.5px] text-white/60 line-clamp-1">
                          {h.tagline}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 mt-3 text-[11px] font-mono text-white/40 uppercase tracking-wider">
                        {h.start_date && (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(new Date(h.start_date), 'MMM d')}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          {h.participants || 0} registered
                        </span>
                      </div>
                    </div>
                  </div>
                </DsrtPanel>
              </Link>
            ))}
          </DsrtGrid>
        )}
      </DsrtPage>
    </div>
  )
}