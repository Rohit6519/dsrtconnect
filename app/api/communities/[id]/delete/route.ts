import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const communityId = params.id

  const { data: community, error: fetchError } = await supabase
    .from('communities')
    .select('id, name, created_by')
    .eq('id', communityId)
    .single()

  if (fetchError || !community) {
    return NextResponse.json({ error: 'Community not found' }, { status: 404 })
  }

  if (community.created_by !== user.id) {
    return NextResponse.json({ 
      error: 'Only the creator can delete this community' 
    }, { status: 403 })
  }

  const { error: deleteError } = await supabase
    .from('communities')
    .delete()
    .eq('id', communityId)

  if (deleteError) {
    return NextResponse.json({ 
      error: deleteError.message 
    }, { status: 500 })
  }

  return NextResponse.json({ 
    success: true, 
    message: `Community "${community.name}" deleted successfully` 
  })
}