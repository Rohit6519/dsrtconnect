'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RichEditorLite } from '../../shared/RichEditorLite'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { CaretDown, CaretUp, PencilSimple, FloppyDisk, Question } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

const SECTIONS = [
  {
    id: 'achievements',
    title: 'Founder Achievements',
    questions: [
      { id: 'q1', label: 'Resourcefulness', prompt: 'Tell us about a time you successfully hacked or worked around a non-computer system to your advantage. What was the constraint, what did you figure out, and what was the outcome?' },
      { id: 'q2', label: 'Biggest Achievement', prompt: 'What is the most impressive thing you have accomplished outside of this startup? Quantify the achievement where possible.' },
      { id: 'q3', label: 'Hardest Problem', prompt: 'What is the hardest problem you have ever solved? Why was it difficult, and what did you personally do to solve it?' },
      { id: 'q4', label: 'Built From Scratch', prompt: 'What is the most impressive thing you have built from scratch? What was your role, how long did it take, and what happened after you built it?' }
    ]
  },
  {
    id: 'execution',
    title: 'Building & Execution',
    questions: [
      { id: 'q5', label: 'Previous Projects', prompt: 'Tell us about the products, software, businesses, websites, apps, hardware, or other projects you have built before. Include URLs or demos where possible.' },
      { id: 'q6', label: 'Real-World Usage', prompt: 'What project you have built has had the greatest real-world usage or impact? How many users, customers, organizations, or people have used it?' },
      { id: 'q7', label: 'Revenue', prompt: 'Have you ever made money from something you built?', isStructured: true, structFields: ['Revenue', 'Customers', 'Time Period', 'What did you build?'] },
      { id: 'q8', label: 'Technical Depth', prompt: 'What is the most technically difficult system you have personally built? Briefly explain the architecture and the hardest technical problem you encountered.' },
      { id: 'q9', label: 'Speed of Execution', prompt: 'Tell us about something significant you built or accomplished unusually quickly. What did you accomplish, how long did it take, and how did you move so quickly?' },
      { id: 'q10', label: 'Self-Learning', prompt: 'Tell us about a difficult skill or subject you taught yourself from scratch. Why did you learn it, how did you learn it, and what did you eventually do with it?' }
    ]
  },
  {
    id: 'character',
    title: 'Character',
    questions: [
      { id: 'q11', label: 'Failure', prompt: 'What is the biggest failure you have experienced while building something? What happened, what was your responsibility, and what changed afterward?' },
      { id: 'q12', label: 'Persistence', prompt: 'Tell us about something you refused to give up on despite repeated setbacks. What ultimately happened?' },
      { id: 'q13', label: 'Unusual Ability', prompt: 'What is something you understand or can do unusually well compared with most people your age? How did you develop that ability?' },
      { id: 'q14', label: 'Initiative', prompt: 'What is the most significant thing you started without anyone asking you to do it? What did you accomplish?' },
      { id: 'q15', label: 'Leadership', prompt: 'What is the largest team, community, organization, or project you have led? How many people were involved, and what did you personally accomplish?' },
      { id: 'q16', label: 'Persuasion', prompt: 'Tell us about a time you convinced talented people to join you, work with you, or support an idea when you had little or no formal authority.' }
    ]
  },
  {
    id: 'recognition',
    title: 'Recognition',
    questions: [
      { id: 'q17', label: 'Competitions & Recognition', prompt: 'List the most significant competitions, hackathons, awards, Olympiads, fellowships, scholarships, or other recognitions you have won.', isStructured: true, structFields: ['Achievement', 'Year', 'Your Role', 'Result/Rank', 'Scale/Participants', 'Verification URL'] },
      { id: 'q18', label: 'Academic / Test Performance', prompt: 'List any unusually strong academic results, standardized test scores, competitive examination results, programming competition rankings, or technical certifications.' },
      { id: 'q19', label: 'Research', prompt: 'Have you published any research papers, patents, technical papers, open-source projects, or other significant intellectual work? Include URLs where possible.' }
    ]
  },
  {
    id: 'entrepreneurship',
    title: 'Entrepreneurship Experience',
    questions: [
      { id: 'q20', label: 'Operating Experience', prompt: 'Have you previously founded, co-founded, or operated a company or business? Describe what you built, your role, customers/users, revenue, funding, and outcome.' },
      { id: 'q21', label: 'Programs', prompt: 'List any accelerators, incubators, entrepreneurship programs, founder communities, hacker houses, startup competitions, or entrepreneurial organizations you have participated in.' },
      { id: 'q22', label: 'Biggest Bet', prompt: 'What is the biggest personal or professional risk you have taken so far? Why did you take it, and what happened?' },
      { id: 'q23', label: 'Unconventional Achievement', prompt: 'What is the most unconventional or unexpected thing you have done that demonstrates your resourcefulness, ambition, or ability to get things done?' }
    ]
  },
  {
    id: 'evidence',
    title: 'Evidence & Founder Fit',
    questions: [
      { id: 'q24', label: 'Evidence', prompt: 'What are the 3–5 strongest pieces of evidence that demonstrate your ability to build exceptional things? Provide links where possible.' },
      { id: 'q25', label: 'Why You?', prompt: 'Why are you unusually well suited to build a company? What experiences, skills, insights, relationships, or achievements give you an advantage over other founders?' }
    ]
  }
]

interface FounderQnAProps {
  initialData: Record<string, any>
  isOwner: boolean
}

export function FounderQnA({ initialData, isOwner }: FounderQnAProps) {
  const [data, setData] = useState<Record<string, any>>(initialData || {})
  const [expandedSection, setExpandedSection] = useState<string | null>(SECTIONS[0].id)
  const [editingQ, setEditingQ] = useState<string | null>(null)

  const totalQuestions = 25
  const answeredCount = Object.keys(data).filter((k) => {
    const val = data[k]
    if (typeof val === 'string') return val.trim().length > 0
    if (typeof val === 'object' && val !== null) {
      return Object.values(val).some((v) => v && String(v).trim().length > 0)
    }
    return false
  }).length
  const pct = Math.round((answeredCount / totalQuestions) * 100)

  const handleSave = async (qId: string, answer: any) => {
    const payload = { [qId]: answer }
    try {
      const res = await fetch('/api/profile/founder-qna', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qna: payload }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setData((cur) => ({ ...cur, ...payload }))
      toast.success('Response saved')
      setEditingQ(null)
    } catch {
      toast.error('Save failed')
    }
  }

  return (
    <div className="mt-8 space-y-8">
      {/* Header & Progress */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
        <div>
          <h2 className="text-[18px] font-bold text-white tracking-tight">Founder Background & Track Record</h2>
          <p className="text-[13px] text-zinc-500 mt-1">Detailed dossier of achievements, problem-solving, and execution.</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="text-[12px] font-bold text-zinc-300">{pct}% Complete</span>
          <div className="w-32 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
            <div className="h-full bg-zinc-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* Sections & Questions */}
      <div className="space-y-10">
        {SECTIONS.map((section) => (
          <div key={section.id} className="space-y-4">
            <h3 className="text-[15px] font-bold text-zinc-100 uppercase tracking-wide border-b border-zinc-800/40 pb-2">
              {section.title}
            </h3>

            <div className="space-y-4">
              {section.questions.map((q) => (
                <QuestionBlock
                  key={q.id}
                  q={q}
                  isOwner={isOwner}
                  answer={data[q.id]}
                  isEditing={editingQ === q.id}
                  onEdit={() => setEditingQ(q.id)}
                  onCancel={() => setEditingQ(null)}
                  onSave={(ans: any) => handleSave(q.id, ans)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Single Question Block ─────────────────────────────────────────────

function stripHtmlFallback(html: string): string {
  if (!html) return ''
  // If we are on the server during SSR, fallback to regex stripping
  if (typeof document === 'undefined') {
    return html.replace(/<[^>]*>?/gm, '').trim()
  }
  // On client, use safe DOM method
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

function QuestionBlock({ q, isOwner, answer, isEditing, onEdit, onCancel, onSave }: any) {
  const [draftHtml, setDraftHtml] = useState(
    typeof answer === 'string' ? answer : answer?.html || '',
  )
  const [draftStruct, setDraftStruct] = useState<Record<string, string>>(
    typeof answer === 'object' && answer !== null ? answer : {},
  )

  // Use the safe stripHtmlFallback function so SSR doesn't crash
  const hasHtmlContent = !!stripHtmlFallback(typeof answer === 'string' ? answer : answer?.html || '')
  const hasStructContent = typeof answer === 'object' && answer !== null && Object.values(answer).some(v => v && String(v).trim().length > 0)
  
  const hasAnswer = hasHtmlContent || hasStructContent

  const save = () => {
    if (q.isStructured) {
      onSave({ ...draftStruct, html: draftHtml })
    } else {
      onSave(draftHtml)
    }
  }

  // If a visitor is looking and there's no answer, hide the block entirely to keep the profile clean
  if (!isOwner && !hasAnswer) return null

  return (
    <div className={cn(
      'p-5 rounded-2xl border transition-colors',
      hasAnswer ? 'bg-zinc-900/20 border-zinc-800/40' : 'bg-transparent border-zinc-800/40 border-dashed'
    )}>
      {/* Prompt Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h4 className="text-[15px] font-bold text-zinc-100 mb-1 flex items-center gap-1.5">
            <Question className="w-4 h-4 text-blue-400" weight="fill" />
            {q.label}
          </h4>
          <p className="text-[13.5px] text-zinc-400 leading-relaxed max-w-3xl mt-1.5">
            {q.prompt}
          </p>
        </div>
        {isOwner && !isEditing && (
          <button
            onClick={onEdit}
            className="text-[12px] font-semibold text-zinc-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-600 bg-zinc-900/50 transition-colors flex-shrink-0"
          >
            <PencilSimple weight="bold" /> {hasAnswer ? 'Edit' : 'Answer'}
          </button>
        )}
      </div>

      {/* Editor State */}
      {isEditing ? (
        <div className="mt-4 space-y-4 bg-zinc-950 p-4 rounded-xl border border-zinc-800 shadow-inner">
          {q.isStructured && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 p-4 bg-zinc-900/60 rounded-xl border border-zinc-800/60">
              {q.structFields.map((f: string) => (
                <div key={f}>
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">{f}</label>
                  <Input
                    value={draftStruct[f] || ''}
                    onChange={(e) => setDraftStruct({ ...draftStruct, [f]: e.target.value })}
                    className="h-9 text-[13px] bg-zinc-950 border-zinc-800 text-zinc-200 placeholder:text-zinc-700"
                    placeholder={`Enter ${f.toLowerCase()}...`}
                  />
                </div>
              ))}
            </div>
          )}
          
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
              {q.isStructured ? 'Additional Context (Optional)' : 'Your Response'}
            </label>
            <RichEditorLite
              value={draftHtml}
              onChange={setDraftHtml}
              minHeight="140px"
              toolbar="standard"
              placeholder="Write your detailed response here..."
              className="bg-zinc-950 border-zinc-800"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onCancel} className="h-8 px-4 text-[12px] border-zinc-700 bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-800">
              Cancel
            </Button>
            <Button size="sm" onClick={save} className="h-8 px-5 text-[12px] bg-white text-black hover:bg-zinc-200 font-bold">
              <FloppyDisk className="mr-1.5 w-3.5 h-3.5" weight="bold" /> Save Response
            </Button>
          </div>
        </div>
      ) : hasAnswer ? (
        <div className="mt-4 pt-4 border-t border-zinc-800/40">
          {/* Structured Fields Display */}
          {q.isStructured && Object.keys(answer || {}).filter((k) => k !== 'html').length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 mb-4 pb-4 border-b border-zinc-800/40">
              {q.structFields.map((f: string) => answer[f] && (
                <div key={f} className="flex flex-col">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-0.5">{f}</span>
                  <span className="text-[14px] text-zinc-200 font-medium">{answer[f]}</span>
                </div>
              ))}
            </div>
          )}
          
          {/* Rich Text Display */}
          {answer?.html || typeof answer === 'string' ? (
            <div
              className={cn(
                'text-[14.5px] text-zinc-300 leading-[1.7]',
                '[&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1',
                '[&_strong]:text-white [&_a]:text-blue-400 hover:[&_a]:underline'
              )}
              dangerouslySetInnerHTML={{ __html: answer.html || answer }}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}