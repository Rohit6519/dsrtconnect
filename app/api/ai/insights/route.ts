import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { projectInsightsAgent, ProjectInsight } from '@/lib/ai/agents'
import crypto from 'crypto'

// Hash function for deduplication
function hashInsight(insight: ProjectInsight): string {
  return crypto
    .createHash('md5')
    .update(`${insight.type}-${insight.category}-${insight.title}`)
    .digest('hex')
    .slice(0, 16)
}

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    // Return all recent insights for the user
    const { data: insights } = await supabase
      .from('ai_recommendations')
      .select('*')
      .eq('user_id', user.id)
      .eq('dismissed', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({ insights: insights || [] })
  }

  // Get insights for specific project (from cache)
  const { data: cachedInsights } = await supabase
    .from('ai_recommendations')
    .select('*')
    .eq('user_id', user.id)
    .eq('project_id', projectId)
    .eq('dismissed', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  return NextResponse.json({ insights: cachedInsights || [] })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId, force = false } = await request.json()

  if (!projectId) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
  }

  // Check if we recently generated insights (within 6 hours)
  if (!force) {
    const { data: recent } = await supabase
      .from('ai_recommendations')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
      .limit(1)

    if (recent && recent.length > 0) {
      const { data: insights } = await supabase
        .from('ai_recommendations')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .eq('dismissed', false)
        .order('created_at', { ascending: false })

      return NextResponse.json({ 
        insights: insights || [], 
        cached: true 
      })
    }
  }

  // Gather project data
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  // Get tasks
  const { data: tasks } = await supabase
    .from('project_tasks')
    .select('*')
    .eq('project_id', projectId)

  const now = new Date()
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const overdueTasks = (tasks || []).filter(t => 
    t.due_date && new Date(t.due_date) < now && t.status !== 'done'
  ).length

  const stuckTasks = (tasks || []).filter(t =>
    t.status !== 'done' && new Date(t.created_at) < threeDaysAgo
  ).length

  const completedInLastWeek = (tasks || []).filter(t =>
    t.status === 'done' && t.completed_at && new Date(t.completed_at) > sevenDaysAgo
  ).length

  const velocity = completedInLastWeek / 7

  // Get team size
  const { count: teamSize } = await supabase
    .from('project_roles')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('status', 'active')

  // Get online now
  const { count: onlineNow } = await supabase
    .from('user_presence')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('status', 'online')

  // Get recent activity
  const { data: activities } = await supabase
    .from('activity_events')
    .select('message')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(10)

  // Get recent commits (from GitHub sync)
  const { count: recentCommits } = await supabase
    .from('repo_commits')
    .select('*, tracked_repos!inner(project_id)', { count: 'exact', head: true })
    .eq('tracked_repos.project_id', projectId)
    .gte('committed_at', sevenDaysAgo.toISOString())

  const sprintDaysLeft = project.sprint_end_date
    ? Math.max(0, Math.ceil((new Date(project.sprint_end_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  const projectData = {
    name: project.name,
    sector: project.sector || 'General',
    progress: project.progress_percent || 0,
    tasksCompleted: project.completed_tasks || 0,
    totalTasks: project.total_tasks || 0,
    overdueTasks,
    stuckTasks,
    teamSize: teamSize || 1,
    onlineNow: onlineNow || 0,
    sprintDaysLeft,
    recentCommits: recentCommits || 0,
    recentActivity: (activities || []).map(a => a.message),
    velocity,
  }

  try {
    // Generate insights with Groq
    const insights = await projectInsightsAgent(projectData)

    // Save to database
    const savedInsights = []
    for (const insight of insights) {
      const hash = hashInsight(insight)
      
      const { data: saved, error } = await supabase
        .from('ai_recommendations')
        .upsert({
          user_id: user.id,
          project_id: projectId,
          type: insight.type,
          severity: insight.severity,
          category: insight.category,
          title: insight.title,
          description: insight.description,
          confidence: insight.confidence,
          data_points: insight.data_points || projectData,
          action_label: insight.action_label,
          hash,
          shown: false,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }, {
          onConflict: 'user_id,project_id,hash',
          ignoreDuplicates: false,
        })
        .select()
        .single()

      if (!error && saved) savedInsights.push(saved)
    }

    // Save snapshot for tracking
    await supabase.from('ai_snapshots').insert({
      project_id: projectId,
      user_id: user.id,
      total_tasks: projectData.totalTasks,
      completed_tasks: projectData.tasksCompleted,
      overdue_tasks: overdueTasks,
      stuck_tasks: stuckTasks,
      team_size: projectData.teamSize,
      sprint_progress: projectData.progress,
      days_left: sprintDaysLeft,
      velocity,
      health_score: Math.max(0, Math.min(100, 
        100 - (overdueTasks * 10) - (stuckTasks * 5) + (velocity * 5)
      )),
    })

    return NextResponse.json({ 
      insights: savedInsights,
      cached: false,
    })
  } catch (err: any) {
    console.error('Insights generation error:', err)
    return NextResponse.json({ 
      error: err.message,
      insights: []
    }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { insightId, action } = await request.json()

  const updates: any = {}
  if (action === 'dismiss') updates.dismissed = true
  if (action === 'acknowledge') updates.acknowledged = true

  const { error } = await supabase
    .from('ai_recommendations')
    .update(updates)
    .eq('id', insightId)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}