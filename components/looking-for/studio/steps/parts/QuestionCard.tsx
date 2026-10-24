'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowUp,
  ArrowDown,
  Trash,
  Plus,
  X,
  CaretDown,
  CaretUp,
} from '@phosphor-icons/react'
import { QUESTION_TYPE_META, type QuestionType } from './questionTypes'

interface Props {
  question: any
  allQuestions: any[]
  index: number
  total: number
  onUpdatePatch: (patch: Record<string, any>) => Promise<void>
  onUpdateOptions: (options: { label: string; value: string }[]) => Promise<void>
  onMove: (dir: -1 | 1) => Promise<void>
  onRemove: () => Promise<void>
  saving: boolean
}

export function QuestionCard({
  question,
  allQuestions,
  index,
  total,
  onUpdatePatch,
  onUpdateOptions,
  onMove,
  onRemove,
  saving,
}: Props) {
  const type = question.question_type as QuestionType
  const meta = QUESTION_TYPE_META[type]
  const hasOptions = !!meta?.hasOptions

  const [label, setLabel] = useState(question.label || '')
  const [description, setDescription] = useState(question.description || '')
  const [showConfig, setShowConfig] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => setLabel(question.label || ''), [question.label])
  useEffect(
    () => setDescription(question.description || ''),
    [question.description]
  )

  const scheduleTextSave = useCallback(
    (patch: Record<string, any>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        onUpdatePatch(patch)
      }, 600)
    },
    [onUpdatePatch]
  )

  return (
    <div className="relative rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/70 bg-zinc-950/40">
        <div className="flex flex-col gap-1">
          <button
            type="button"
            disabled={saving || index === 0}
            onClick={() => onMove(-1)}
            className="w-6 h-6 rounded border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-white flex items-center justify-center disabled:opacity-40"
            aria-label="Move up"
          >
            <ArrowUp size={10} weight="bold" />
          </button>
          <button
            type="button"
            disabled={saving || index === total - 1}
            onClick={() => onMove(1)}
            className="w-6 h-6 rounded border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-white flex items-center justify-center disabled:opacity-40"
            aria-label="Move down"
          >
            <ArrowDown size={10} weight="bold" />
          </button>
        </div>

        <div className="w-8 h-8 rounded-lg border border-zinc-800 bg-zinc-950 flex items-center justify-center text-zinc-400 shrink-0">
          {meta ? <meta.Icon size={13} /> : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Q{index + 1} · {meta?.label || type}
          </div>
          <div className="text-[12.5px] text-zinc-300 truncate">
            {label || 'Untitled question'}
          </div>
        </div>

        <RequiredToggle
          value={!!question.is_required}
          onChange={(v) => onUpdatePatch({ is_required: v })}
          disabled={saving}
        />

        <button
          type="button"
          onClick={onRemove}
          disabled={saving}
          className="w-8 h-8 rounded-lg border border-red-500/25 text-red-300 hover:bg-red-500/10 flex items-center justify-center"
          aria-label="Delete"
        >
          <Trash size={12} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <label className="block text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
            Question
          </label>
          <input
            value={label}
            onChange={(e) => {
              const v = e.target.value.slice(0, 200)
              setLabel(v)
              scheduleTextSave({ label: v })
            }}
            placeholder="e.g. Why are you interested in this opportunity?"
            className="w-full h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
          />
        </div>

        <div>
          <label className="block text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
            Helper text (optional)
          </label>
          <input
            value={description}
            onChange={(e) => {
              const v = e.target.value.slice(0, 240)
              setDescription(v)
              scheduleTextSave({ description: v || null })
            }}
            placeholder="Guidance shown below the question"
            className="w-full h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
          />
        </div>

        {hasOptions && (
          <OptionsEditor
            initial={question.options || []}
            onSave={onUpdateOptions}
            disabled={saving}
          />
        )}

        <div>
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-zinc-400 hover:text-white"
          >
            Advanced
            {showConfig ? (
              <CaretUp size={10} weight="bold" />
            ) : (
              <CaretDown size={10} weight="bold" />
            )}
          </button>

          {showConfig && (
            <div className="mt-3 space-y-4">
              <TypeSpecificConfig
                type={type}
                configuration={question.configuration || {}}
                onChange={(c) => onUpdatePatch({ configuration: c })}
                disabled={saving}
              />
              <ConditionalLogicEditor
                current={question.conditions || null}
                otherQuestions={allQuestions.filter(
                  (q: any) => q.id !== question.id
                )}
                onChange={(c) => onUpdatePatch({ conditions: c })}
                disabled={saving}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function RequiredToggle({
  value,
  onChange,
  disabled,
}: {
  value: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <span
        className={
          'text-[11px] font-semibold ' +
          (value ? 'text-blue-300' : 'text-zinc-500')
        }
      >
        Required
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={
          'relative w-8 h-4 rounded-full transition-colors ' +
          (value ? 'bg-blue-500' : 'bg-zinc-800')
        }
      >
        <span
          className={
            'absolute top-0.5 w-3 h-3 rounded-full transition-all ' +
            (value ? 'left-4 bg-white' : 'left-0.5 bg-zinc-500')
          }
        />
      </button>
    </label>
  )
}

function OptionsEditor({
  initial,
  onSave,
  disabled,
}: {
  initial: any[]
  onSave: (opts: { label: string; value: string }[]) => Promise<void>
  disabled?: boolean
}) {
  const [opts, setOpts] = useState<{ label: string; value: string }[]>(
    (initial || [])
      .slice()
      .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
      .map((o: any) => ({ label: o.label, value: o.value }))
  )
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setOpts(
      (initial || [])
        .slice()
        .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
        .map((o: any) => ({ label: o.label, value: o.value }))
    )
  }, [initial])

  const scheduleSave = (next: { label: string; value: string }[]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onSave(next.filter((o) => o.label.trim()))
    }, 600)
  }

  const update = (i: number, label: string) => {
    const next = opts.map((o, idx) =>
      idx === i
        ? {
            label,
            value: label.toLowerCase().trim().replace(/\s+/g, '_'),
          }
        : o
    )
    setOpts(next)
    scheduleSave(next)
  }

  const remove = (i: number) => {
    const next = opts.filter((_, idx) => idx !== i)
    setOpts(next)
    scheduleSave(next)
  }

  const add = () => {
    setOpts((prev) => [...prev, { label: '', value: '' }])
  }

  return (
    <div>
      <label className="block text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
        Options
      </label>
      <div className="space-y-2">
        {opts.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={o.label}
              onChange={(e) => update(i, e.target.value.slice(0, 120))}
              placeholder={`Option ${i + 1}`}
              disabled={disabled}
              className="flex-1 h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[12.5px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              disabled={disabled || opts.length <= 1}
              className="w-8 h-8 rounded-lg border border-zinc-800 text-zinc-500 hover:text-red-300 hover:border-red-500/30 flex items-center justify-center disabled:opacity-40"
            >
              <X size={11} weight="bold" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        disabled={disabled}
        className="mt-2 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-zinc-800 hover:border-zinc-600 text-[12px] font-semibold text-zinc-300 hover:text-white"
      >
        <Plus size={11} weight="bold" />
        Add option
      </button>
    </div>
  )
}

function TypeSpecificConfig({
  type,
  configuration,
  onChange,
  disabled,
}: {
  type: QuestionType
  configuration: any
  onChange: (c: any) => void
  disabled?: boolean
}) {
  const cfg = configuration || {}

  if (type === 'short_text' || type === 'long_text') {
    return (
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Max length"
          value={cfg.max_length ?? (type === 'short_text' ? 200 : 2000)}
          onChange={(v) => onChange({ ...cfg, max_length: v })}
          disabled={disabled}
        />
        <TextField
          label="Placeholder"
          value={cfg.placeholder || ''}
          onChange={(v) => onChange({ ...cfg, placeholder: v })}
          disabled={disabled}
        />
      </div>
    )
  }

  if (type === 'number') {
    return (
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Min"
          value={cfg.min ?? ''}
          onChange={(v) => onChange({ ...cfg, min: v })}
          disabled={disabled}
          allowEmpty
        />
        <NumberField
          label="Max"
          value={cfg.max ?? ''}
          onChange={(v) => onChange({ ...cfg, max: v })}
          disabled={disabled}
          allowEmpty
        />
      </div>
    )
  }

  if (type === 'file') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <TextField
          label="Accepted types"
          value={cfg.accept || '.pdf,.doc,.docx,image/*'}
          onChange={(v) => onChange({ ...cfg, accept: v })}
          disabled={disabled}
        />
        <NumberField
          label="Max size (MB)"
          value={cfg.max_mb ?? 10}
          onChange={(v) => onChange({ ...cfg, max_mb: v })}
          disabled={disabled}
        />
      </div>
    )
  }

  if (type === 'url') {
    return (
      <TextField
        label="Placeholder"
        value={cfg.placeholder || 'https://'}
        onChange={(v) => onChange({ ...cfg, placeholder: v })}
        disabled={disabled}
      />
    )
  }

  return (
    <p className="text-[11.5px] text-zinc-500">
      No extra configuration for this question type.
    </p>
  )
}

function ConditionalLogicEditor({
  current,
  otherQuestions,
  onChange,
  disabled,
}: {
  current: any
  otherQuestions: any[]
  onChange: (c: any) => void
  disabled?: boolean
}) {
  const enabled = !!current?.show_if?.question_id
  const qId = current?.show_if?.question_id || ''
  const op = current?.show_if?.operator || 'equals'
  const val = current?.show_if?.value || ''

  const selectedQ = otherQuestions.find((q) => q.id === qId)
  const options = (selectedQ?.options || []) as any[]

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
          Conditional visibility
        </div>
        <button
          type="button"
          disabled={disabled || otherQuestions.length === 0}
          onClick={() => {
            if (enabled) onChange(null)
            else {
              const first = otherQuestions[0]
              onChange({
                show_if: {
                  question_id: first?.id || '',
                  operator: 'equals',
                  value: first?.options?.[0]?.value || 'yes',
                },
              })
            }
          }}
          className={
            'relative w-8 h-4 rounded-full transition-colors ' +
            (enabled ? 'bg-white' : 'bg-zinc-800')
          }
        >
          <span
            className={
              'absolute top-0.5 w-3 h-3 rounded-full transition-all ' +
              (enabled ? 'left-4 bg-black' : 'left-0.5 bg-zinc-500')
            }
          />
        </button>
      </div>

      {!enabled ? (
        <p className="text-[11.5px] text-zinc-500">
          Show this question only when another answer matches a condition.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <select
            value={qId}
            disabled={disabled}
            onChange={(e) =>
              onChange({
                show_if: {
                  question_id: e.target.value,
                  operator: op,
                  value: val,
                },
              })
            }
            className="h-9 px-2 rounded-lg bg-zinc-950 border border-zinc-800 text-[12px] text-zinc-200"
          >
            {otherQuestions.map((q) => (
              <option key={q.id} value={q.id}>
                {q.label || 'Untitled'}
              </option>
            ))}
          </select>

          <select
            value={op}
            disabled={disabled}
            onChange={(e) =>
              onChange({
                show_if: {
                  question_id: qId,
                  operator: e.target.value,
                  value: val,
                },
              })
            }
            className="h-9 px-2 rounded-lg bg-zinc-950 border border-zinc-800 text-[12px] text-zinc-200"
          >
            <option value="equals">equals</option>
            <option value="not_equals">does not equal</option>
            <option value="contains">contains</option>
          </select>

          {options.length > 0 ? (
            <select
              value={val}
              disabled={disabled}
              onChange={(e) =>
                onChange({
                  show_if: {
                    question_id: qId,
                    operator: op,
                    value: e.target.value,
                  },
                })
              }
              className="h-9 px-2 rounded-lg bg-zinc-950 border border-zinc-800 text-[12px] text-zinc-200"
            >
              {options.map((o) => (
                <option key={o.id || o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={val}
              disabled={disabled}
              onChange={(e) =>
                onChange({
                  show_if: {
                    question_id: qId,
                    operator: op,
                    value: e.target.value,
                  },
                })
              }
              placeholder="Value"
              className="h-9 px-2 rounded-lg bg-zinc-950 border border-zinc-800 text-[12px] text-zinc-200"
            />
          )}
        </div>
      )}
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <div>
      <div className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
        {label}
      </div>
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[12.5px] text-zinc-200 focus:outline-none focus:border-zinc-600"
      />
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
  disabled,
  allowEmpty,
}: {
  label: string
  value: number | ''
  onChange: (v: number | null) => void
  disabled?: boolean
  allowEmpty?: boolean
}) {
  return (
    <div>
      <div className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
        {label}
      </div>
      <input
        type="number"
        value={value}
        disabled={disabled}
        onChange={(e) => {
          if (allowEmpty && e.target.value === '') onChange(null)
          else onChange(Number(e.target.value))
        }}
        className="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[12.5px] text-zinc-200 focus:outline-none focus:border-zinc-600"
      />
    </div>
  )
}