import { createClient } from '@/lib/supabase/server'
import { AdminNav } from '@/components/admin/AdminNav'
import { HackathonForm } from '@/components/admin/HackathonForm'
import { DsrtPage, DsrtSection } from '@/components/dsrt'

export const dynamic = 'force-dynamic'

export default async function NewHackathonPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user!.id)
    .single()

  const { data: communities } = await supabase
    .from('communities')
    .select('id, name')
    .order('name')

  return (
    <div className="min-h-screen bg-[#05070D] text-white flex flex-col">
      <AdminNav profile={profile} />

      <main className="flex-1">
        <DsrtPage width="narrow" className="py-8">
          <DsrtSection
            title="Create Hackathon"
            description="Establish the foundation. AI will help structure your criteria and guidelines."
            headerVariant="large"
            className="mb-8"
          />

          <HackathonForm
            communities={communities || []}
            adminRole={profile.admin_role}
          />
        </DsrtPage>
      </main>
    </div>
  )
}