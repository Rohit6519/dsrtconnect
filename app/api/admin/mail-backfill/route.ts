import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Basic security: only logged in users can trigger (you can restrict to your ID if you want)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 1. Backfill Users
  const { error: userErr } = await supabase.rpc('execute_sql', {
    sql: `UPDATE users SET dsrt_email = LOWER(TRIM(username)) || '@dsrt.com' WHERE dsrt_email IS NULL AND username IS NOT NULL;`
  })

  // 2. Backfill Ventures
  const { error: ventErr } = await supabase.rpc('execute_sql', {
    sql: `UPDATE ventures SET dsrt_email = LOWER(TRIM(slug)) || '@dsrt.com' WHERE dsrt_email IS NULL AND slug IS NOT NULL;`
  })

  // 3. Backfill Projects
  const { error: projErr } = await supabase.rpc('execute_sql', {
    sql: `UPDATE projects SET dsrt_email = LOWER(TRIM(slug)) || '@dsrt.com' WHERE dsrt_email IS NULL AND slug IS NOT NULL;`
  })

  // Fallback if execute_sql RPC doesn't exist (Supabase prevents raw SQL via REST)
  // We do it via standard PostgREST iteration (slower, but works)
  if (userErr || ventErr || projErr) {
    const { data: users } = await supabase.from('users').select('id, username').is('dsrt_email', null)
    for (const u of users || []) {
      if (u.username) await supabase.from('users').update({ dsrt_email: `${u.username.toLowerCase().trim()}@dsrt.com` }).eq('id', u.id)
    }

    const { data: ventures } = await supabase.from('ventures').select('id, slug').is('dsrt_email', null)
    for (const v of ventures || []) {
      if (v.slug) await supabase.from('ventures').update({ dsrt_email: `${v.slug.toLowerCase().trim()}@dsrt.com` }).eq('id', v.id)
    }

    const { data: projects } = await supabase.from('projects').select('id, slug').is('dsrt_email', null)
    for (const p of projects || []) {
      if (p.slug) await supabase.from('projects').update({ dsrt_email: `${p.slug.toLowerCase().trim()}@dsrt.com` }).eq('id', p.id)
    }
  }

  return NextResponse.json({ success: true, message: 'DSRT Emails backfilled.' })
}