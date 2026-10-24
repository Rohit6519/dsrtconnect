'use client'
export function StepChip({ label, tone = 'zinc' }: { label: string; tone?: 'zinc' | 'blue' | 'emerald' | 'red' | 'amber' }) {
  const cls = {
    zinc: 'border-zinc-700 bg-zinc-900 text-zinc-300',
    blue: 'border-blue-500/25 bg-blue-500/10 text-blue-300',
    emerald: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    red: 'border-red-500/25 bg-red-500/10 text-red-300',
    amber: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
  }[tone]
  return <span className={`inline-flex items-center h-5 px-2 rounded-md border ${cls} text-[10.5px] font-bold uppercase tracking-widest`}>{label}</span>
}