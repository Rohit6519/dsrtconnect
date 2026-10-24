import { LandingHeader } from '@/components/landing/LandingHeader'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { DsrtPage, DsrtPanel, DsrtGrid } from '@/components/dsrt'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Company — DSRT',
}

export default function CompanyPage() {
  return (
    <div className="min-h-screen bg-[#05070D] text-white relative flex flex-col">
      <LandingHeader />

      <main className="flex-1 w-full pt-16 pb-32 px-4">
        <DsrtPage width="narrow" className="space-y-16">
          
          <div className="space-y-6">
            <p className="text-[11px] font-mono font-bold tracking-widest text-white/40 uppercase">
              Our Manifesto
            </p>
            <h1 className="text-[40px] md:text-[56px] font-bold tracking-tight leading-tight">
              The company
              <br />
              <span className="text-white/40">behind DSRT.</span>
            </h1>
            <div className="space-y-6 text-[16px] text-white/70 leading-relaxed font-medium mt-8 border-l-2 border-white/20 pl-6">
              <p>
                DSRT was founded on a simple belief: the next generation of great
                companies will come from unlikely places. Not just IIT Bombay or
                Stanford. From CGEC. From NIT Durgapur. From tier-2 towns and
                small colleges.
              </p>
              <p>
                But those builders lack access — to co-founders, to mentors, to
                capital, to community. DSRT is building the infrastructure that
                closes that gap. Powered by AI. Built for real people.
              </p>
            </div>
          </div>

          <DsrtGrid cols={{ base: 1, sm: 2 }} gap="md">
            {[
              { label: 'Founded', value: '2025' },
              { label: 'Headquarters', value: 'India' },
              { label: 'Team', value: 'Building fast' },
              { label: 'Status', value: 'Early access' },
            ].map((s) => (
              <DsrtPanel key={s.label} padding="md" variant="default">
                <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-1">
                  {s.label}
                </p>
                <p className="text-[18px] font-bold text-white">{s.value}</p>
              </DsrtPanel>
            ))}
          </DsrtGrid>

          <DsrtPanel padding="lg" variant="accent" className="border-[#2c5282]/40 bg-[#1e3a5f]/20">
            <h2 className="text-[20px] font-bold text-white mb-2">Get in touch</h2>
            <p className="text-[14px] text-white/70">
              Investor? Partner? Media? Reach out at{' '}
              <a href="mailto:hello@dsrtai.com" className="text-[#93c5fd] font-semibold hover:underline">
                hello@dsrtai.com
              </a>
            </p>
          </DsrtPanel>

        </DsrtPage>
      </main>

      <LandingFooter />
    </div>
  )
}