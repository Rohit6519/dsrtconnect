import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const clientId = process.env.GITHUB_CLIENT_ID
  const redirectUri = process.env.GITHUB_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: 'GitHub not configured' }, { status: 500 })
  }

  // Scopes we request from GitHub
  // read:user - basic profile info
  // repo - access to public + private repos (user chooses which to track)
  // read:org - see organizations user belongs to
  const scopes = ['read:user', 'repo', 'read:org'].join(' ')

  // State parameter for security (prevents CSRF)
  const state = user.id + ':' + Date.now().toString(36)

  const githubUrl = new URL('https://github.com/login/oauth/authorize')
  githubUrl.searchParams.set('client_id', clientId)
  githubUrl.searchParams.set('redirect_uri', redirectUri)
  githubUrl.searchParams.set('scope', scopes)
  githubUrl.searchParams.set('state', state)
  githubUrl.searchParams.set('allow_signup', 'false')

  return NextResponse.redirect(githubUrl.toString())
}