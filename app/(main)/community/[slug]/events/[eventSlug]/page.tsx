import { EventPublicPage } from '@/components/community-hub/events/EventPublicPage'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ slug: string; eventSlug: string }> }) {
  const { slug, eventSlug } = await params
  const supabase = await createClient()
  const { data: community } = await supabase.from('communities').select('id').eq('slug', slug).maybeSingle()
  if (!community) notFound()

  return <EventPublicPage slug={eventSlug} />
}