import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Missing RESEND_API_KEY' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  const url = new URL(request.url)
  const manual = url.searchParams.get('manual') === 'true'

  if (
    !manual &&
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const resend = new Resend(process.env.RESEND_API_KEY)

  const { data: users } = await supabase
    .from('users')
    .select('id, email, full_name, username')
    .eq('onboarding_complete', true)
    .eq('is_bot', false)

  if (!users || users.length === 0) {
    return NextResponse.json({ error: 'No users' })
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: topPosts },
    { data: topEditorial },
    { data: newVentures },
    { data: newProjects },
  ] = await Promise.all([
    supabase
      .from('posts')
      .select('content, users(full_name)')
      .gte('created_at', weekAgo)
      .order('like_count', { ascending: false })
      .limit(5),
    supabase
      .from('editorial_posts')
      .select('id, headline, editorial_categories(name, icon)')
      .gte('published_at', weekAgo)
      .order('view_count', { ascending: false })
      .limit(5),
    supabase
      .from('startups')
      .select('name, slug, tagline, stage')
      .gte('created_at', weekAgo)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('projects')
      .select('title, slug, tagline, stage')
      .gte('created_at', weekAgo)
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  const stats = { sent: 0, failed: 0 }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dsrt-platform.vercel.app'

  for (const user of users) {
    try {
      const html = renderDigestHtml({
        userName: user.full_name?.split(' ')[0] || 'Builder',
        appUrl,
        topPosts: topPosts || [],
        topEditorial: topEditorial || [],
        newVentures: newVentures || [],
        newProjects: newProjects || [],
      })

      await resend.emails.send({
        from: 'DSRT <onboarding@resend.dev>',
        to: user.email,
        subject: `Your DSRT Weekly · ${new Date().toLocaleDateString('en', { month: 'short', day: 'numeric' })}`,
        html,
      })

      stats.sent++
      await new Promise((r) => setTimeout(r, 200))
    } catch (err: any) {
      console.error('Email error:', err.message)
      stats.failed++
    }
  }

  return NextResponse.json({ success: true, ...stats })
}

function renderDigestHtml(data: any): string {
  const { userName, appUrl, topPosts, topEditorial, newVentures, newProjects } = data

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>DSRT Weekly</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #f9fafb; margin: 0; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%); color: #fff; padding: 32px; text-align: center;">
      <h1 style="margin: 0; font-size: 28px;">DSRT Weekly</h1>
      <p style="opacity: 0.7; margin-top: 8px;">Hi ${userName}, here is what happened this week</p>
    </div>
    <div style="padding: 32px;">
      ${topEditorial.length ? `
        <div style="margin-bottom: 32px;">
          <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin: 0 0 12px 0;">📰 Top News</h2>
          ${topEditorial.map((p: any) => `
            <div style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
              <a href="${appUrl}/pulse/${p.id}" style="color: #111; text-decoration: none; font-weight: 500;">${p.headline}</a>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">${p.editorial_categories?.name || ''}</p>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${newVentures.length ? `
        <div style="margin-bottom: 32px;">
          <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin: 0 0 12px 0;">🚀 New Ventures</h2>
          ${newVentures.map((v: any) => `
            <div style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
              <a href="${appUrl}/ventures/${v.slug}" style="color: #111; text-decoration: none; font-weight: 500;">${v.name}</a>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">${v.tagline || ''}</p>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div style="text-align: center; margin-top: 32px;">
        <a href="${appUrl}/feed" style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Open DSRT →</a>
      </div>
    </div>
    <div style="padding: 24px; text-align: center; color: #9ca3af; font-size: 12px;">
      DSRT © 2025
    </div>
  </div>
</body>
</html>`
}