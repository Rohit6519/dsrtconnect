'use client'

export function Section({
  title, subtitle, right, children,
}: {
  title: string
  subtitle?: string
  right?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800/80 flex items-center gap-3">
        <div className="min-w-0">
          <h2 className="text-[13px] font-bold text-white">{title}</h2>
          {subtitle && <p className="text-[11.5px] text-zinc-500 mt-0.5">{subtitle}</p>}
        </div>
        {right && <div className="ml-auto">{right}</div>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}