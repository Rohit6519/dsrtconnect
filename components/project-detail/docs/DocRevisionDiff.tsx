'use client'

import { useMemo } from 'react'
import { diffLines } from 'diff'

interface Props {
  oldContent: string
  newContent: string
}

export function DocRevisionDiff({ oldContent, newContent }: Props) {
  const diff = useMemo(() => diffLines(oldContent || '', newContent || ''), [oldContent, newContent])

  return (
    <div className="rounded-lg overflow-hidden border border-white/[0.08] bg-[#0d0d15] font-mono text-[12px] leading-relaxed">
      <div className="max-h-[500px] overflow-y-auto">
        {diff.map((part, i) => {
          const bg = part.added ? 'bg-emerald-500/10 border-l-2 border-emerald-500' :
                     part.removed ? 'bg-red-500/10 border-l-2 border-red-500' :
                     'border-l-2 border-transparent'
          const symbol = part.added ? '+' : part.removed ? '-' : ' '
          const textColor = part.added ? 'text-emerald-200' :
                            part.removed ? 'text-red-200' :
                            'text-white/60'
          const lines = part.value.split('\n')
          const displayLines = lines[lines.length - 1] === '' ? lines.slice(0, -1) : lines

          return (
            <div key={i} className={bg}>
              {displayLines.map((line, idx) => (
                <div key={idx} className={'flex ' + textColor}>
                  <span className="pl-3 pr-2 w-8 flex-shrink-0 text-white/30 select-none">{symbol}</span>
                  <span className="whitespace-pre-wrap break-all pr-3">{line || ' '}</span>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
