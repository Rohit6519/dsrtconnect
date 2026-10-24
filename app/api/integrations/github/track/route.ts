import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { owner, name, url, language, stars, forks, defaultBranch, isPrivate, projectId } = body

  if (!owner || !name || !url) {
    return NextResponse.json({ error: 'Missing repo details' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('tracked_repos')
    .upsert({
      user_id: user.id,
      project_id: projectId || null,
      provider: 'github',
      repo_owner: owner,
      repo_name: name,
      repo_url: url,
      is_private: isPrivate || false,
      language: language || null,
      stars: stars || 0,
      forks: forks || 0,
      default_branch: defaultBranch || 'main',
      sync_enabled: true,
    }, {
      onConflict: 'user_id,provider,repo_owner,repo_name'
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ repo: data })
}

export async function DELETE(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const owner = searchParams.get('owner')
  const name = searchParams.get('name')

  if (!owner || !name) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const { error } = await supabase
    .from('tracked_repos')
    .delete()
    .eq('user_id', user.id)
    .eq('provider', 'github')
    .eq('repo_owner', owner)
    .eq('repo_name', name)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}