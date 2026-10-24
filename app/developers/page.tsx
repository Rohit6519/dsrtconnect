import { LandingHeader } from '@/components/landing/LandingHeader'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { DsrtPage, DsrtPanel, DsrtGrid } from '@/components/dsrt'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Developers — DSRT',
}

export default function DevelopersPage() {
  return (
    <div className="min-h-screen bg-[#05070D] text-white relative flex flex-col">
      <LandingHeader />

      <main className="flex-1 w-full pt-20 pb-32">
        <DsrtPage width="narrow" className="space-y-16">
          <div className="text-center space-y-4">
            <h1 className="text-[36px] md:text-[48px] font-bold tracking-tight">
              Built for Developers
            </h1>
            <p className="text-[16px] text-white/60 max-w-xl mx-auto leading-relaxed">
              DSRT is being built with a developer-first mindset.
              API access, webhooks, and SDK documentation are shipping soon.
            </p>
          </div>

          <DsrtGrid cols={{ base: 1, sm: 3 }} gap="md">
            <DsrtPanel padding="md">
              <h3 className="font-bold text-white mb-1.5 text-[15px]">REST API</h3>
              <p className="text-[13px] text-white/60 leading-relaxed mb-6">
                Full REST API to interact with your DSRT projects and venture data programmatically.
              </p>
              <p className="text-[10px] text-[#93c5fd] font-mono font-bold uppercase tracking-widest mt-auto">
                Coming Q1 2027
              </p>
            </DsrtPanel>
            <DsrtPanel padding="md">
              <h3 className="font-bold text-white mb-1.5 text-[15px]">Webhooks</h3>
              <p className="text-[13px] text-white/60 leading-relaxed mb-6">
                Get real-time application and network events pushed securely to your endpoint.
              </p>
              <p className="text-[10px] text-[#93c5fd] font-mono font-bold uppercase tracking-widest mt-auto">
                Coming Q1 2027
              </p>
            </DsrtPanel>
            <DsrtPanel padding="md">
              <h3 className="font-bold text-white mb-1.5 text-[15px]">SDKs</h3>
              <p className="text-[13px] text-white/60 leading-relaxed mb-6">
                TypeScript, Python, and Go SDKs for seamless native platform integration.
              </p>
              <p className="text-[10px] text-[#93c5fd] font-mono font-bold uppercase tracking-widest mt-auto">
                Coming Q2 2027
              </p>
            </DsrtPanel>
          </DsrtGrid>
        </DsrtPage>
      </main>

      <LandingFooter />
    </div>
  )
}