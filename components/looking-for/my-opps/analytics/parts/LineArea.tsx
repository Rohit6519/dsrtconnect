'use client'

import { useMemo } from 'react'

type Series = { key: string; label: string; color?: string }

export function LineArea({
  data,
  series,
  height = 220,
}: {
  data: any[]
  series: Series[]
  height?: number
}) {
  const width = 800 // responsive via viewBox

  const flat = useMemo(() => {
    return series.map(s => data.map(d => Number(d[s.key] || 0)))
  }, [data, series])

  const max = useMemo(() => Math.max(1, ...flat.flat()), [flat])

  if (data.length === 0) {
    return <EmptyChart height={height} label="No data in this range yet." />
  }

  const padX = 8
  const padY = 12
  const w = width - padX * 2
  const h = height - padY * 2
  const stepX = data.length > 1 ? w / (data.length - 1) : 0

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none">
        {/* baseline */}
        <line x1={padX} y1={padY + h} x2={padX + w} y2={padY + h} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />

        {series.map((s, idx) => {
          const values = flat[idx]
          const points = values.map((v, i) => {
            const x = padX + i * stepX
            const y = padY + h - (max === 0 ? 0 : (v / max) * h)
            return `${x},${y}`
          })
          const path = points.length
            ? `M ${points.join(' L ')}`
            : ''

          const areaPath = points.length
            ? `${path} L ${padX + (values.length - 1) * stepX},${padY + h} L ${padX},${padY + h} Z`
            : ''

          const stroke = s.color || 'rgba(255,255,255,0.85)'
          const fill = s.color ? `${s.color}22` : 'rgba(255,255,255,0.06)'

          return (
            <g key={s.key}>
              {areaPath && <path d={areaPath} fill={fill} />}
              {path && <path d={path} fill="none" stroke={stroke} strokeWidth={1.5} />}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function EmptyChart({ height, label }: { height: number; label: string }) {
  return (
    <div style={{ height }} className="w-full flex items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/30">
      <span className="text-[12.5px] text-zinc-500">{label}</span>
    </div>
  )
}