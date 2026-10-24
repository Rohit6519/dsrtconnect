// ============================================================
// components/coco/CocoMarkdown.tsx
// Clean dark-native markdown renderer.
// ============================================================

'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

interface Props {
  content: string
  className?: string
}

export function CocoMarkdown({ content, className }: Props) {
  return (
    <div
      className={cn(
        'text-[14px] leading-[1.6] tracking-tight text-white/90 break-words',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="my-2.5 first:mt-0 last:mb-0 text-white/85">{children}</p>
          ),
          h1: ({ children }) => (
            <h1 className="text-[16px] font-bold text-white tracking-tight mt-4 mb-2 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-[15px] font-bold text-white tracking-tight mt-4 mb-2 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[14px] font-semibold text-white tracking-tight mt-3 mb-1.5 first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-[13.5px] font-semibold text-white/95 mt-3 mb-1 first:mt-0">
              {children}
            </h4>
          ),

          ul: ({ children }) => (
            <ul className="my-2.5 space-y-1.5 pl-4">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2.5 space-y-1.5 pl-6 list-decimal marker:text-white/50 marker:font-semibold">
              {children}
            </ol>
          ),
          li: ({ children, ordered }: any) => (
            <li
              className={cn(
                'text-white/85 leading-relaxed pl-1',
                !ordered &&
                  'relative pl-4 before:content-[""] before:absolute before:left-0 before:top-[10px] before:w-1 before:h-1 before:rounded-full before:bg-white/40'
              )}
            >
              {children}
            </li>
          ),

          strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-white/90">{children}</em>,

          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#93c5fd] hover:text-[#bfdbfe] underline underline-offset-2 decoration-white/20 hover:decoration-[#93c5fd]/60 transition-colors"
            >
              {children}
            </a>
          ),

          code: ({ inline, children, className: cls }: any) => {
            if (inline) {
              return (
                <code className="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/[0.06] text-[12.5px] font-mono text-[#93c5fd]">
                  {children}
                </code>
              )
            }
            return (
              <code className={cn('font-mono text-[12.5px]', cls)}>{children}</code>
            )
          },

          pre: ({ children }) => (
            <pre className="my-3 p-3 rounded-lg bg-black/40 border border-white/[0.06] overflow-x-auto text-[12.5px] font-mono text-white/85 leading-relaxed">
              {children}
            </pre>
          ),

          blockquote: ({ children }) => (
            <blockquote className="my-3 pl-3 border-l-2 border-white/20 text-white/70 italic">
              {children}
            </blockquote>
          ),

          hr: () => <hr className="my-4 border-white/[0.08]" />,

          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-white/[0.06]">
              <table className="w-full text-[12.5px] border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-white/[0.04] border-b border-white/[0.06]">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left font-semibold text-white/85">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-white/75 border-t border-white/[0.04]">
              {children}
            </td>
          ),
        }}
      >
        {content || ''}
      </ReactMarkdown>
    </div>
  )
}