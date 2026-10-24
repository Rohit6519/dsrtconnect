import { AdminLoginForm } from '@/components/admin/AdminLoginForm'
import { ShieldAlert } from 'lucide-react'
import { DsrtPanel } from '@/components/dsrt'

export const metadata = {
  title: 'DSRT Admin Login',
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-[#05070D] text-white relative overflow-hidden flex items-center justify-center px-4">
      {/* Formal Admin Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#1e3a5f]/20 blur-[120px] rounded-full" />
      </div>

      <DsrtPanel padding="lg" variant="raised" className="relative z-10 w-full max-w-md shadow-2xl border-white/[0.1]">
        <div className="text-center space-y-3 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1e3a5f] to-[#0f172a] border border-[#2c5282]/50 flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-7 h-7 text-[#93c5fd]" />
          </div>
          <div>
            <h1 className="text-[22px] font-bold tracking-tight">DSRT Admin</h1>
            <p className="text-[12px] font-mono uppercase tracking-wider text-white/40 mt-1.5">
              Restricted Access
            </p>
          </div>
        </div>

        <AdminLoginForm />

        <div className="text-center mt-8 pt-6 border-t border-white/[0.06]">
          <p className="text-[10px] font-mono text-white/30 uppercase tracking-wider leading-relaxed">
            Unauthorized access is strictly prohibited and logged.
          </p>
        </div>
      </DsrtPanel>
    </div>
  )
}