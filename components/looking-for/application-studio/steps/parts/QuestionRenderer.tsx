'use client'

import { UploadSimple, FileText } from '@phosphor-icons/react'
import { useState } from 'react'

interface Props {
  question: any
  value: any
  onChange: (val: any) => void
}

export function QuestionRenderer({ question, value, onChange }: Props) {
  const type = question.question_type
  const options = question.options || []
  const config = question.configuration || {}

  // 1. Text Inputs
  if (type === 'short_text' || type === 'url' || type === 'project_select' || type === 'venture_select' || type === 'skill_select') {
    let placeholder = 'Type your answer...'
    if (type === 'url') placeholder = 'https://...'
    if (type === 'project_select') placeholder = 'Project name or URL...'
    if (type === 'venture_select') placeholder = 'Venture name or URL...'
    if (type === 'skill_select') placeholder = 'e.g. React, Python, Product Management...'

    return (
      <input
        type={type === 'url' ? 'url' : 'text'}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        maxLength={config.max_length || 250}
        placeholder={config.placeholder || placeholder}
        className="w-full h-11 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-[13.5px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
      />
    )
  }

  // 2. Long Text
  if (type === 'long_text') {
    return (
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        maxLength={config.max_length || 2000}
        placeholder={config.placeholder || 'Type your detailed answer here...'}
        rows={5}
        className="w-full p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-[13.5px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors resize-y leading-relaxed"
      />
    )
  }

  // 3. Numbers & Dates
  if (type === 'number' || type === 'date') {
    return (
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        min={config.min}
        max={config.max}
        className="w-full max-w-sm h-11 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-[13.5px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
      />
    )
  }

  // 4. Single Choice (Radio Cards)
  if (type === 'single_choice') {
    return (
      <div className="space-y-2">
        {options.map((opt: any) => {
          const active = value === opt.value
          return (
            <label
              key={opt.value}
              className={
                'flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ' +
                (active 
                  ? 'border-blue-500/50 bg-blue-500/10' 
                  : 'border-zinc-800/80 bg-zinc-950/40 hover:bg-zinc-900/50 hover:border-zinc-700')
              }
            >
              <div className={'w-4 h-4 rounded-full border flex items-center justify-center ' + (active ? 'border-blue-400' : 'border-zinc-600')}>
                {active && <div className="w-2 h-2 rounded-full bg-blue-400" />}
              </div>
              <span className={'text-[13.5px] font-medium ' + (active ? 'text-blue-100' : 'text-zinc-300')}>
                {opt.label}
              </span>
              <input
                type="radio"
                className="hidden"
                checked={active}
                onChange={() => onChange(opt.value)}
              />
            </label>
          )
        })}
      </div>
    )
  }

  // 5. Multi Choice (Checkbox Cards)
  if (type === 'multi_choice') {
    const currentValues = Array.isArray(value) ? value : []
    const toggle = (val: string) => {
      if (currentValues.includes(val)) {
        onChange(currentValues.filter((v) => v !== val))
      } else {
        onChange([...currentValues, val])
      }
    }

    return (
      <div className="space-y-2">
        {options.map((opt: any) => {
          const active = currentValues.includes(opt.value)
          return (
            <label
              key={opt.value}
              className={
                'flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ' +
                (active 
                  ? 'border-emerald-500/50 bg-emerald-500/10' 
                  : 'border-zinc-800/80 bg-zinc-950/40 hover:bg-zinc-900/50 hover:border-zinc-700')
              }
            >
              <div className={'w-4 h-4 rounded border flex items-center justify-center ' + (active ? 'border-emerald-400 bg-emerald-400' : 'border-zinc-600')}>
                {active && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 4L3.5 6.5L9 1" stroke="#0a0a0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span className={'text-[13.5px] font-medium ' + (active ? 'text-emerald-100' : 'text-zinc-300')}>
                {opt.label}
              </span>
              <input
                type="checkbox"
                className="hidden"
                checked={active}
                onChange={() => toggle(opt.value)}
              />
            </label>
          )
        })}
      </div>
    )
  }

  // 6. Single Checkbox (Yes/No)
  if (type === 'checkbox') {
    const active = !!value
    return (
      <label className="flex items-center gap-3 p-4 rounded-xl border border-zinc-800/80 bg-zinc-950/40 hover:bg-zinc-900/50 cursor-pointer transition-all">
        <div className={'w-5 h-5 rounded border flex items-center justify-center ' + (active ? 'border-blue-400 bg-blue-500' : 'border-zinc-600')}>
          {active && (
            <svg width="12" height="10" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        <span className="text-[13.5px] font-medium text-zinc-200">Yes, I confirm.</span>
        <input
          type="checkbox"
          className="hidden"
          checked={active}
          onChange={(e) => onChange(e.target.checked)}
        />
      </label>
    )
  }

  // 7. File Upload (Mocked safely for Phase 5 to prevent S3 crash)
  if (type === 'file') {
    return (
      <label className="flex items-center gap-4 p-4 rounded-xl border border-dashed border-zinc-700 bg-zinc-950/30 hover:bg-zinc-900/50 cursor-pointer transition-all">
        <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
          {value ? <FileText size={18} className="text-emerald-400" /> : <UploadSimple size={18} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-zinc-200 truncate">
            {value ? value.name || 'File attached' : 'Click to upload file'}
          </div>
          <div className="text-[11px] text-zinc-500">
            {config.accept ? `Accepted: ${config.accept}` : 'PDF, DOCX, JPG, PNG'}
          </div>
        </div>
        <input
          type="file"
          className="hidden"
          accept={config.accept}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              // For now, store filename. Real upload happens in Evidence step.
              onChange({ name: file.name, size: file.size })
            }
          }}
        />
      </label>
    )
  }

  return <div className="text-[12px] text-red-400">Unsupported field type: {type}</div>
}