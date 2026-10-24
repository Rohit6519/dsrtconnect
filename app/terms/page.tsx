// filepath: app/terms/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Terms of Service — DSRT',
  description: 'Terms of Service for the DSRT platform.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#05070D] text-white flex flex-col">
      <header className="border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-[15px] font-bold tracking-tight hover:opacity-80">
            DSRT
          </Link>
          <div className="flex items-center gap-4 text-[13px]">
            <Link href="/privacy" className="text-white/50 hover:text-white">
              Privacy
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
            <h1 className="text-[28px] sm:text-[32px] font-bold mb-2">Terms of Service</h1>
            <p className="text-[12px] font-mono text-white/40 uppercase tracking-wider mb-8">
              Effective Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <div className="space-y-6 text-[14px] text-white/70 leading-relaxed">
              <p>
                By accessing or using the DSRT platform, you agree to be bound by these Terms of Service.
                If you disagree with any part of the terms, you may not access the service.
              </p>
              <section>
                <h2 className="text-white font-semibold text-[16px] mb-2">1. Platform Usage</h2>
                <p>
                  DSRT is an ecosystem designed for professional builders. You agree to use the platform
                  only for lawful purposes and in a way that does not infringe the rights of others.
                </p>
              </section>
              <section>
                <h2 className="text-white font-semibold text-[16px] mb-2">2. User Accounts</h2>
                <p>
                  You are responsible for safeguarding your account authentication, including passwords,
                  PINs, and MFA keys.
                </p>
              </section>
              <section>
                <h2 className="text-white font-semibold text-[16px] mb-2">3. Content and Intellectual Property</h2>
                <p>
                  You retain ownership of your content. By posting public content on DSRT, you grant us a
                  limited license to operate and improve the service.
                </p>
              </section>
              <section>
                <h2 className="text-white font-semibold text-[16px] mb-2">4. Service Limitations</h2>
                <p>
                  We may modify or withdraw parts of the service without notice and are not liable for downtime.
                </p>
              </section>
              <p className="pt-6 border-t border-white/[0.08] text-white/50 text-[13px]">
                Legal: <a href="mailto:legal@dsrtai.com" className="underline">legal@dsrtai.com</a>
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