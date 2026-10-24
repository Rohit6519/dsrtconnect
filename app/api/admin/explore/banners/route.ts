import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Verify Admin (Implement your DSRT admin check here)
  const { data: admin } = await supabase.from('users').select('role').eq('id', user?.id).single()
  if (admin?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  try {
    const body = await request.json()
    const { data, error } = await supabase
      .from('explore_banners')
      .insert({
        title: body.title,
        subtitle: body.subtitle,
        image_url: body.image_url,
        cta_label: body.cta_label,
        cta_route: body.cta_route,
        priority: body.priority || 0,
        is_active: body.is_active ?? true
      })
      .select()

    if (error) throw error
    return NextResponse.json({ success: true, banner: data[0] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  try {
    const { id, is_active, priority } = await request.json()
    const { error } = await supabase.from('explore_banners').update({ is_active, priority }).eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}