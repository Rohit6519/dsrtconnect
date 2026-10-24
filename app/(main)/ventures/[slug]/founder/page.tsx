import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { FounderProfileEditor } from '@/components/ventures/FounderProfileEditor'

interface PageProps {
  params: { slug: string }
}

export default async function FounderEditPage({ params }: PageProps) {
  const supabase = createClient()

  const { data: venture } = await supabase
    .from('startups')
    .select('id, slug, name, founder_id')
    .eq('slug', params.slug)
    .single()

  if (!venture) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user?.id !== venture.founder_id) {
    redirect(`/ventures/${venture.slug}`)
  }

  const { data: profile } = await supabase
    .from('venture_founder_profiles')
    .select('*')
    .eq('startup_id', venture.id)
    .eq('user_id', user!.id)
    .maybeSingle()

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Founder Profile</h1>
        <p className="text-muted-foreground mt-1">
          Editing for <span className="font-medium">{venture.name}</span>
        </p>
      </div>
      <FounderProfileEditor
        ventureId={venture.id}
        ventureSlug={venture.slug}
        userId={user!.id}
        existing={profile}
      />
    </div>
  )
}