'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check } from '@phosphor-icons/react'

interface Props {
  content: string
}

function CodeBlock({ language, value }: { language: string; value: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="relative group my-4 rounded-lg overflow-hidden border border-white/[0.08]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/[0.03] border-b border-white/[0.06]">
        <span className="text-[11px] font-mono text-white/50 uppercase tracking-wider">{language || 'text'}</span>
        <button
          onClick={copy}
          className="flex items-center gap-1 text-[11px] text-white/60 hover:text-white transition-colors"
        >
          {copied ? <><Check size={11} weight="bold" className="text-emerald-400" /> Copied</> : <><Copy size={11} /> Copy</>}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={vscDarkPlus as any}
        customStyle={{
          margin: 0,
          background: '#0d0d15',
          fontSize: '13px',
          padding: '14px 16px',
          borderRadius: 0,
        }}
        showLineNumbers={value.split('\n').length > 5}
        lineNumberStyle={{ color: '#4a4a5e', fontSize: '11px', minWidth: '2em', paddingRight: '0.8em' }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  )
}

function slugifyHeading(text: string): string {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
}

export function DocRenderer({ content }: Props) {
  return (
    <div className="prose prose-invert prose-sm max-w-none text-[14.5px] text-white/85 leading-relaxed prose-headings:text-white prose-headings:font-bold prose-a:text-purple-300 prose-strong:text-white prose-code:text-purple-200 prose-code:bg-white/[0.06] prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-blockquote:border-l-purple-400 prose-blockquote:text-white/70 prose-blockquote:not-italic prose-hr:border-white/[0.08]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '')
            const value = String(children).replace(/\n$/, '')
            const isInline = !className || !match
            if (isInline) {
              return <code className={className} {...props}>{children}</code>
            }
            return <CodeBlock language={match ? match[1] : ''} value={value} />
          },
          h1({ children }: any) {
            const text = String(children)
            const id = slugifyHeading(text)
            return <h1 id={id} className="scroll-mt-24">{children}</h1>
          },
          h2({ children }: any) {
            const text = String(children)
            const id = slugifyHeading(text)
            return <h2 id={id} className="scroll-mt-24">{children}</h2>
          },
          h3({ children }: any) {
            const text = String(children)
            const id = slugifyHeading(text)
            return <h3 id={id} className="scroll-mt-24">{children}</h3>
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

// Extract table of contents from markdown headings
export function extractTOC(content: string): { id: string; text: string; level: number }[] {
  const lines = (content || '').split('\n')
  const toc: { id: string; text: string; level: number }[] = []
  let inCodeBlock = false
  for (const line of lines) {
    if (line.trim().startsWith('```')) { inCodeBlock = !inCodeBlock; continue }
    if (inCodeBlock) continue
    const m = /^(#{1,3})\s+(.+)$/.exec(line)
    if (m) {
      const level = m[1].length
      const text = m[2].trim()
      toc.push({ id: slugifyHeading(text), text, level })
    }
  }
  return toc
}
