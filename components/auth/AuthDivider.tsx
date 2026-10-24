// filepath: components/auth/AuthDivider.tsx
export function AuthDivider({ label = 'or' }: { label?: string }) {
  return (
    <div className="flex items-center gap-4 my-6">
      <div className="h-px flex-1 bg-white/[0.06]" />
      <span className="text-[12px] text-white/30 font-medium">{label}</span>
      <div className="h-px flex-1 bg-white/[0.06]" />
    </div>
  )
}