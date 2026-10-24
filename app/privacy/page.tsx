// filepath: app/privacy/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Privacy Policy — DSRT',
  description: 'Privacy Policy for the DSRT platform.',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#05070D] text-white flex flex-col">
      <header className="border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-[15px] font-bold tracking-tight hover:opacity-80">
            DSRT
          </Link>
          <div className="flex items-center gap-4 text-[13px]">
            <Link href="/terms" className="text-white/50 hover:text-white">
              Terms
            </Link>
            <Link
              href="/login"
              className="h-8 px-3.5 rounded-lg bg-white text-black text-[12.5px] font-semibold flex items-center"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="rounded-2xl border border-white/[0.08] bg-[#0A0D14] p-6 sm:p-10">
            <h1 className="text-[28px] sm:text-[32px] font-bold mb-2">Privacy Policy</h1>
            <p className="text-[12px] font-mono text-white/40 uppercase tracking-wider mb-8">
              Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <div className="space-y-6 text-[14px] text-white/70 leading-relaxed">
              <p>
                At DSRT, we build infrastructure for builders, projects, and ventures.
                Your private work remains yours.
              </p>
              <section>
                <h2 className="text-white font-semibold text-[16px] mb-2">1. Information We Collect</h2>
                <p>
                  We collect account details you provide (name, email, auth credentials) and usage data
                  needed to operate the platform.
                </p>
              </section>
              <section>
                <h2 className="text-white font-semibold text-[16px] mb-2">2. Integrations Data</h2>
                <p>
                  Connected integrations only sync activity metadata. We do not read private repo contents
                  or private messages.
                </p>
              </section>
              <section>
                <h2 className="text-white font-semibold text-[16px] mb-2">3. How We Use Information</h2>
                <p>
                  We use data to run matching, recommendations, security, and core product features.
                </p>
              </section>
              <section>
                <h2 className="text-white font-semibold text-[16px] mb-2">4. Encrypted Vault</h2>
                <p>
                  Vault data is encrypted client-side. We cannot recover it without your keys.
                </p>
              </section>
              <p className="pt-6 border-t border-white/[0.08] text-white/50 text-[13px]">
                Privacy: <a href="mailto:privacy@dsrtai.com" className="underline">privacy@dsrtai.com</a>
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/[0.06] py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-white/40">
          <span>© {new Date().getFullYear()} DSRT. All rights reserved.</span>
          <div className="flex gap-5">
            <Link href="/terms" className="hover:text-white/70">Terms</Link>
            <Link href="/privacy" className="hover:text-white/70">Privacy</Link>
            <Link href="/" className="hover:text-white/70">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}