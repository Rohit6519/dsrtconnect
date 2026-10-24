import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { encrypt } from '@/lib/encryption'
import { Octokit } from '@octokit/rest'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      new URL(`/settings/integrations?error=${error}`, request.url)
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/settings/integrations?error=missing_params', request.url)
    )
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Verify state contains user ID (CSRF protection)
  const [stateUserId] = state.split(':')
  if (stateUserId !== user.id) {
    return NextResponse.redirect(
      new URL('/settings/integrations?error=state_mismatch', request.url)
    )
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.GITHUB_REDIRECT_URI,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenData.access_token) {
      throw new Error('No access token received')
    }

    // Get GitHub user info
    const octokit = new Octokit({ auth: tokenData.access_token })
    const { data: githubUser } = await octokit.users.getAuthenticated()

    // Encrypt token before storing
    const encryptedToken = encrypt(tokenData.access_token)

    // Store or update integration
    const { error: upsertError } = await supabase
      .from('user_integrations')
      .upsert({
        user_id: user.id,
        provider: 'github',
        provider_user_id: githubUser.id.toString(),
        provider_username: githubUser.login,
        access_token: encryptedToken,
        scopes: tokenData.scope?.split(',') || [],
        is_active: true,
        sync_enabled: true,
        last_synced_at: new Date().toISOString(),
        metadata: {
          avatar_url: githubUser.avatar_url,
          name: githubUser.name,
          bio: githubUser.bio,
          company: githubUser.company,
          location: githubUser.location,
          public_repos: githubUser.public_repos,
          followers: githubUser.followers,
          following: githubUser.following,
          created_at: githubUser.created_at,
        },
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider'
      })

    if (upsertError) {
      console.error('Failed to save integration:', upsertError)
      throw upsertError
    }

    // Log the connection event
    await supabase.from('data_access_log').insert({
      user_id: user.id,
      provider: 'github',
      action: 'connect',
      data_type: 'oauth_token',
      performed_by: 'user',
    })

    // Auto-update user profile with GitHub URL
    await supabase
      .from('users')
      .update({
        github_url: `https://github.com/${githubUser.login}`,
      })
      .eq('id', user.id)
      .is('github_url', null)  // Only update if not already set

    return NextResponse.redirect(
      new URL('/settings/integrations?success=github_connected', request.url)
    )
  } catch (err: any) {
    console.error('GitHub OAuth error:', err)
    return NextResponse.redirect(
      new URL(`/settings/integrations?error=oauth_failed`, request.url)
    )
  }
}