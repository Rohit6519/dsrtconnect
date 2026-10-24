'use client'

export function ConditionEditor({ registry, value, onChange }: any) {
  if (!registry) return null
  const def = registry.conditions.find((c: any) => c.key === value.key)
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 space-y-3">
      <select value={value.key} onChange={(e) => onChange({ ...value, key: e.target.value, config: {} })}
        className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[13px] text-white focus:outline-none focus:border-zinc-700">
        {registry.conditions.map((c: any) => (<option key={c.key} value={c.key}>{c.label}</option>))}
      </select>
      {def?.description && <div className="text-[11.5px] text-zinc-500">{def.description}</div>}
      {def && <ConfigFields fields={def.fields} value={value.config} onChange={(cfg: any) => onChange({ ...value, config: cfg })} />}
    </div>
  )
}

export function ConfigFields({ fields, value, onChange }: any) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {fields.map((f: any) => (
        <label key={f.key} className="text-[11.5px] text-zinc-400">
          <div className="mb-1 uppercase tracking-widest text-[10px]">{f.label}{f.required ? ' *' : ''}</div>
          {f.type === 'select' ? (
            <select value={value?.[f.key] || ''} onChange={(e) => onChange({ ...value, [f.key]: e.target.value })}
              className="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[13px] text-white focus:outline-none focus:border-zinc-700">
              <option value="">Select…</option>
              {f.options?.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : f.type === 'boolean' ? (
            <input type="checkbox" checked={!!value?.[f.key]} onChange={(e) => onChange({ ...value, [f.key]: e.target.checked })}
              className="w-4 h-4 accent-white" />
          ) : (
            <input type={f.type === 'number' ? 'number' : 'text'}
              value={value?.[f.key] || ''} onChange={(e) => onChange({ ...value, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value })}
              placeholder={f.placeholder}
              className="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[13px] text-white focus:outline-none focus:border-zinc-700" />
          )}
        </label>
      ))}
    </div>
  )
}