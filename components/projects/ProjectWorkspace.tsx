'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ProjectHeader } from './ProjectHeader'
import { TaskBoard } from './TaskBoard'
import { ProjectSidebar } from './ProjectSidebar'
import { ProjectOverview } from './ProjectOverview'
import { ProjectTeam } from './ProjectTeam'
import { ProjectActivity } from './ProjectActivity'
import { LayoutGrid, ListTodo, Users, Activity, Settings, GitBranch } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePresence } from '@/hooks/usePresence'

interface ProjectWorkspaceProps {
  project: any
  currentUser: any
  currentUserRole: any
  initialTasks: any[]
  members: any[]
  sprints: any[]
  activities: any[]
  repos: any[]
}

const tabs = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'repos', label: 'Repos', icon: GitBranch },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function ProjectWorkspace({
  project,
  currentUser,
  currentUserRole,
  initialTasks,
  members,
  sprints,
  activities,
  repos,
}: ProjectWorkspaceProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [tasks, setTasks] = useState(initialTasks)
  const { onlineUsers } = usePresence(project.id)

  const activeSprint = sprints.find(s => s.status === 'active')

  const isAdmin = currentUserRole?.permissions?.admin === true

  return (
    <div className="min-h-screen bg-background">
      <ProjectHeader
        project={project}
        onlineCount={onlineUsers.length}
        totalMembers={members.length}
        currentUserRole={currentUserRole}
      />

      <div className="border-b sticky top-14 bg-background/95 backdrop-blur z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            if (tab.id === 'settings' && !isAdmin) return null
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.id === 'tasks' && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded-full font-bold">
                    {tasks.length}
                  </span>
                )}
                {tab.id === 'team' && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded-full font-bold">
                    {members.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="flex gap-6">
          <div className="flex-1 min-w-0">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'overview' && (
                <ProjectOverview
                  project={project}
                  tasks={tasks}
                  members={members}
                  activeSprint={activeSprint}
                  activities={activities.slice(0, 5)}
                  repos={repos}
                />
              )}
              {activeTab === 'tasks' && (
                <TaskBoard
                  project={project}
                  tasks={tasks}
                  setTasks={setTasks}
                  members={members}
                  activeSprint={activeSprint}
                  currentUser={currentUser}
                />
              )}
              {activeTab === 'team' && (
                <ProjectTeam
                  project={project}
                  members={members}
                  onlineUsers={onlineUsers}
                  isAdmin={isAdmin}
                  currentUser={currentUser}
                />
              )}
              {activeTab === 'activity' && (
                <ProjectActivity activities={activities} />
              )}
              {activeTab === 'repos' && (
                <div className="bg-card border rounded-2xl p-6">
                  <h2 className="text-lg font-bold mb-4">Linked Repositories</h2>
                  {repos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No repositories linked yet. Connect GitHub and link a repo to track commits automatically.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {repos.map(repo => (
                        <div key={repo.id} className="p-3 border rounded-lg">
                          <a
                            href={repo.repo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium hover:text-primary"
                          >
                            {repo.repo_owner}/{repo.repo_name}
                          </a>
                          <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                            <span>{repo.language}</span>
                            <span>★ {repo.stars}</span>
                            <span>⑂ {repo.forks}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'settings' && isAdmin && (
                <div className="bg-card border rounded-2xl p-6">
                  <h2 className="text-lg font-bold mb-4">Project Settings</h2>
                  <p className="text-sm text-muted-foreground">
                    Settings panel coming in the next phase.
                  </p>
                </div>
              )}
            </motion.div>
          </div>

          <ProjectSidebar
            project={project}
            onlineUsers={onlineUsers}
            members={members}
            activeSprint={activeSprint}
          />
        </div>
      </div>
    </div>
  )
}