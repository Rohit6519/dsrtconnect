import { DsrtLogo } from '@/components/ui/DsrtLogo'

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-[#050505]">
      <div className="flex flex-col items-center gap-6 animate-pulse">
        <DsrtLogo size={64} showText={false} />
        <p className="text-[11px] font-bold text-white/50 tracking-widest uppercase">
          INITIALIZING...
        </p>
      </div>
    </div>
  )
}