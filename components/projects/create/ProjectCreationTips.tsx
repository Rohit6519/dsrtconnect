'use client'

import React from 'react'
import { Lightbulb, Books } from '@phosphor-icons/react'
import { ProjectStepKey } from '@/stores/projectCreationStore'

interface Props {
  step: ProjectStepKey
  projectType: string
}

export function ProjectCreationTips({ step, projectType }: Props) {
  const getTip = () => {
    switch (step) {
      case 'identity':
        if (projectType === 'research') {
          return {
            title: 'Research Project Title',
            body: 'Use the official hypothesis or topic name. Clear titles help peer reviewers and academic collaborators find your work.',
            knowledge: 'Writing a Research Brief →',
          }
        }
        if (projectType === 'open-source') {
          return {
            title: 'Open Source Naming',
            body: 'Choose a concise, searchable name for your library or tool. Avoid generic terms like "my-utils".',
            knowledge: 'Open Source Playbook →',
          }
        }
        return {
          title: 'Name & Tagline Clarity',
          body: 'Your project name and tagline are the first things builders see on DSRT. Explain WHAT it does before HOW it works.',
          knowledge: 'Writing a Project Brief →',
        }

      case 'definition':
        if (projectType === 'hardware') {
          return {
            title: 'Hardware Problem Statement',
            body: 'Focus on the physical or real-world problem. Mention key constraints like power, size, or cost.',
            knowledge: 'Hardware Documentation Guide →',
          }
        }
        return {
          title: 'The 3 Core Questions',
          body: 'A great description answers: What are you building? Why does it matter? Who is it for?',
          knowledge: 'Defining Project Scope →',
        }

      case 'build':
        return {
          title: 'Public Development',
          body: "You don't need a finished product to publish. Projects can evolve publicly on DSRT from Idea to MVP.",
          knowledge: 'Documenting Tech Stacks →',
        }

      case 'collaboration':
        return {
          title: 'Building a Team',
          body: "A project doesn't need a team to be worth sharing. You can publish solo and invite collaborators later.",
          knowledge: 'Building Project Teams →',
        }

      case 'publish':
        return {
          title: 'Global Discovery',
          body: 'Public projects appear across DSRT Explore and can be matched with builders based on domain and tech stack.',
          knowledge: 'Maximizing Project Reach →',
        }

      default:
        return {
          title: 'Build in Public',
          body: 'Sharing progress early attracts feedback and future collaborators.',
          knowledge: 'DSRT Build Guide →',
        }
    }
  }

  const tip = getTip()

  return (
    <aside className="hidden xl:block w-[280px] shrink-0 pt-16 select-none">
      <div className="bg-[#121215] border border-white/[0.08] rounded-2xl p-5 space-y-4 shadow-sm sticky top-24">
        <div className="flex items-center gap-2 text-zinc-400">
          <Lightbulb size={16} weight="fill" className="text-amber-400" />
          <span className="text-[10px] font-mono uppercase tracking-widest font-bold">
            Project Tip
          </span>
        </div>

        <div>
          <h4 className="text-[14px] font-bold text-white mb-1.5">{tip.title}</h4>
          <p className="text-[12.5px] text-zinc-400 leading-relaxed">{tip.body}</p>
        </div>

        <div className="pt-3 border-t border-white/[0.06]">
          <a
            href="/resources"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11.5px] font-semibold text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Books size={13} />
            {tip.knowledge}
          </a>
        </div>
      </div>
    </aside>
  )
}