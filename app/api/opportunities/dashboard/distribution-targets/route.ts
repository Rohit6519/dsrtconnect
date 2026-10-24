import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Best-effort fetch of entities the user owns or created
    // Adjust column names (user_id vs founder_id vs creator_id) if your exact schema differs
    const [
      { data: projects },
      { data: ventures },
      { data: communities }
    ] = await Promise.all([
      supabase.from('projects').select('id, name, slug, icon, cover_image_url').or(`user_id.eq.${user.id},founder_id.eq.${user.id}`),
      supabase.from('ventures').select('id, name, slug, logo_url').or(`user_id.eq.${user.id},founder_id.eq.${user.id}`),
      supabase.from('communities').select('id, name, slug, cover_image').eq('creator_id', user.id)
    ])

    return NextResponse.json({
      projects: projects || [],
      ventures: ventures || [],
      communities: communities || [],
    })
  } catch (e: any) {
    console.error('Failed to fetch distribution targets:', e)
    return NextResponse.json({ error: 'Failed to fetch targets' }, { status: 500 })
  }
}