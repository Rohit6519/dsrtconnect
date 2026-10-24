import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { decrypt } from '@/lib/encryption'
import { Octokit } from '@octokit/rest'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: integration } = await supabase
    .from('user_integrations')
    .select('access_token')
    .eq('user_id', user.id)
    .eq('provider', 'github')
    .eq('is_active', true)
    .single()

  if (!integration) {
    return NextResponse.json({ error: 'GitHub not connected' }, { status: 404 })
  }

  const token = decrypt(integration.access_token)
  if (!token) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 500 })
  }

  try {
    const octokit = new Octokit({ auth: token })

    // Get repos user owns or has admin access to
    const { data: repos } = await octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100,
      affiliation: 'owner,collaborator',
    })

    // Also get which repos are already tracked
    const { data: tracked } = await supabase
      .from('tracked_repos')
      .select('repo_owner, repo_name')
      .eq('user_id', user.id)
      .eq('provider', 'github')

    const trackedSet = new Set(
      tracked?.map(t => `${t.repo_owner}/${t.repo_name}`) || []
    )

    // Return simplified repo list (no code, only metadata)
    const simplifiedRepos = repos.map(r => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      owner: r.owner.login,
      description: r.description,
      private: r.private,
      html_url: r.html_url,
      language: r.language,
      stargazers_count: r.stargazers_count,
      forks_count: r.forks_count,
      open_issues_count: r.open_issues_count,
      updated_at: r.updated_at,
      pushed_at: r.pushed_at,
      default_branch: r.default_branch,
      is_tracked: trackedSet.has(r.full_name),
    }))

    // Log data access
    await supabase.from('data_access_log').insert({
      user_id: user.id,
      provider: 'github',
      action: 'sync',
      data_type: 'repos_list',
      record_count: simplifiedRepos.length,
      performed_by: 'user',
    })

    return NextResponse.json({ repos: simplifiedRepos })
  } catch (error: any) {
    console.error('GitHub API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}