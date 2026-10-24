import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const NEW_STAGES = ['applied', 'submitted', 'pending']
const CONVO_STAGES = ['interviewing', 'offered']
const COMPLETED_STAGES = ['hired']

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: opps } = await supabase
    .from('opportunities')
    .select('id, status')
    .eq('poster_user_id', user.id)

  const list = opps || []
  const activeIds = list.filter((o) => ['active', 'closing-soon'].includes(o.status)).map((o) => o.id)
  const oppIds = list.map((o) => o.id)

  let awaitingReview = 0
  let activeConversations = 0
  let completedOutcomes = 0
  let newApplicationsWindow = 0

  if (oppIds.length > 0) {
    const since = new Date(Date.now() - 30 * 86400000).toISOString()

    const [awaitingRes, recentRes, convoRes, completedRes] = await Promise.all([
      supabase
        .from('opportunity_applications')
        .select('*', { count: 'exact', head: true })
        .in('opportunity_id', oppIds)
        .in('pipeline_stage', NEW_STAGES),
      supabase
        .from('opportunity_applications')
        .select('*', { count: 'exact', head: true })
        .in('opportunity_id', oppIds)
        .gte('created_at', since),
      supabase
        .from('opportunity_applications')
        .select('*', { count: 'exact', head: true })
        .in('opportunity_id', oppIds)
        .in('pipeline_stage', CONVO_STAGES),
      supabase
        .from('opportunity_applications')
        .select('*', { count: 'exact', head: true })
        .in('opportunity_id', oppIds)
        .in('pipeline_stage', COMPLETED_STAGES),
    ])

    awaitingReview = awaitingRes.count || 0
    newApplicationsWindow = recentRes.count || 0
    activeConversations = convoRes.count || 0
    completedOutcomes = completedRes.count || 0
  }

  return NextResponse.json({
    metrics: {
      active_opportunities: activeIds.length,
      new_applications: newApplicationsWindow,
      awaiting_review: awaitingReview,
      active_conversations: activeConversations,
      completed_outcomes: completedOutcomes,
    },
  })
}