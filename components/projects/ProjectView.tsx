'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Github,
  ExternalLink,
  Users,
  CheckSquare,
  FileText,
  UserPlus,
  Folder,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { ProjectBuildLogs } from './ProjectBuildLogs'
import { ProjectTasks } from './ProjectTasks'
import { ProjectFiles } from './ProjectFiles'

interface ProjectViewProps {
  project: any
  members: any[]
  buildLogs: any[]
  tasks: any[]
  isMember: boolean
  isCreator: boolean
  currentUserId?: string
}

export function ProjectView({
  project,
  members,
  buildLogs,
  tasks,
  isMember,
  isCreator,
  currentUserId,
}: ProjectViewProps) {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState<
    'overview' | 'team' | 'logs' | 'tasks' | 'files'
  >('overview')
  const [joining, setJoining] = useState(false)

  const handleJoin = async () => {
    if (!currentUserId) return
    setJoining(true)
    await supabase.from('project_members').insert({
      project_id: project.id,
      user_id: currentUserId,
      role: 'Contributor',
    })
    setJoining(false)
    router.refresh()
  }

  const stageColors: Record<string, string> = {
    idea: 'bg-blue-500/10 text-blue-500',
    building: 'bg-amber-500/10 text-amber-500',
    prototype: 'bg-purple-500/10 text-purple-500',
    shipped: 'bg-emerald-500/10 text-emerald-500',
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm overflow-hidden">
        {project.cover_url && (
          <div className="h-32 md:h-48 bg-muted overflow-hidden">
            <img
              src={project.cover_url}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
                    stageColors[project.stage] || 'bg-muted'
                  }`}
                >
                  {project.stage}
                </span>
                {project.is_hiring && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-rose-500/10 text-rose-500">
                    Hiring
                  </span>
                )}
                {project.is_open && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-500">
                    Open to collaborators
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-bold tracking-tight">
                {project.title}
              </h1>
              {project.tagline && (
                <p className="text-muted-foreground mt-1">{project.tagline}</p>
              )}

              <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                <Link
                  href={`/profile/${project.users?.username}`}
                  className="flex items-center gap-1.5 hover:text-foreground"
                >
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={project.users?.avatar_url} />
                    <AvatarFallback className="text-[10px]">
                      {project.users?.full_name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {project.users?.full_name}
                </Link>
                <span>•</span>
                <span>
                  Started{' '}
                  {project.started_date &&
                    formatDistanceToNow(new Date(project.started_date), {
                      addSuffix: true,
                    })}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              {!isMember && !isCreator && project.is_open && (
                <Button onClick={handleJoin} disabled={joining}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  {joining ? 'Joining...' : 'Join Project'}
                </Button>
              )}
              {isCreator && <Button variant="outline">Edit</Button>}
            </div>
          </div>

          {/* Links */}
          {(project.github_url || project.demo_url) && (
            <div className="flex items-center gap-2">
              {project.github_url && (
                <a
                  href={project.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border/40 hover:bg-muted/40"
                >
                  <Github className="w-3.5 h-3.5" />
                  GitHub
                </a>
              )}
              {project.demo_url && (
                <a
                  href={project.demo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border/40 hover:bg-muted/40"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Live Demo
                </a>
              )}
            </div>
          )}

          {/* Tech stack */}
          {project.tech_stack && project.tech_stack.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {project.tech_stack.map((tech: string) => (
                <span
                  key={tech}
                  className="px-2.5 py-1 text-xs bg-muted/50 rounded-md"
                >
                  {tech}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-1.5">
        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: FileText },
            { id: 'team', label: `Team (${members.length})`, icon: Users },
            { id: 'logs', label: 'Build Logs', icon: FileText },
            { id: 'tasks', label: 'Tasks', icon: CheckSquare },
            { id: 'files', label: 'Files', icon: Folder },
          ].map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id as any)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
                  tab === t.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-6">
          <h2 className="font-semibold mb-3">About this project</h2>
          {project.description ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
              {project.description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No description yet.
            </p>
          )}
        </div>
      )}

      {tab === 'team' && (
        <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-6 space-y-3">
          <h2 className="font-semibold">Team</h2>
          <div className="space-y-3">
            {members.map((m) => (
              <Link
                key={m.id}
                href={`/profile/${m.users?.username}`}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40 transition-colors"
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage src={m.users?.avatar_url} />
                  <AvatarFallback>
                    {m.users?.full_name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{m.users?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{m.role}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {tab === 'logs' && (
        <ProjectBuildLogs
          projectId={project.id}
          logs={buildLogs}
          isMember={isMember}
          currentUserId={currentUserId}
        />
      )}

      {tab === 'tasks' && (
        <ProjectTasks
          projectId={project.id}
          tasks={tasks}
          members={members}
          isMember={isMember}
          currentUserId={currentUserId}
        />
      )}

      {tab === 'files' && (
        <ProjectFiles
          projectId={project.id}
          isMember={isMember}
          currentUserId={currentUserId}
        />
      )}
    </div>
  )
}