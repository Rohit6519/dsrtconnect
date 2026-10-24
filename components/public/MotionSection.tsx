import Link from 'next/link'

export function MotionSection() {
  return (
    <section className="relative py-32 px-4">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        <h2
          className="text-5xl md:text-7xl font-bold tracking-tight text-white"
          style={{
            fontFamily: 'monospace',
            textShadow:
              '0 0 20px rgba(52, 211, 153, 0.3), 0 0 40px rgba(52, 211, 153, 0.15)',
          }}
        >
          DSRT IN MOTION
        </h2>

        <div className="space-y-3">
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
            A living builder ecosystem that observes, reasons, and acts —
            continuously.
          </p>
          <p className="text-sm text-emerald-400 font-mono tracking-widest">
            #LETSGOBUILD
          </p>
        </div>

        <div className="pt-4">
          <p className="text-sm text-white/60 mb-4">
            [ Early access to DSRT is open now. ]
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/signup"
              className="px-6 py-3 rounded-full bg-white text-black font-semibold hover:scale-105 transition-transform text-sm"
            >
              Join DSRT →
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 rounded-full border border-white/20 text-white font-semibold hover:bg-white/10 transition-all text-sm"
            >
              Log in
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}