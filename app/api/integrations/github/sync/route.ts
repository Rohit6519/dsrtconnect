import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { decrypt } from '@/lib/encryption'
import { Octokit } from '@octokit/rest'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get GitHub integration
  const { data: integration } = await supabase
    .from('user_integrations')
    .select('access_token, provider_username')
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

  // Get tracked repos
  const { data: trackedRepos } = await supabase
    .from('tracked_repos')
    .select('*')
    .eq('user_id', user.id)
    .eq('provider', 'github')
    .eq('sync_enabled', true)

  if (!trackedRepos || trackedRepos.length === 0) {
    return NextResponse.json({ 
      message: 'No repos to sync',
      synced: 0 
    })
  }

  const octokit = new Octokit({ auth: token })
  let totalCommitsSynced = 0
  const syncResults: any[] = []

  for (const repo of trackedRepos) {
    try {
      // Fetch commits from last 30 days
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

      const { data: commits } = await octokit.repos.listCommits({
        owner: repo.repo_owner,
        repo: repo.repo_name,
        author: integration.provider_username,  // Only user's own commits
        since,
        per_page: 100,
      })

      // Store commit metadata (NEVER the code itself)
      for (const commit of commits) {
        const { error } = await supabase
          .from('repo_commits')
          .upsert({
            repo_id: repo.id,
            commit_sha: commit.sha,
            commit_message: commit.commit.message.slice(0, 500),  // Truncate long messages
            author_name: commit.commit.author?.name,
            author_email: commit.commit.author?.email,
            additions: 0,  // Will fetch details separately if needed
            deletions: 0,
            files_changed: 0,
            committed_at: commit.commit.author?.date,
          }, {
            onConflict: 'repo_id,commit_sha'
          })

        if (!error) totalCommitsSynced++
      }

      // Update repo stats
      const { data: repoDetails } = await octokit.repos.get({
        owner: repo.repo_owner,
        repo: repo.repo_name,
      })

      await supabase
        .from('tracked_repos')
        .update({
          stars: repoDetails.stargazers_count,
          forks: repoDetails.forks_count,
          open_issues: repoDetails.open_issues_count,
          language: repoDetails.language,
          last_commit_at: repoDetails.pushed_at,
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', repo.id)

      // Update build_stats based on commit dates
      const commitsByDate: Record<string, number> = {}
      commits.forEach(c => {
        const date = c.commit.author?.date?.split('T')[0]
        if (date) {
          commitsByDate[date] = (commitsByDate[date] || 0) + 1
        }
      })

      for (const [date, count] of Object.entries(commitsByDate)) {
        await supabase
          .from('build_stats')
          .upsert({
            user_id: user.id,
            date,
            commits: count,
          }, {
            onConflict: 'user_id,date',
            ignoreDuplicates: false,
          })
      }

      syncResults.push({
        repo: `${repo.repo_owner}/${repo.repo_name}`,
        commits: commits.length,
      })
    } catch (error: any) {
      console.error(`Sync error for ${repo.repo_name}:`, error.message)
      syncResults.push({
        repo: `${repo.repo_owner}/${repo.repo_name}`,
        error: error.message,
      })
    }
  }

  // Update integration last_synced_at
  await supabase
    .from('user_integrations')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('provider', 'github')

  // Log sync
  await supabase.from('data_access_log').insert({
    user_id: user.id,
    provider: 'github',
    action: 'sync',
    data_type: 'commits',
    record_count: totalCommitsSynced,
    performed_by: 'user',
  })

  return NextResponse.json({
    success: true,
    synced: totalCommitsSynced,
    results: syncResults,
  })
}