'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCommandPalette } from '@/components/command/CommandPaletteProvider'
import { createClient } from '@/lib/supabase/client'
import {
  Users,
  UserPlus,
  ShieldCheck,
  Kanban,
  Graph,
  Pulse,
  Gear,
  User
} from '@phosphor-icons/react'

export function useTeamCommands(slug: string, projectId: string, isOwner: boolean) {
  const router = useRouter()
  // Cast to any to bypass strict type checking for the custom provider
  const palette = useCommandPalette() as any
  const [members, setMembers] = useState<any[]>([])

  // ─── Fetch team members for the "Jump to" commands ───────────────────
  useEffect(() => {
    let active = true
    const fetchTeam = async () => {
      const supabase = createClient()
      const { data } = await supabase.rpc('list_project_team_members', {
        p_project_id: projectId,
        p_include_removed: false,
      })
      if (active && data) setMembers(data)
    }
    fetchTeam()
    return () => { active = false }
  }, [projectId])

  // ─── Register Commands ───────────────────────────────────────────────
  useEffect(() => {
    const groupId = `team-${projectId}`

    const actions = [
      {
        id: 'team-overview',
        name: 'Team: Overview',
        icon: Users,
        shortcut: ['t', 'o'],
        perform: () => router.push(`/projects/${slug}?tab=team&sub=overview`),
      },
      {
        id: 'team-people',
        name: 'Team: Directory',
        icon: User,
        perform: () => router.push(`/projects/${slug}?tab=team&sub=people`),
      },
      {
        id: 'team-graph',
        name: 'Team: Graph',
        icon: Graph,
        shortcut: ['t', 'g'],
        perform: () => router.push(`/projects/${slug}?tab=team&sub=graph`),
      },
      {
        id: 'team-work',
        name: 'Team: Work Plans',
        icon: Kanban,
        shortcut: ['t', 'w'],
        perform: () => router.push(`/projects/${slug}?tab=team&sub=work-plans`),
      },
    ]

    // Owner-only commands
    if (isOwner) {
      actions.push(
        {
          id: 'team-invite',
          name: 'Team: Invite Member',
          icon: UserPlus,
          shortcut: ['t', 'i'],
          // We route to the invitations tab; the tab handles opening the composer via UI
          perform: () => router.push(`/projects/${slug}?tab=team&sub=invitations`),
        },
        {
          id: 'team-roles',
          name: 'Team: Roles & Access',
          icon: ShieldCheck,
          shortcut: ['t', 'r'],
          perform: () => router.push(`/projects/${slug}?tab=team&sub=roles`),
        },
        {
          id: 'team-activity',
          name: 'Team: Audit Log',
          icon: Pulse,
          perform: () => router.push(`/projects/${slug}?tab=team&sub=activity`),
        },
        {
          id: 'team-settings',
          name: 'Team: Settings',
          icon: Gear,
          perform: () => router.push(`/projects/${slug}?tab=team&sub=settings`),
        }
      )
    }

    // Dynamic Member "Jump to" commands
    const memberActions = members.map(m => ({
      id: `member-${m.id}`,
      name: `Jump to: ${m.user?.full_name || m.user?.username}`,
      icon: User,
      // Open their profile
      perform: () => router.push(`/profile/${m.user?.username || m.user_id}`),
    }))

    // Safely register all to the global palette
    if (palette?.registerGroup) {
      palette.registerGroup(groupId, 'Team Operations', [...actions, ...memberActions])
    }

    return () => {
      if (palette?.unregisterGroup) {
        palette.unregisterGroup(groupId)
      }
    }
  }, [slug, projectId, isOwner, members, router, palette])
}