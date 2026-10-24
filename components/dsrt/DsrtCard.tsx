'use client'
import { cn } from '@/lib/utils'
import { ReactNode, forwardRef } from 'react'

interface DsrtCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** Interactive card — adds hover state + cursor */
  interactive?: boolean
  /** Visual variant */
  variant?: 'default' | 'raised' | 'ghost'
  /** Padding preset */
  padding?: 'none' | 'sm' | 'md' | 'lg'
  as?: keyof JSX.IntrinsicElements
}

const paddingMap = {
  none: '',
  sm: 'p-3',
  md: 'p-3 sm:p-4',
  lg: 'p-4 sm:p-5',
}

const variantMap = {
  default:
    'bg-white/[0.02] border border-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]',
  raised:
    'bg-gradient-to-b from-[#0f172a] to-[#0a0f1a] border border-white/[0.08] shadow-[0_1px_2px_rgba(0,0,0,0.4),0_4px_12px_rgba(0,0,0,0.25)]',
  ghost:
    'bg-transparent border border-transparent',
}

export const DsrtCard = forwardRef<HTMLDivElement, DsrtCardProps>(
  (
    { children, className, interactive, variant = 'default', padding = 'md', as, ...props },
    ref
  ) => {
    const Comp: any = as || 'div'
    return (
      <Comp
        ref={ref}
        className={cn(
          'rounded-xl transition-all',
          variantMap[variant],
          paddingMap[padding],
          interactive &&
            'cursor-pointer hover:bg-white/[0.04] hover:border-white/[0.1] active:scale-[0.995]',
          className
        )}
        {...props}
      >
        {children}
      </Comp>
    )
  }
)
DsrtCard.displayName = 'DsrtCard'