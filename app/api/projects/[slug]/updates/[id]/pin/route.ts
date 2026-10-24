import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: project } = await supabase
      .from('projects')
      .select('id, founder_id, user_id')
      .eq('slug', slug)
      .single()

    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (project.founder_id !== user.id && project.user_id !== user.id) {
      return NextResponse.json({ error: 'Only project owner can pin' }, { status: 403 })
    }

    const { data: post } = await supabase
      .from('posts')
      .select('pinned_at, project_id')
      .eq('id', id)
      .single()

    if (!post || post.project_id !== project.id) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const isPinned = !!post.pinned_at
    const patch: Record<string, any> = {
      pinned_at: isPinned ? null : new Date().toISOString(),
      is_pinned: !isPinned,
    }

    const { error } = await supabase
      .from('posts')
      .update(patch)
      .eq('id', id)

    if (error) {
      if (String(error.message).includes('Maximum 3 pinned')) {
        return NextResponse.json({ error: 'Max 3 pinned updates allowed. Unpin one first.' }, { status: 400 })
      }
      throw error
    }

    return NextResponse.json({ pinned: !isPinned })
  } catch (error: any) {
    console.error('Pin error:', error)
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}
