'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { Zap, Users, Award, ArrowRight } from 'lucide-react'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">
                D
              </span>
            </div>
            <span className="font-bold text-lg tracking-tight">DSRT</span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">Join DSRT</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/40 bg-card/40 backdrop-blur-sm text-xs text-muted-foreground mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          A new professional ecosystem for builders
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
          Build what matters.
          <br />
          <span className="text-muted-foreground">Together.</span>
        </h1>

        <p className="mt-8 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          A professional builder ecosystem where students, researchers,
          engineers, founders, and innovators collaborate to turn ideas into
          real-world projects, research, products, and ventures.
        </p>

        <div className="mt-10 flex items-center justify-center gap-3 flex-wrap">
          <Button size="lg" className="gap-2" asChild>
            <Link href="/signup">
              Join the Community
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Explore Projects</Link>
          </Button>
        </div>
      </section>

      {/* Three pillars */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: Users,
              title: 'Build',
              desc: 'Find people with complementary skills across institutions.',
            },
            {
              icon: Zap,
              title: 'Collaborate',
              desc: 'Join projects, research, hackathons, and ventures.',
            },
            {
              icon: Award,
              title: 'Showcase',
              desc: 'Create a professional portfolio of everything you build.',
            },
          ].map((pillar) => {
            const Icon = pillar.icon
            return (
              <div
                key={pillar.title}
                className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-6 space-y-3"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">{pillar.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {pillar.desc}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Live activity */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="rounded-3xl border border-border/40 bg-card/40 backdrop-blur-sm p-8 md:p-12">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Live On DSRT
            </p>
            <h2 className="text-2xl md:text-3xl font-bold mt-2">
              An ecosystem in motion
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {[
              { value: '47', label: 'Active Projects' },
              { value: '12', label: 'Communities' },
              { value: '153', label: 'Builders Online' },
              { value: '18', label: 'Open Roles' },
              { value: '7', label: 'New Build Logs' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold tracking-tight">
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Communities */}
      <section className="max-w-6xl mx-auto px-6 pb-24 text-center">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          Communities On DSRT
        </p>
        <h2 className="text-2xl md:text-3xl font-bold mt-2 mb-8">
          Where builders gather
        </h2>

        <div className="flex flex-wrap justify-center gap-2">
          {[
            'CGEC',
            'IIT Bombay',
            'IIT Kharagpur',
            'NIT Durgapur',
            'BITS Pilani',
            'Jadavpur University',
            'IIT Delhi',
            'IIT Madras',
            'NIT Trichy',
            'DTU',
          ].map((name) => (
            <div
              key={name}
              className="px-4 py-2 rounded-full border border-border/40 bg-card/40 backdrop-blur-sm text-sm"
            >
              {name}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 mt-12">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">
                D
              </span>
            </div>
            <span className="text-sm font-semibold">DSRT</span>
            <span className="text-xs text-muted-foreground ml-2">
              © 2025 — Building the future, together.
            </span>
          </div>

          <p className="text-[10px] text-muted-foreground/40 font-light tracking-wide italic">
            dedicated to my beautiful wife hajra
          </p>
        </div>
      </footer>
    </div>
  )
}