'use client'

interface Props {
  title: string
  subline: string
  onTitleChange: (v: string) => void
  onSublineChange: (v: string) => void
}

export function TitleBlock({ title, subline, onTitleChange, onSublineChange }: Props) {
  return (
    <div className="mb-6">
      <textarea
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Start with a clear opportunity title..."
        rows={1}
        className="w-full bg-transparent text-[42px] font-bold tracking-tight text-white placeholder:text-zinc-700 focus:outline-none resize-none leading-[1.15] overflow-hidden mb-2"
        style={{ minHeight: 52 }}
        onInput={(e) => {
          const el = e.currentTarget
          el.style.height = 'auto'
          el.style.height = el.scrollHeight + 'px'
        }}
      />
      <textarea
        value={subline}
        onChange={(e) => onSublineChange(e.target.value)}
        placeholder="Add a short line that explains why someone should care..."
        rows={1}
        className="w-full bg-transparent text-[18px] text-zinc-400 placeholder:text-zinc-700 focus:outline-none resize-none leading-relaxed overflow-hidden"
        style={{ minHeight: 28 }}
        onInput={(e) => {
          const el = e.currentTarget
          el.style.height = 'auto'
          el.style.height = el.scrollHeight + 'px'
        }}
      />
    </div>
  )
}
