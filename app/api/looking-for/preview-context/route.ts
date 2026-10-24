import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ entity: null })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const id = searchParams.get('id')
  if (!type || !id) return NextResponse.json({ entity: null })

  if (type === 'venture') {
    const { data } = await supabase.from('ventures')
      .select('id, slug, name, logo_url, tagline, is_verified')
      .eq('id', id).single()
    return NextResponse.json({ entity: data || null })
  }
  if (type === 'project') {
    const { data } = await supabase.from('projects')
      .select('id, slug, name, logo_url, tagline, icon')
      .eq('id', id).single()
    return NextResponse.json({ entity: data || null })
  }
  return NextResponse.json({ entity: null })
}
