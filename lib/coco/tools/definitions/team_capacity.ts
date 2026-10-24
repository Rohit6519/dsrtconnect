import { createClient } from '@/lib/supabase/server'

// ═══════════════════════════════════════════════════════════════════════════
// TOOL DEFINITION (OpenAI/Groq Function Calling Format)
// ═══════════════════════════════════════════════════════════════════════════

export const teamCapacityToolDef: any = {
  type: 'function',
  function: {
    name: 'analyze_team_capacity',
    description: 'Analyzes the current project team to find who is best suited for a task based on their skills, defined responsibilities, and current objective workload. Use this when the user asks who should do a task or asks about team capacity.',
    parameters: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'The UUID of the project. If not provided explicitly, extract it from the current page context.'
        },
        required_skills: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional. Skills required for the task being asked about.'
        }
      },
      required: ['project_id']
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXECUTOR
// ═══════════════════════════════════════════════════════════════════════════

export async function executeTeamCapacity(args: { project_id: string; required_skills?: string[] }) {
  const supabase = await createClient()

  try {
    // 1. Fetch active members using our Phase 11.1 RPC
    const { data: members, error: rpcErr } = await supabase.rpc('list_project_team_members', {
      p_project_id: args.project_id,
      p_include_removed: false
    })

    if (rpcErr) throw rpcErr
    if (!members || members.length === 0) {
      return JSON.stringify({ error: 'No active team members found in this project.' })
    }

    // 2. Fetch skills from the onboarding table for these members
    const memberIds = members.map((m: any) => m.id)
    const { data: onboardings } = await supabase
      .from('project_team_onboarding')
      .select('member_id, skills_data')
      .in('member_id', memberIds)

    const skillsMap = new Map<string, string[]>()
    onboardings?.forEach(o => {
      const skills = Array.isArray(o.skills_data?.skills) ? o.skills_data.skills : []
      skillsMap.set(o.member_id, skills)
    })

    // 3. Compile a token-efficient JSON graph for the LLM
    const capacityGraph = members.map((m: any) => {
      const activeObj = m.active_objectives_count || 0
      const blockedObj = m.blocked_objectives_count || 0
      
      // Calculate a simplistic availability heuristic
      let capacity_status = 'HIGH'
      if (activeObj > 4) capacity_status = 'OVERLOADED'
      else if (activeObj > 2) capacity_status = 'MEDIUM'

      return {
        member_id: m.id,
        name: m.user?.full_name || m.user?.username || 'Unknown',
        role: m.role || 'Unassigned',
        department: m.department || 'General',
        skills: skillsMap.get(m.id) || [],
        responsibilities: (m.responsibilities || []).map((r: any) => 
          r.is_primary ? `${r.title} (Primary)` : r.title
        ),
        workload: {
          active_tasks: activeObj,
          blocked_tasks: blockedObj,
          availability: capacity_status
        }
      }
    })

    // 4. Return the data to the LLM
    return JSON.stringify({
      context: 'Team capability and workload analysis',
      total_active_members: capacityGraph.length,
      members: capacityGraph,
      instructions_for_ai: 'Based on the workload.availability and skills, suggest 1 or 2 members who are best suited for the task. If someone is OVERLOADED, avoid suggesting them unless their skills are exclusively required.'
    })

  } catch (error: any) {
    console.error('[COCO] Team capacity analysis failed:', error)
    return JSON.stringify({ error: 'Failed to access team database.' })
  }
}