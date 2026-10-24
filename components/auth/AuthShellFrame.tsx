export function AuthShellFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#05070D] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] rounded-xl border border-white/[0.08] bg-[#0A0D14] shadow-2xl p-8">
        {children}
      </div>
    </div>
  )
}