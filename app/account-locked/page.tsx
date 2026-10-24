import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function AccountLockedPage() {
  return (
    <div className="min-h-screen bg-[#05070D] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] rounded-xl border border-white/[0.08] bg-[#0A0D14] p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-5 text-amber-400 text-xl">
          🔒
        </div>
        <h1 className="text-[20px] font-semibold tracking-tight mb-2">Account Restricted</h1>
        <p className="text-[13px] text-white/50 leading-relaxed mb-6">
          Your account has been restricted or temporarily locked due to a security flag or policy violation.
        </p>
        <div className="space-y-3">
          <a
            href="mailto:security@dsrtai.com?subject=Account%20Restriction%20Appeal"
            className="w-full h-10 rounded-md bg-[#4F7CFF] hover:bg-[#3D6BF5] text-white text-[13px] font-semibold flex items-center justify-center transition-all"
          >
            Contact Security Team
          </a>
          <Link
            href="/login"
            className="w-full h-10 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-white/70 text-[13px] font-medium flex items-center justify-center transition-all"
          >
            Back to Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}