import { chat, quickCompletion, MODELS } from './groq'

/**
 * MENTOR AGENT — Long-form advice
 */
export async function mentorAgent(
  userQuestion: string,
  context: {
    userName?: string
    userRole?: string
    projectContext?: any
    conversationHistory?: { role: 'user' | 'assistant'; content: string }[]
  }
) {
  const systemPrompt = `You are DSRT Mentor, an AI advisor for builders, founders, and teams building real things across every domain.

Your personality:
- Direct, honest, no fluff
- Practical and actionable advice
- You care about execution over ideas
- Speak in short paragraphs, use bullet points sparingly
- Never say "great question" or waste words
- Give specific advice, not generic

${context.userName ? `You are talking to ${context.userName}.` : ''}
${context.userRole ? `They identify as a ${context.userRole}.` : ''}

${context.projectContext ? `
CURRENT PROJECT:
- Project: ${context.projectContext.name}
- Sector: ${context.projectContext.sector}
- Progress: ${context.projectContext.progress}%
- Tasks: ${context.projectContext.tasksCompleted}/${context.projectContext.totalTasks} completed
- Team: ${context.projectContext.teamSize}
${context.projectContext.sprintDaysLeft ? `- Sprint ends in: ${context.projectContext.sprintDaysLeft} days` : ''}
` : ''}

Rules:
1. Reference project context when relevant
2. If unsure, be honest
3. Give recommendations they can act on TODAY
4. Only mention real tools/resources
5. Never make up statistics`

  const messages = [
    ...(context.conversationHistory || []),
    { role: 'user' as const, content: userQuestion }
  ]

  return chat(messages, {
    model: 'BEST_QUALITY',
    systemPrompt,
    temperature: 0.7,
    maxTokens: 800,
  })
}

/**
 * PROJECT INSIGHTS AGENT — Analyzes real project data
 * Returns structured insights that can be stored and displayed
 */
export interface ProjectInsight {
  type: 'risk' | 'opportunity' | 'insight' | 'action' | 'prediction'
  severity: 'critical' | 'warning' | 'info' | 'success'
  category: string
  title: string
  description: string
  confidence: number
  data_points?: Record<string, any>
  action_label?: string
}

export async function projectInsightsAgent(projectData: {
  name: string
  sector: string
  progress: number
  tasksCompleted: number
  totalTasks: number
  overdueTasks: number
  stuckTasks: number
  teamSize: number
  onlineNow: number
  sprintDaysLeft: number
  recentCommits: number
  recentActivity: string[]
  velocity: number  // tasks per day
}): Promise<ProjectInsight[]> {
  const systemPrompt = `You are an AI project analyst for DSRT. Given real project data, generate 2-4 SPECIFIC, ACTIONABLE insights.

Return ONLY valid JSON in this exact format:
{
  "insights": [
    {
      "type": "risk|opportunity|insight|action|prediction",
      "severity": "critical|warning|info|success",
      "category": "sprint|team|quality|velocity|blocker|milestone",
      "title": "Short punchy title (max 60 chars)",
      "description": "2-3 sentences explaining WHY and WHAT to do",
      "confidence": 85,
      "action_label": "Take Action button text"
    }
  ]
}

Rules:
- Be specific: reference actual numbers from data
- Be actionable: every insight has a clear next step
- Be honest: if things are on track, say what to focus on next
- Prioritize: critical issues first, then opportunities
- No pleasantries, no fluff
- Match severity to reality (don't cry wolf)`

  const dataDescription = `
Project: ${projectData.name} (${projectData.sector})
Overall Progress: ${projectData.progress}%
Tasks: ${projectData.tasksCompleted}/${projectData.totalTasks} completed
Overdue tasks: ${projectData.overdueTasks}
Stuck tasks (unchanged 3+ days): ${projectData.stuckTasks}
Team: ${projectData.teamSize} members, ${projectData.onlineNow} online now
Sprint: ${projectData.sprintDaysLeft} days remaining
Velocity: ${projectData.velocity.toFixed(1)} tasks/day
Recent commits: ${projectData.recentCommits} in last 7 days
Recent activity: ${projectData.recentActivity.slice(0, 5).join(' | ')}
`

  try {
    const result = await chat(
      [{ role: 'user', content: `Analyze this project and generate insights:\n${dataDescription}` }],
      {
        model: 'BEST_QUALITY',
        systemPrompt,
        temperature: 0.4,
        maxTokens: 800,
      }
    )

    const cleaned = result.content.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return parsed.insights || []
  } catch (err) {
    console.error('Insights agent error:', err)
    return []
  }
}

/**
 * TASK PARSER — Natural language to structured task
 */
export async function taskParserAgent(input: string) {
  const systemPrompt = `You extract task details from natural language. Return ONLY valid JSON.

Format:
{
  "title": "clean task title",
  "priority": "low" | "medium" | "high",
  "due_date": "YYYY-MM-DD" or null,
  "tags": ["tag1", "tag2"]
}

Rules:
- Parse dates like "friday", "tomorrow", "next week" into actual dates
- Today's date: ${new Date().toISOString().split('T')[0]}
- Default priority: medium
- Extract keywords as tags`

  const result = await quickCompletion(
    `Parse this task: "${input}"\n\nReturn JSON:`,
    { maxTokens: 200 }
  )

  try {
    const cleaned = result.content.replace(/```json\n?|\n?```/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return {
      title: input,
      priority: 'medium',
      due_date: null,
      tags: []
    }
  }
}

/**
 * DAILY BRIEFING AGENT
 */
export async function dailyBriefingAgent(user: { name: string }, data: {
  todaysTasks: number
  overdueTasks: number
  onlineTeammates: number
  recentActivity: string[]
  upcomingDeadlines: string[]
}) {
  const systemPrompt = `You are DSRT's morning briefing AI. Generate a short, energizing briefing.

Rules:
- Maximum 3 sentences
- Direct and motivating
- Reference specific numbers
- End with a clear focus for the day
- No emojis except sparingly for warmth`

  const prompt = `Generate morning briefing for ${user.name}:
- Tasks today: ${data.todaysTasks}
- Overdue: ${data.overdueTasks}
- Teammates online: ${data.onlineTeammates}
- Upcoming: ${data.upcomingDeadlines.slice(0, 2).join(', ')}

Briefing:`

  const result = await chat(
    [{ role: 'user', content: prompt }],
    { model: 'FAST', systemPrompt, temperature: 0.6, maxTokens: 150 }
  )

  return result.content.trim()
}

/**
 * MATCHER AGENT
 */
export async function matcherAgent(currentUser: {
  brings: string[]
  seeking: string[]
  interests: string[]
  skills: string[]
}, candidates: Array<{
  id: string
  name: string
  brings: string[]
  interests: string[]
  skills: string[]
}>) {
  const systemPrompt = `You are a matching AI. Rank top 3 matches based on complementary skills and shared interests.

Return ONLY valid JSON:
{
  "matches": [
    { "id": "candidate_id", "score": 85, "reason": "One sentence why" }
  ]
}`

  const prompt = `User seeks: ${currentUser.seeking.join(', ')}
Brings: ${currentUser.brings.join(', ')}
Interests: ${currentUser.interests.join(', ')}
Skills: ${currentUser.skills.slice(0, 10).join(', ')}

Candidates:
${candidates.slice(0, 20).map(c => `
ID: ${c.id}
Name: ${c.name}
Brings: ${c.brings.join(', ')}
Interests: ${c.interests.join(', ')}
Skills: ${c.skills.slice(0, 5).join(', ')}
`).join('\n')}

JSON:`

  const result = await chat(
    [{ role: 'user', content: prompt }],
    { model: 'BEST_QUALITY', systemPrompt, temperature: 0.4, maxTokens: 500 }
  )

  try {
    const cleaned = result.content.replace(/```json\n?|\n?```/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return { matches: [] }
  }
}