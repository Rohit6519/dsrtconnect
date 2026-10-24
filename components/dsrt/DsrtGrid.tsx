'use client'
import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface DsrtGridProps {
  children: ReactNode
  className?: string
  /** Column counts by breakpoint */
  cols?: {
    base?: 1 | 2
    sm?: 1 | 2 | 3
    md?: 1 | 2 | 3 | 4
    lg?: 1 | 2 | 3 | 4 | 5
    xl?: 1 | 2 | 3 | 4 | 5 | 6
  }
  /** Gap preset */
  gap?: 'sm' | 'md' | 'lg'
}

const gapMap = {
  sm: 'gap-2 sm:gap-3',
  md: 'gap-3 sm:gap-4',
  lg: 'gap-4 sm:gap-5 md:gap-6',
}

const colClass = {
  base: { 1: 'grid-cols-1', 2: 'grid-cols-2' },
  sm: { 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3' },
  md: {
    1: 'md:grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
  },
  lg: {
    1: 'lg:grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
  },
  xl: {
    1: 'xl:grid-cols-1',
    2: 'xl:grid-cols-2',
    3: 'xl:grid-cols-3',
    4: 'xl:grid-cols-4',
    5: 'xl:grid-cols-5',
    6: 'xl:grid-cols-6',
  },
}

/**
 * DSRT Grid — responsive grid with mobile-first column definitions.
 * Default: 1 col mobile → 2 tablet → 3 desktop
 */
export function DsrtGrid({
  children,
  className,
  cols = { base: 1, sm: 2, lg: 3 },
  gap = 'md',
}: DsrtGridProps) {
  const classes = [
    'grid',
    gapMap[gap],
    cols.base && colClass.base[cols.base],
    cols.sm && colClass.sm[cols.sm],
    cols.md && colClass.md[cols.md],
    cols.lg && colClass.lg[cols.lg],
    cols.xl && colClass.xl[cols.xl],
  ]
    .filter(Boolean)
    .join(' ')

  return <div className={cn(classes, className)}>{children}</div>
}