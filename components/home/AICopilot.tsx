'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Send, GitBranch, Bug, FileText, Users, ArrowRight, Zap, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AICopilotProps {
  userName: string
}

const quickActions = [
  { icon: GitBranch, label: 'Generate\nRoadmap', color: 'text-blue-400', bg: 'bg-blue-500/10 hover:bg-blue-500/20', ring: 'hover:ring-blue-500/30' },
  { icon: Bug, label: 'Find & Fix\nBugs', color: 'text-orange-400', bg: 'bg-orange-500/10 hover:bg-orange-500/20', ring: 'hover:ring-orange-500/30' },
  { icon: FileText, label: 'Write\nDocumentation', color: 'text-purple-400', bg: 'bg-purple-500/10 hover:bg-purple-500/20', ring: 'hover:ring-purple-500/30' },
  { icon: Users, label: 'Find\nTeammates', color: 'text-green-400', bg: 'bg-green-500/10 hover:bg-green-500/20', ring: 'hover:ring-green-500/30' },
]

export function AICopilot({ userName }: AICopilotProps) {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const handleSend = async () => {
    if (!input.trim() || sending) return
    setSending(true)

    try {
      const res = await fetch('/api/ai/mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input.trim() }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send')

      // Redirect to mentor page
      router.push(`/mentor?convo=${data.conversationId}`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message')
    } finally {
      setSending(false)
      setInput('')
    }
  }

  const handleQuickAction = (label: string) => {
    const prompts: Record<string, string> = {
      'Generate\nRoadmap': 'Help me create a roadmap for my current project',
      'Find & Fix\nBugs': 'What are common bugs I should watch for in my project?',
      'Write\nDocumentation': 'Help me write documentation for my project',
      'Find\nTeammates': 'What kind of teammates should I look for?',
    }
    setInput(prompts[label] || label)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="bg-card border rounded-2xl p-6 space-y-4 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl -z-0" />
      
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Sparkles className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background animate-pulse" />
            </div>
            <span className="text-[10px] uppercase tracking-[0.15em] font-bold">AI Copilot</span>
          </div>
          <span className="text-[9px] px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded-md font-bold uppercase tracking-wider border border-purple-500/20">
            Beta
          </span>
        </div>

        <div className="mt-4">
          <p className="text-base font-semibold">
            {getGreeting()}, {userName}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            What shall we build today?
          </p>
        </div>

        <div className="mt-3 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything..."
            disabled={sending}
            className="w-full h-11 px-4 pr-11 bg-muted/40 border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/30 transition-all disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-lg flex items-center justify-center hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.label}
                onClick={() => handleQuickAction(action.label)}
                disabled={sending}
                className={cn(
                  'flex flex-col items-center gap-2 p-2.5 rounded-xl transition-all group ring-1 ring-transparent',
                  action.bg,
                  action.ring
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-background/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Icon className={cn('w-4 h-4', action.color)} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] text-center leading-tight whitespace-pre-line font-medium">
                  {action.label}
                </span>
              </button>
            )
          })}
        </div>

        <Link
          href="/mentor"
          className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
        >
          <Zap className="w-3 h-3" />
          Open AI Workspace
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </motion.div>
  )
}