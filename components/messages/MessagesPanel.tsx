'use client'

import { useRouter } from 'next/navigation'
import { MessageCircle, Sparkles } from 'lucide-react'

interface MessagesPanelProps {
  user: any
}

export function MessagesPanel({ user }: MessagesPanelProps) {
  const router = useRouter()

  return (
    <div className="fixed bottom-4 right-4 lg:right-[336px] z-40 flex flex-col items-end gap-2">
      {/* Mentor quick access */}
      <button
        type="button"
        onClick={() => router.push('/messages?mentor=1')}
        className="group flex items-center gap-2 bg-gradient-to-br from-purple-500 to-pink-500 text-white pl-3 pr-4 py-2 rounded-full shadow-lg hover:scale-105 transition-transform text-sm"
        title="Ask DSRT Mentor"
      >
        <div className="relative">
          <Sparkles className="w-4 h-4" />
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-white animate-pulse" />
        </div>
        <span className="hidden group-hover:inline font-medium">
          Ask Mentor
        </span>
      </button>

      {/* Messages */}
      <button
        type="button"
        onClick={() => router.push('/messages')}
        className="w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
        title="Messages"
      >
        <MessageCircle className="w-5 h-5" />
      </button>
    </div>
  )
}