import { createClient } from '@/lib/supabase/server'
import { IntegrationsHub } from '@/components/integrations/IntegrationsHub'
import { DsrtPage } from '@/components/dsrt'

export const dynamic = 'force-dynamic'

export default async function IntegrationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: integrations } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('user_id', user!.id)

  const { data: trackedRepos } = await supabase
    .from('tracked_repos')
    .select('*')
    .eq('user_id', user!.id)
    .eq('provider', 'github')

  return (
    <DsrtPage width="default" className="py-6 sm:py-8">
      <IntegrationsHub 
        integrations={integrations || []}
        trackedRepos={trackedRepos || []}
      />
    </DsrtPage>
  )
}