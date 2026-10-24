import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify Admin Status
    const { data: profile } = await adminClient
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch System Health View
    const { data: health, error } = await adminClient
      .from('system_health_metrics')
      .select('*')
      .single()

    if (error) throw error

    const status = (health.failed_emails > 10 || health.recent_security_failures > 50) 
      ? 'DEGRADED' 
      : 'HEALTHY'

    return NextResponse.json({
      status,
      timestamp: new Date().toISOString(),
      metrics: health
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch system health', details: err.message }, { status: 500 })
  }
}