'use client'

import { useState } from 'react'
import { Plus, X, ArrowUp, ArrowDown } from '@phosphor-icons/react'

interface Question {
  question: string
  required?: boolean
  type?: 'text' | 'textarea'
}

interface Props {
  value: Question[]
  onChange: (qs: Question[]) => void
}

export function CustomQuestionsBuilder({ value, onChange }: Props) {
  const [adding, setAdding] = useState(false)
  const [newText, setNewText] = useState('')
  const [newRequired, setNewRequired] = useState(false)

  const addQuestion = () => {
    if (!newText.trim()) return
    onChange([...value, { question: newText.trim(), required: newRequired, type: 'textarea' }])
    setNewText('')
    setNewRequired(false)
    setAdding(false)
  }

  const removeQuestion = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx))
  }

  const move = (idx: number, dir: 'up' | 'down') => {
    const next = [...value]
    const swap = dir === 'up' ? idx - 1 : idx + 1
    if (swap < 0 || swap >= next.length) return
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    onChange(next)
  }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="space-y-1.5">
          {value.map((q, i) => (
            <div
              key={i}
              className="flex items-start gap-2 p-2.5 rounded-md bg-zinc-950 border border-zinc-800"
            >
              <span className="text-[10.5px] font-bold text-zinc-500 mt-0.5 shrink-0">{i + 1}.</span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-zinc-200 leading-relaxed">{q.question}</p>
                {q.required && (
                  <span className="text-[10px] text-blue-400 font-medium">Required</span>
                )}
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={() => move(i, 'up')}
                  disabled={i === 0}
                  className="w-5 h-5 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-200 disabled:opacity-30"
                >
                  <ArrowUp size={9} weight="bold" />
                </button>
                <button
                  onClick={() => move(i, 'down')}
                  disabled={i === value.length - 1}
                  className="w-5 h-5 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-200 disabled:opacity-30"
                >
                  <ArrowDown size={9} weight="bold" />
                </button>
                <button
                  onClick={() => removeQuestion(i)}
                  className="w-5 h-5 rounded flex items-center justify-center text-zinc-500 hover:text-red-400"
                >
                  <X size={9} weight="bold" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <div className="p-2.5 rounded-md bg-zinc-950 border border-zinc-700 space-y-2">
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="e.g. Why are you interested in this opportunity?"
            rows={2}
            autoFocus
            className="w-full px-2.5 py-2 rounded bg-zinc-900 border border-zinc-800 text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 resize-none leading-relaxed"
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={newRequired}
              onChange={(e) => setNewRequired(e.target.checked)}
              className="w-3.5 h-3.5 accent-white"
            />
            <span className="text-[11.5px] text-zinc-300">Required</span>
          </label>
          <div className="flex justify-end gap-1.5">
            <button
              onClick={() => { setAdding(false); setNewText('') }}
              className="h-7 px-2.5 rounded text-[11px] font-medium text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={addQuestion}
              disabled={!newText.trim()}
              className="h-7 px-3 rounded bg-white text-black text-[11px] font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full flex items-center gap-1.5 h-9 px-3 rounded-md border border-dashed border-zinc-800 hover:border-zinc-700 text-[12px] font-medium text-zinc-400 hover:text-white transition-colors"
        >
          <Plus size={11} weight="bold" />
          Add question
        </button>
      )}
    </div>
  )
}