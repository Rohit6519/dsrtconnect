'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Heart, 
  Info, 
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

export function VentureSidebar({ venture, teamMembers, metrics }: any) {
  const health = calculateHealth(venture, teamMembers, metrics)

  return (
    <div className="w-full lg:w-[360px]">
      {/* Venture Health */}
      <div className="bg-card border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-500" weight="fill" />
            <p className="text-xs uppercase tracking-wider font-bold">Venture Health</p>
          </div>
          <button className="text-muted-foreground hover:text-foreground">
            <Info className="w-4 h-4" weight="duotone" />
          </button>
        </div>

        <div className="flex items-center gap-5">
          <HealthRing score={health.total} breakdown={health.breakdown} />
          <div className="flex-1 space-y-2">
            {health.breakdown.map((item: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="w-20 text-muted-foreground truncate">{item.label}</span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: item.strokeColor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${item.value}%` }}
                    transition={{ duration: 1, delay: 0.1 * i }}
                  />
                </div>
                <span className="w-10 text-right font-bold tabular-nums">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {health.total >= 80
              ? 'Excellent'
              : health.total >= 60
              ? 'Good'
              : health.total >= 40
              ? 'Fair'
              : 'Needs Work'}
          </p>
          <button className="text-xs text-blue-500 hover:underline font-medium">
            View Details →
          </button>
        </div>
      </div>
    </div>
  )
}

function HealthRing({
  score,
  breakdown,
}: {
  score: number
  breakdown: any[]
}) {
  const radius = 38
  const strokeWidth = 8
  const circumference = 2 * Math.PI * radius
  const [hoveredSegment, setHoveredSegment] = useState<any>(null)

  // Cap each segment value at 100 before summing so the ring stays proportional
  const capped = breakdown.map((seg) => ({
    ...seg,
    value: Math.min(seg.value, 100),
  }))

  const total = capped.reduce((sum: number, s: any) => sum + s.value, 0) || 1

  let currentAngle = 0
  const segments = capped.map((seg: any) => {
    const segmentLength = (seg.value / total) * circumference
    const rotationDeg = (currentAngle / circumference) * 360
    const data = {
      ...seg,
      dashArray: `${segmentLength} ${circumference}`,
      rotation: rotationDeg,
    }
    currentAngle += segmentLength
    return data
  })

  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      {/* viewBox matches cx/cy/r: cx=48 cy=48 r=38 → fits in 96×96 box with 10px margin */}
      <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
        {/* Background track */}
        <circle
          cx="48"
          cy="48"
          r={radius}
          strokeWidth={strokeWidth}
          className="stroke-muted"
          fill="none"
        />

        {/* Colored segments */}
        {segments.map((seg: any, i: number) => (
          <motion.circle
            key={i}
            cx="48"
            cy="48"
            r={radius}
            strokeWidth={strokeWidth}
            stroke={seg.strokeColor}
            fill="none"
            strokeLinecap="butt"
            strokeDasharray={seg.dashArray}
            initial={{ strokeDasharray: `0 ${circumference}` }}
            animate={{ strokeDasharray: seg.dashArray }}
            transition={{ duration: 1, delay: i * 0.1, ease: 'easeOut' }}
            style={{
              transform: `rotate(${seg.rotation}deg)`,
              transformOrigin: '48px 48px',
              cursor: 'pointer',
              opacity:
                hoveredSegment && hoveredSegment.label !== seg.label ? 0.3 : 1,
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={() => setHoveredSegment(seg)}
            onMouseLeave={() => setHoveredSegment(null)}
          />
        ))}
      </svg>

      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {hoveredSegment ? (
          <>
            <span className="text-sm font-bold leading-none">
              {hoveredSegment.value}%
            </span>
            <span className="text-[8px] text-muted-foreground text-center leading-tight px-1 mt-0.5">
              {hoveredSegment.label}
            </span>
          </>
        ) : (
          <>
            <span className="text-2xl font-bold leading-none">{score}</span>
            <span className="text-[9px] text-muted-foreground mt-0.5">/100</span>
          </>
        )}
      </div>
    </div>
  )
}

function calculateHealth(
  venture: any,
  teamMembers: any[],
  metrics: any[]
) {
  let vision = 0
  let team = 0
  let execution = 0
  let traction = 0
  let potential = 0

  // Vision scoring (max 100)
  if (venture.name) vision += 15
  if (venture.tagline) vision += 15
  if (venture.description) vision += 20
  if (venture.mission) vision += 15
  if (venture.vision) vision += 15
  if (venture.problem && venture.solution) vision += 20

  // Team scoring (max 100)
  team = Math.min(teamMembers.length * 25, 100)

  // Execution scoring (max 100)
  if (venture.business_model) execution += 25
  if (venture.headquarters) execution += 20
  if (
    venture.registration_type &&
    venture.registration_type !== 'not-registered'
  )
    execution += 30
  if (venture.website) execution += 25

  // Traction scoring (max 100)
  traction = Math.min(metrics.length * 20, 100)

  // Potential scoring based on stage (max 100)
  const stageScores: Record<string, number> = {
    idea: 20,
    prototype: 35,
    mvp: 50,
    'early-stage': 65,
    growth: 80,
    scale: 90,
    established: 100,
  }
  potential = stageScores[venture.stage] ?? 30

  const total = Math.round(
    (vision + team + execution + traction + potential) / 5
  )

  return {
    total,
    breakdown: [
      {
        label: 'Vision & Idea',
        value: vision,
        color: 'bg-blue-500',
        strokeColor: '#3b82f6',
      },
      {
        label: 'Team',
        value: team,
        color: 'bg-purple-500',
        strokeColor: '#a855f7',
      },
      {
        label: 'Execution',
        value: execution,
        color: 'bg-green-500',
        strokeColor: '#22c55e',
      },
      {
        label: 'Traction',
        value: traction,
        color: 'bg-yellow-500',
        strokeColor: '#eab308',
      },
      {
        label: 'Potential',
        value: potential,
        color: 'bg-orange-500',
        strokeColor: '#f97316',
      },
    ],
  }
}