import { ProjectCreationStudio } from '@/components/projects/create/ProjectCreationStudio'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ continue?: string }>
}

export default async function CreateProjectPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  
  const params = await searchParams
  const continueDraftId = params.continue || null

  return <ProjectCreationStudio continueDraftId={continueDraftId} />
}