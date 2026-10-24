'use client'

interface Props {
  draft: any
  onUpdate: (patch: any) => void
}

const COMPENSATION_TYPES = [
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'collaboration', label: 'Collaboration' },
  { value: 'volunteer', label: 'Volunteer' },
  { value: 'academic', label: 'Academic' },
  { value: 'portfolio', label: 'Portfolio work' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'fixed-price', label: 'Fixed price' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual salary' },
  { value: 'equity', label: 'Equity only' },
  { value: 'equity-plus-cash', label: 'Equity + cash' },
  { value: 'negotiable', label: 'Negotiable' },
]

export function CompensationBuilder({ draft, onUpdate }: Props) {
  const type = draft?.compensation_type || 'unpaid'
  const showMoneyFields = ['hourly', 'fixed-price', 'monthly', 'annual', 'equity-plus-cash'].includes(type)
  const showEquityFields = ['equity', 'equity-plus-cash'].includes(type)

  return (
    <div className="space-y-2">
      <select
        value={type}
        onChange={(e) => onUpdate({ compensation_type: e.target.value })}
        data-field="compensation_type"
        className="w-full h-9 px-3 rounded-md bg-zinc-950 border border-zinc-800 text-[12.5px] text-zinc-200 focus:outline-none focus:border-zinc-700 cursor-pointer"
      >
        {COMPENSATION_TYPES.map(o => (
          <option key={o.value} value={o.value} className="bg-zinc-950">{o.label}</option>
        ))}
      </select>

      {showMoneyFields && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Min</label>
            <input
              type="number"
              value={draft?.compensation_min || ''}
              onChange={(e) => onUpdate({ compensation_min: e.target.value ? parseFloat(e.target.value) : null })}
              placeholder="0"
              className="w-full h-9 px-3 rounded-md bg-zinc-950 border border-zinc-800 text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Max</label>
            <input
              type="number"
              value={draft?.compensation_max || ''}
              onChange={(e) => onUpdate({ compensation_max: e.target.value ? parseFloat(e.target.value) : null })}
              placeholder="0"
              className="w-full h-9 px-3 rounded-md bg-zinc-950 border border-zinc-800 text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Currency</label>
            <select
              value={draft?.compensation_currency || 'USD'}
              onChange={(e) => onUpdate({ compensation_currency: e.target.value })}
              className="w-full h-9 px-3 rounded-md bg-zinc-950 border border-zinc-800 text-[12px] text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="INR">INR</option>
              <option value="CAD">CAD</option>
              <option value="AUD">AUD</option>
            </select>
          </div>
        </div>
      )}

      {showEquityFields && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Equity min (%)</label>
            <input
              type="number"
              step="0.1"
              value={draft?.equity_min || ''}
              onChange={(e) => onUpdate({ equity_min: e.target.value ? parseFloat(e.target.value) : null })}
              placeholder="0"
              className="w-full h-9 px-3 rounded-md bg-zinc-950 border border-zinc-800 text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Equity max (%)</label>
            <input
              type="number"
              step="0.1"
              value={draft?.equity_max || ''}
              onChange={(e) => onUpdate({ equity_max: e.target.value ? parseFloat(e.target.value) : null })}
              placeholder="0"
              className="w-full h-9 px-3 rounded-md bg-zinc-950 border border-zinc-800 text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
            />
          </div>
        </div>
      )}
    </div>
  )
}