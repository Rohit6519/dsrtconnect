import { DsrtPage, DsrtSection, DsrtPanel } from '@/components/dsrt'
import { ShieldCheck, Lock, Server } from 'lucide-react'

export default function SecurityPage() {
  return (
    <DsrtPage width="narrow" className="space-y-6 py-8 sm:py-12">
      <DsrtSection
        title="Security at DSRT"
        description="Enterprise-grade protection for builders and ventures."
        headerVariant="large"
      />

      <DsrtPanel padding="lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-[#1e3a5f]/40 border border-[#2c5282]/40 text-[#93c5fd] flex items-center justify-center">
            <Lock className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <h2 className="text-[16px] sm:text-[17px] font-bold text-white">Data Encryption</h2>
        </div>
        <p className="text-[13.5px] text-white/70 leading-relaxed">
          All data is encrypted at rest and in transit. We utilize AES-256 encryption for database storage
          and TLS 1.3 for all network communication.
        </p>
      </DsrtPanel>

      <DsrtPanel padding="lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-[#1e3a5f]/40 border border-[#2c5282]/40 text-[#93c5fd] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <h2 className="text-[16px] sm:text-[17px] font-bold text-white">Authentication</h2>
        </div>
        <p className="text-[13.5px] text-white/70 leading-relaxed">
          We employ secure OAuth 2.0 flows, salted password hashing (Argon2), and secure HttpOnly cookie
          session management to ensure account integrity.
        </p>
      </DsrtPanel>

      <DsrtPanel padding="lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-[#1e3a5f]/40 border border-[#2c5282]/40 text-[#93c5fd] flex items-center justify-center">
            <Server className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <h2 className="text-[16px] sm:text-[17px] font-bold text-white">Infrastructure</h2>
        </div>
        <p className="text-[13.5px] text-white/70 leading-relaxed">
          DSRT operates on world-class cloud infrastructure with continuous monitoring, automated backups,
          and strict access controls.
        </p>
      </DsrtPanel>
    </DsrtPage>
  )
}