import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createDraft } from '@/lib/community/service.drafts'

export const dynamic = 'force-dynamic'

export default async function NewCommunityStudioEntry() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/studio/community/new')

  const draft = await createDraft(supabase, user.id)
  redirect(`/studio/community/${draft.id}`)
}