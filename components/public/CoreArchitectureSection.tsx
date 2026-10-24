export function CoreArchitectureSection() {
  return (
    <section className="relative py-32 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="text-2xl text-emerald-400">|</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
              THE DSRT SYSTEM
            </h2>
            <span className="text-2xl text-emerald-400">|</span>
          </div>
        </div>

        {/* Grid layout with core in center */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Top - Perception */}
          <div className="md:col-start-2 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm p-6">
            <h3 className="font-semibold text-white mb-3">Perception</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              Signals from your profile, projects, network, and DSRT news are
              transformed into structured context — the foundation for every AI
              interaction.
            </p>
          </div>

          {/* Middle - Left, Core, Right */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm p-6">
            <h3 className="font-semibold text-white mb-3">
              Controlled Execution
            </h3>
            <p className="text-sm text-white/60 leading-relaxed">
              Real actions with real consequences. Every recommendation, every
              match, every intro is verified — with your control at every step.
            </p>
          </div>

          <div className="relative">
            <div className="aspect-square rounded-full border-2 border-emerald-400/30 bg-gradient-to-br from-emerald-500/10 to-transparent backdrop-blur-sm flex items-center justify-center">
              <div className="text-center">
                <div className="text-lg font-bold text-white">DSRT</div>
                <div className="text-lg font-bold text-emerald-400">Core</div>
              </div>
            </div>
            {/* Glow */}
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-3xl -z-10" />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm p-6">
            <h3 className="font-semibold text-white mb-3">
              Reasoning & Memory
            </h3>
            <p className="text-sm text-white/60 leading-relaxed">
              Persistent memory of your journey. Every project, connection, and
              conversation feeds context for smarter, more personal advice over
              time.
            </p>
          </div>

          {/* Bottom - Agent Orchestration */}
          <div className="md:col-start-2 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm p-6">
            <h3 className="font-semibold text-white mb-3">
              Agent Orchestration
            </h3>
            <p className="text-sm text-white/60 leading-relaxed">
              Specialized agents work together: DSRT Mentor for advice, Match
              Engine for finding people, Editorial for real-time news, Search
              for discovery — all coordinated with clear roles.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}