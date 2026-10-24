'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, ArrowUp, Loader2 } from 'lucide-react'
import { LogoSphere } from '@/components/shared/LogoSphere'

export function LandingHero() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [asking, setAsking] = useState(false)
  const [response, setResponse] = useState<string | null>(null)

  const handleAsk = async () => {
    if (!query.trim() || asking) return

    setAsking(true)
    setResponse(null)

    try {
      const res = await fetch('/api/mentor/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query }),
      })
      const data = await res.json()
      setResponse(data.reply || 'Something went wrong.')
    } catch {
      setResponse('Please sign in to continue this conversation.')
    }

    setAsking(false)
  }

  const suggestions = [
    'What is DSRT?',
    'How do I find a co-founder?',
    'Is DSRT for me?',
    'What can I build here?',
  ]

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-12">
      {/* 3D Logo Sphere as background element */}
      <div className="absolute inset-0 flex items-center justify-center opacity-40 pointer-events-none">
        <div className="w-full max-w-[800px] h-[800px]">
          <LogoSphere />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
        {/* DSRT Logo Text */}
        <div className="mb-4">
          <h1 className="text-7xl md:text-9xl font-bold tracking-tighter text-white drop-shadow-2xl">
            DSRT
          </h1>
          <p className="mt-4 text-sm md:text-base text-white/60 tracking-widest uppercase">
            Autonomous Intelligence · Real Systems · Built for Builders
          </p>
        </div>

        {/* AI Search Box */}
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="relative group">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 via-blue-500/20 to-cyan-500/20 rounded-2xl blur-xl group-focus-within:blur-2xl opacity-70 group-focus-within:opacity-100 transition-all" />

            <div className="relative flex items-center gap-2 p-2 rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl">
              <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[10px] font-bold text-purple-300 tracking-wider">
                  DSRT MENTOR
                </span>
              </div>

              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAsk()
                }}
                placeholder="Ask DSRT Mentor anything..."
                className="flex-1 bg-transparent px-2 py-2 text-white placeholder:text-white/40 focus:outline-none text-sm md:text-base"
              />

              <button
                type="button"
                onClick={handleAsk}
                disabled={!query.trim() || asking}
                className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-40"
              >
                {asking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowUp className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Suggestions */}
          {!response && (
            <div className="flex flex-wrap gap-2 justify-center pt-1">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setQuery(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Response */}
          {response && (
            <div className="mt-4 p-5 rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl text-left">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-purple-300 tracking-wider">
                  DSRT MENTOR
                </span>
              </div>
              <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                {response}
              </p>
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => router.push('/signup')}
                  className="text-xs px-3 py-1.5 rounded-full bg-white text-black font-semibold hover:scale-105 transition-transform"
                >
                  Sign up to continue →
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResponse(null)
                    setQuery('')
                  }}
                  className="text-xs text-white/50 hover:text-white"
                >
                  Ask another question
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom tagline */}
        <div className="pt-8 space-y-4">
          <p className="text-xl md:text-2xl text-white/80 leading-relaxed max-w-2xl mx-auto">
            An AI-native builder ecosystem where the next generation of
            founders, engineers, and researchers meet.
          </p>

          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.push('/signup')}
              className="px-6 py-3 rounded-full bg-white text-black font-semibold hover:scale-105 transition-transform text-sm"
            >
              Join DSRT
            </button>
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="px-6 py-3 rounded-full border border-white/20 text-white font-semibold hover:bg-white/10 transition-all text-sm"
            >
              Log in
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}