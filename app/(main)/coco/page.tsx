import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Sparkle, Brain, MagnifyingGlass, Lightbulb, ArrowRight } from '@phosphor-icons/react/dist/ssr'

export const metadata = {
  title: 'COCO | DSRT Connect',
  description: 'Your intelligent copilot for projects, research, and technical execution.',
}

export const dynamic = 'force-dynamic'

export default async function CocoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-[#09090b] text-white pb-24 font-sans">
      <div className="max-w-[1024px] mx-auto px-4 md:px-6 pt-10">
        <div className="bg-[#121215] border border-white/[0.08] rounded-2xl p-8 md:p-10 mb-8">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-[11px] font-mono text-zinc-300 uppercase tracking-wider font-semibold">
              <Sparkle size={12} className="text-zinc-400" />
              DSRT Intelligence
            </div>

            <h1 className="text-[28px] md:text-[34px] font-bold text-white tracking-tight leading-tight">
              COCO — Command & Co-Pilot
            </h1>

            <p className="text-[14px] text-zinc-400 leading-relaxed">
              COCO helps you plan, research, and execute across your projects and ventures.
              Ask technical questions, analyze project specs, or draft communications seamlessly.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="p-6 bg-[#121215] border border-white/[0.06] rounded-xl space-y-3">
            <Brain size={22} className="text-zinc-400" />
            <h3 className="text-[15px] font-bold text-white">Project Intelligence</h3>
            <p className="text-[12.5px] text-zinc-400 leading-relaxed">
              Analyze architectures, documentation, and domain challenges in your workspace.
            </p>
          </div>

          <div className="p-6 bg-[#121215] border border-white/[0.06] rounded-xl space-y-3">
            <MagnifyingGlass size={22} className="text-zinc-400" />
            <h3 className="text-[15px] font-bold text-white">Research & Knowledge</h3>
            <p className="text-[12.5px] text-zinc-400 leading-relaxed">
              Query the DSRT Technical Library and extract insights for system design.
            </p>
          </div>

          <div className="p-6 bg-[#121215] border border-white/[0.06] rounded-xl space-y-3">
            <Lightbulb size={22} className="text-zinc-400" />
            <h3 className="text-[15px] font-bold text-white">Mail Assistant</h3>
            <p className="text-[12.5px] text-zinc-400 leading-relaxed">
              Draft outreach, collaborator responses, and technical summaries from DSRT Mail.
            </p>
          </div>
        </div>

        <div className="p-6 bg-[#121215] border border-white/[0.06] rounded-xl flex items-center justify-between flex-wrap gap-4">
          <div>
            <h4 className="text-[14px] font-bold text-white">Ready to work?</h4>
            <p className="text-[12.5px] text-zinc-400 mt-0.5">
              Use COCO within your Project Workspace or DSRT Mail.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/projects"
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-white text-black hover:bg-zinc-200 text-[12.5px] font-bold transition-all"
            >
              Open Projects <ArrowRight size={12} weight="bold" />
            </Link>
            <Link
              href="/inbox"
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-white text-[12.5px] font-semibold transition-all"
            >
              Open DSRT Mail
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}