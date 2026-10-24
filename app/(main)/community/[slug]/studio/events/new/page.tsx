import { EventStudio } from '@/components/community-hub/events/EventStudio'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: c } = await supabase.from('communities').select('id').eq('slug', slug).maybeSingle()
  if (!c) notFound()
  return <EventStudio slug={slug} communityId={c.id} />
}