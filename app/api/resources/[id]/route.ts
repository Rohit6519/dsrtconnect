import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  try {
    const { data, error } = await supabase
      .from('resources')
      .select('*, category:resource_categories!resources_category_id_fkey(id, slug, name, icon, color)')
      .eq('id', id)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Track view (fire-and-forget)
    supabase.rpc('increment_resource_view', { p_resource_id: id }).then(() => {}, () => {})

    let user_saved = false
    let user_upvoted = false
    if (user?.id) {
      const [s, u] = await Promise.all([
        supabase.from('resource_saves').select('user_id').eq('resource_id', id).eq('user_id', user.id).maybeSingle(),
        supabase.from('resource_upvotes').select('user_id').eq('resource_id', id).eq('user_id', user.id).maybeSingle(),
      ])
      user_saved = !!s.data
      user_upvoted = !!u.data
    }

    return NextResponse.json({ resource: { ...data, user_saved, user_upvoted } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}
