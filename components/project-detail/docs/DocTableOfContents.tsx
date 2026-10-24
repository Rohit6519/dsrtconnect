'use client'

import { useEffect, useState } from 'react'
import { List } from '@phosphor-icons/react'
import { extractTOC } from './DocRenderer'

interface Props {
  content: string
}

export function DocTableOfContents({ content }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const toc = extractTOC(content)

  useEffect(() => {
    if (toc.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
            break
          }
        }
      },
      { rootMargin: '-40% 0px -50% 0px' }
    )
    for (const item of toc) {
      const el = document.getElementById(item.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [toc])

  if (toc.length === 0) return null

  return (
    <div className="sticky top-4">
      <div className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-1">
        <List size={11} /> On this page
      </div>
      <ul className="space-y-1">
        {toc.map(item => (
          <li key={item.id} style={{ paddingLeft: ((item.level - 1) * 10) + 'px' }}>
            <a
              href={'#' + item.id}
              onClick={(e) => {
                e.preventDefault()
                document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                history.replaceState(null, '', '#' + item.id)
              }}
              className={
                'block text-[12px] py-0.5 border-l-2 pl-2.5 -ml-[2px] transition-colors ' +
                (activeId === item.id
                  ? 'text-white border-purple-400 font-semibold'
                  : 'text-white/50 hover:text-white/80 border-transparent hover:border-white/20')
              }
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
