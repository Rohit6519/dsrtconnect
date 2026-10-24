import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const source = searchParams.get('source') || 'team_up'

  if (source !== 'team_up') return NextResponse.json({ media: [] })

  const { data, error } = await supabase.from('team_up_media')
    .select('id, type, url, thumbnail_url, caption, caption_html, description, position')
    .eq('request_id', id)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ media: [] })
  return NextResponse.json({ media: data || [] })
}
