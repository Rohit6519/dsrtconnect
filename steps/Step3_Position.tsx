'use client'

import { useState } from 'react'
import { Plus, Users, Briefcase } from '@phosphor-icons/react'

interface Props {
  positions: any[]
  selectedPositionId: string | null
  positionMode: 'existing' | 'new' | null
  newPositionData: any
  onSelectExisting: (positionId: string) => void
  onSelectNew: (data: any) => void
}

export function Step3_Position({
  positions, selectedPositionId, positionMode, newPositionData,
  onSelectExisting, onSelectNew
}: Props) {
  const [mode, setMode] = useState<'existing' | 'new'>(positionMode || 'existing')
  const [newData, setNewData] = useState(newPositionData || {
    title: '',
    positionType: 'employee',
    team_name: '',
    department: '',
    capacity: 1
  })

  const openPositions = positions.filter(p => (p.occupied_count || 0) < (p.capacity || 1))

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[15px] font-bold text-white">What position are they filling?</h3>
        <p className="text-[12.5px] text-zinc-500 mt-1">
          Assign an existing open position or create a new one for this invitation.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setMode('existing')}
          className={
            'p-3 rounded-xl border text-left transition-all ' +
            (mode === 'existing'
              ? 'border-white/20 bg-white/[0.06]'
              : 'border-white/[0.06] bg-[#0d0d10] hover:border-white/[0.12]')
          }
        >
          <Users size={16} className="text-zinc-400 mb-2" />
          <p className="text-[12.5px] font-bold text-white">Existing Position</p>
          <p className="text-[10.5px] text-zinc-500 mt-0.5">
            {openPositions.length} open {openPositions.length === 1 ? 'position' : 'positions'}
          </p>
        </button>

        <button
          onClick={() => setMode('new')}
          className={
            'p-3 rounded-xl border text-left transition-all ' +
            (mode === 'new'
              ? 'border-white/20 bg-white/[0.06]'
              : 'border-white/[0.06] bg-[#0d0d10] hover:border-white/[0.12]')
          }
        >
          <Plus size={16} className="text-zinc-400 mb-2" />
          <p className="text-[12.5px] font-bold text-white">Create New Position</p>
          <p className="text-[10.5px] text-zinc-500 mt-0.5">
            Define a new role in the graph
          </p>
        </button>
      </div>

      {mode === 'existing' && (
        <div>
          {openPositions.length === 0 ? (
            <div className="rounded-xl border border-white/[0.06] bg-[#0d0d10] p-8 text-center">
              <Briefcase size={24} className="text-zinc-600 mx-auto mb-2" />
              <p className="text-[12.5px] text-zinc-400">No open positions available</p>
              <p className="text-[11px] text-zinc-500 mt-1">
                Switch to "Create New Position" to define a new role.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {openPositions.map(p => {
                const remaining = (p.capacity || 1) - (p.occupied_count || 0)
                const selected = selectedPositionId === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => onSelectExisting(p.id)}
                    className={
                      'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ' +
                      (selected
                        ? 'border-white/20 bg-white/[0.06]'
                        : 'border-white/[0.06] bg-[#0d0d10] hover:border-white/[0.12] hover:bg-white/[0.02]')
                    }
                  >
                    <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                      <Briefcase size={14} className="text-zinc-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-white truncate">{p.title}</p>
                      <p className="text-[10.5px] text-zinc-500 truncate mt-0.5">
                        {p.team_name || p.department || 'General'}
                        {p.position_type && ` · ${p.position_type.replace('_', ' ')}`}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[11px] font-bold text-zinc-300">
                        {remaining}/{p.capacity || 1}
                      </p>
                      <p className="text-[9.5px] font-mono uppercase tracking-wider text-zinc-500">
                        open
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {mode === 'new' && (
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-widest text-zinc-500 font-bold mb-1.5">
              Position Title *
            </label>
            <input
              value={newData.title}
              onChange={e => {
                const updated = { ...newData, title: e.target.value }
                setNewData(updated)
                onSelectNew(updated)
              }}
              placeholder="e.g. Senior Product Designer"
              className="w-full h-10 px-3 bg-[#0d0d10] border border-white/[0.06] rounded-lg text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/[0.15]"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-widest text-zinc-500 font-bold mb-1.5">
                Type
              </label>
              <select
                value={newData.positionType}
                onChange={e => {
                  const updated = { ...newData, positionType: e.target.value }
                  setNewData(updated)
                  onSelectNew(updated)
                }}
                className="w-full h-10 px-3 bg-[#0d0d10] border border-white/[0.06] rounded-lg text-[13px] text-white focus:outline-none focus:border-white/[0.15]"
              >
                <option value="founder">Founder</option>
                <option value="executive">Executive</option>
                <option value="employee">Employee</option>
                <option value="contractor">Contractor</option>
                <option value="advisor">Advisor</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-widest text-zinc-500 font-bold mb-1.5">
                Capacity
              </label>
              <input
                type="number"
                min={1}
                value={newData.capacity}
                onChange={e => {
                  const updated = { ...newData, capacity: parseInt(e.target.value) || 1 }
                  setNewData(updated)
                  onSelectNew(updated)
                }}
                className="w-full h-10 px-3 bg-[#0d0d10] border border-white/[0.06] rounded-lg text-[13px] text-white focus:outline-none focus:border-white/[0.15]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-widest text-zinc-500 font-bold mb-1.5">
              Team / Department (optional)
            </label>
            <input
              value={newData.team_name}
              onChange={e => {
                const updated = { ...newData, team_name: e.target.value }
                setNewData(updated)
                onSelectNew(updated)
              }}
              placeholder="e.g. Engineering, Design, Growth"
              className="w-full h-10 px-3 bg-[#0d0d10] border border-white/[0.06] rounded-lg text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/[0.15]"
            />
          </div>
        </div>
      )}
    </div>
  )
}