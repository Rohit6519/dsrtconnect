'use client'

import { cn } from '@/lib/utils'

interface MarkdownProps {
  content: string
  className?: string
}

export function Markdown({ content, className }: MarkdownProps) {
  // Split content into blocks
  const blocks = content.split(/\n\n+/)

  return (
    <div className={cn('space-y-3 text-sm leading-relaxed', className)}>
      {blocks.map((block, i) => renderBlock(block, i))}
    </div>
  )
}

function renderBlock(block: string, key: number) {
  const trimmed = block.trim()
  if (!trimmed) return null

  // Headings
  if (trimmed.startsWith('### ')) {
    return (
      <h3 key={key} className="text-base font-bold mt-4">
        {renderInline(trimmed.slice(4))}
      </h3>
    )
  }
  if (trimmed.startsWith('## ')) {
    return (
      <h2 key={key} className="text-lg font-bold mt-4">
        {renderInline(trimmed.slice(3))}
      </h2>
    )
  }
  if (trimmed.startsWith('# ')) {
    return (
      <h1 key={key} className="text-xl font-bold mt-4">
        {renderInline(trimmed.slice(2))}
      </h1>
    )
  }

  // Blockquote
  if (trimmed.startsWith('> ')) {
    return (
      <blockquote
        key={key}
        className="border-l-2 border-primary/40 pl-4 italic text-muted-foreground"
      >
        {renderInline(trimmed.slice(2))}
      </blockquote>
    )
  }

  // Code block
  if (trimmed.startsWith('```')) {
    const code = trimmed.replace(/```\w*\n?/, '').replace(/```$/, '')
    return (
      <pre
        key={key}
        className="bg-muted/60 p-3 rounded-lg overflow-x-auto text-xs font-mono"
      >
        <code>{code}</code>
      </pre>
    )
  }

  // Numbered list
  const numberedItems = trimmed.split('\n').filter((l) => /^\d+\.\s/.test(l))
  if (numberedItems.length > 0 && numberedItems.length === trimmed.split('\n').length) {
    return (
      <ol key={key} className="list-decimal ml-6 space-y-1">
        {numberedItems.map((item, i) => (
          <li key={i}>{renderInline(item.replace(/^\d+\.\s/, ''))}</li>
        ))}
      </ol>
    )
  }

  // Bullet list
  const bulletItems = trimmed.split('\n').filter((l) => /^[-*]\s/.test(l))
  if (bulletItems.length > 0 && bulletItems.length === trimmed.split('\n').length) {
    return (
      <ul key={key} className="list-disc ml-6 space-y-1">
        {bulletItems.map((item, i) => (
          <li key={i}>{renderInline(item.replace(/^[-*]\s/, ''))}</li>
        ))}
      </ul>
    )
  }

  // Regular paragraph — handle line breaks
  return (
    <p key={key} className="leading-relaxed">
      {trimmed.split('\n').map((line, i, arr) => (
        <span key={i}>
          {renderInline(line)}
          {i < arr.length - 1 && <br />}
        </span>
      ))}
    </p>
  )
}

// Render inline formatting: **bold**, *italic*, `code`, [link](url)
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    // Bold **text**
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)$/)
    // Italic *text* or _text_
    const italicMatch = remaining.match(/^(.*?)(?:\*|_)([^*_]+?)(?:\*|_)(.*)$/)
    // Code `text`
    const codeMatch = remaining.match(/^(.*?)`(.+?)`(.*)$/)
    // Link [text](url)
    const linkMatch = remaining.match(/^(.*?)\[(.+?)\]\((.+?)\)(.*)$/)

    const matches = [
      { m: boldMatch, type: 'bold' },
      { m: italicMatch, type: 'italic' },
      { m: codeMatch, type: 'code' },
      { m: linkMatch, type: 'link' },
    ].filter((x) => x.m)

    if (matches.length === 0) {
      parts.push(remaining)
      break
    }

    // Find earliest match
    const earliest = matches.reduce((min, curr) => {
      const currIdx = (curr.m![1] || '').length
      const minIdx = (min.m![1] || '').length
      return currIdx < minIdx ? curr : min
    })

    const match = earliest.m!
    const before = match[1] || ''
    if (before) parts.push(before)

    if (earliest.type === 'bold') {
      parts.push(
        <strong key={key++} className="font-semibold text-foreground">
          {match[2]}
        </strong>
      )
      remaining = match[3] || ''
    } else if (earliest.type === 'italic') {
      parts.push(
        <em key={key++} className="italic">
          {match[2]}
        </em>
      )
      remaining = match[3] || ''
    } else if (earliest.type === 'code') {
      parts.push(
        <code
          key={key++}
          className="bg-muted/60 px-1.5 py-0.5 rounded text-xs font-mono"
        >
          {match[2]}
        </code>
      )
      remaining = match[3] || ''
    } else if (earliest.type === 'link') {
      parts.push(
        <a
          key={key++}
          href={match[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          {match[2]}
        </a>
      )
      remaining = match[4] || ''
    }
  }

  return parts
}