import { Brain, Target, Eye, Boxes, Cog, Settings } from 'lucide-react'

const PRINCIPLES = [
  {
    icon: Brain,
    title: 'Who We Are',
    description:
      'DSRT is an AI-native builder ecosystem where founders, engineers, and designers meet, collaborate, and ship real products together. Not another social network — a system built for building.',
  },
  {
    icon: Target,
    title: 'Our Mission',
    description:
      'To create the professional home for the next generation of builders — from students shipping their first project to founders raising their Series A. We move beyond followers toward ecosystems that produce real work.',
  },
  {
    icon: Eye,
    title: 'Our Vision',
    description:
      'A future where every builder has instant access to co-founders, mentors, capital, and community — regardless of where they went to school. DSRT is that infrastructure.',
  },
  {
    icon: Boxes,
    title: 'What Makes Us Different',
    description:
      'AI-native from day one. Every user gets a personal AI mentor. Real-time news. Real projects. Real ventures. Real ranking based on execution — not vanity metrics.',
  },
  {
    icon: Cog,
    title: 'What We Build',
    description:
      'Tools for building: projects, ventures, journey timelines, community feeds, real-time chat, AI mentorship, courses. Everything a builder needs to go from idea to shipped product.',
  },
  {
    icon: Settings,
    title: 'Our Approach',
    description:
      'A builder-first architecture with real actions, real people, and real outcomes. Not a demo. Not a MVP. A platform designed to be used every day by people who actually build.',
  },
]

export function PrinciplesSection() {
  return (
    <section className="relative py-32 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="text-2xl text-emerald-400">|</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
              OUR PRINCIPLES
            </h2>
            <span className="text-2xl text-emerald-400">|</span>
          </div>
          <p className="text-sm md:text-base text-white/60 max-w-2xl mx-auto">
            DSRT is a builder ecosystem company building tools that think, plan,
            and act — with intent.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRINCIPLES.map((p) => {
            const Icon = p.icon
            return (
              <div
                key={p.title}
                className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm p-6 hover:bg-white/[0.04] hover:border-white/20 transition-all group"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-all">
                    <Icon className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-white">{p.title}</h3>
                </div>
                <p className="text-sm text-white/60 leading-relaxed">
                  {p.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}