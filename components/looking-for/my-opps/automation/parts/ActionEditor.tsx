'use client'
import { ConfigFields } from './ConditionEditor'

export function ActionEditor({ registry, value, onChange }: any) {
  if (!registry) return null
  const def = registry.actions.find((c: any) => c.key === value.key)
  return (
    <div className={
      'rounded-xl border p-4 space-y-3 ' +
      (def?.danger ? 'border-red-500/25 bg-red-500/[0.04]' : 'border-zinc-800 bg-zinc-950/40')
    }>
      <select value={value.key} onChange={(e) => onChange({ ...value, key: e.target.value, config: {} })}
        className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[13px] text-white focus:outline-none focus:border-zinc-700">
        {registry.actions.map((a: any) => (<option key={a.key} value={a.key}>{a.label}</option>))}
      </select>
      {def?.description && <div className="text-[11.5px] text-zinc-500">{def.description}</div>}
      {def && <ConfigFields fields={def.fields} value={value.config} onChange={(cfg: any) => onChange({ ...value, config: cfg })} />}
    </div>
  )
}