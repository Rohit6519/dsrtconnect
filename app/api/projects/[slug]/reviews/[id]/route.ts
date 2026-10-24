import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: Request,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const content = (body.content || '').trim()
    if (!content || content.length < 2) {
      return NextResponse.json({ error: 'Content too short' }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from('project_reviews')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { error } = await supabase
      .from('project_reviews')
      .update({
        content: content.slice(0, 3000),
        is_edited: true,
        edited_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: review } = await supabase
      .from('project_reviews')
      .select('user_id, project_id')
      .eq('id', id)
      .single()

    if (!review) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: project } = await supabase
      .from('projects')
      .select('founder_id, user_id')
      .eq('id', review.project_id)
      .single()

    const isCommentOwner = review.user_id === user.id
    const isProjectOwner = project && (project.founder_id === user.id || project.user_id === user.id)

    if (!isCommentOwner && !isProjectOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('project_reviews')
      .update({ is_deleted: true, content: '[deleted]' })
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}
