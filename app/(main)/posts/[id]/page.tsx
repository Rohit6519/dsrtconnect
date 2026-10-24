import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PostDetailPage } from '@/components/home-v2/detail/PostDetailPage'

export const dynamic = 'force-dynamic'

export default async function PostRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=/posts/${id}`)
  const { data: profile } = await supabase.from('users').select('id, username, full_name, avatar_url, is_verified').eq('id', user.id).single()
  return <PostDetailPage postId={id} currentUser={profile} />
}