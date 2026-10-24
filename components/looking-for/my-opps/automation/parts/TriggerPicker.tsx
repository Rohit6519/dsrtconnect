'use client'
import type { FieldSpec } from '@/lib/automation/RuleRegistry'

export function TriggerPicker({ registry, value, onChange }: any) {
  if (!registry) return <Skeleton />
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 space-y-3">
      <select value={value.key} onChange={(e) => onChange({ key: e.target.value, config: {} })}
        className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[13px] text-white focus:outline-none focus:border-zinc-700">
        {registry.triggers.map((t: any) => (<option key={t.key} value={t.key}>{t.label}</option>))}
      </select>
      <TriggerConfigFields value={value} onChange={onChange} registry={registry} />
    </div>
  )
}

function TriggerConfigFields({ registry, value, onChange }: any) {
  const def = registry.triggers.find((t: any) => t.key === value.key)
  if (!def || !def.supports_filters?.length) return null
  return (
    <div className="grid grid-cols-2 gap-2">
      {def.supports_filters.map((f: string) => (
        <label key={f} className="text-[11.5px] text-zinc-400">
          <div className="mb-1 uppercase tracking-widest text-[10px]">{f}</div>
          <input
            value={Array.isArray(value.config?.[f]) ? value.config[f].join(', ') : ''}
            onChange={(e) => onChange({ ...value, config: { ...value.config, [f]: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } })}
            placeholder="reviewing, screening"
            className="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[13px] text-white focus:outline-none focus:border-zinc-700"
          />
        </label>
      ))}
    </div>
  )
}
function Skeleton() { return <div className="h-10 rounded-lg bg-zinc-900/40 animate-pulse" /> }