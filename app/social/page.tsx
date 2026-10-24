import { LandingHeader } from '@/components/landing/LandingHeader'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { DsrtPage, DsrtPanel, DsrtGrid } from '@/components/dsrt'
import { ArrowUpRight } from '@phosphor-icons/react/dist/ssr'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Social — DSRT',
}

export default function SocialPage() {
  return (
    <div className="min-h-screen bg-[#05070D] text-white relative flex flex-col">
      <LandingHeader />

      <main className="flex-1 w-full pt-20 pb-32">
        <DsrtPage width="narrow" className="space-y-16">
          <div className="text-center space-y-4">
            <h1 className="text-[40px] md:text-[56px] font-bold tracking-tight leading-tight">
              Follow the
              <br />
              <span className="text-white/40">journey.</span>
            </h1>
          </div>

          <DsrtGrid cols={{ base: 2, sm: 2 }} gap="md">
            {[
              { name: 'Twitter / X', href: 'https://twitter.com/dsrtai' },
              { name: 'LinkedIn', href: 'https://linkedin.com/company/dsrtai' },
              { name: 'GitHub', href: 'https://github.com/dsrtai' },
              { name: 'Discord', href: '#' },
            ].map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group outline-none"
              >
                <DsrtPanel 
                  padding="md" 
                  className="text-center hover:border-white/[0.2] hover:bg-white/[0.04] transition-all flex flex-col items-center justify-center h-full group-focus-visible:ring-2 ring-white/50"
                >
                  <p className="font-semibold text-white group-hover:text-[#93c5fd] transition-colors mb-2">
                    {s.name}
                  </p>
                  <ArrowUpRight size={16} className="text-white/30 group-hover:text-[#93c5fd] transition-colors" />
                </DsrtPanel>
              </a>
            ))}
          </DsrtGrid>
        </DsrtPage>
      </main>

      <LandingFooter />
    </div>
  )
}