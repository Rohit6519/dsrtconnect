import { cn } from '@/lib/utils'

interface ProfileCardProps {
  children: React.ReactNode
  className?: string
  noPadding?: boolean
}

/**
 * ProfileCard — DSRT branded padded panel.
 * Maps directly to DsrtPanel(variant="default") aesthetic.
 * Kept as thin wrapper for backwards compatibility with existing code
 * (e.g., FeaturedWorkSection, MyWorkTab, etc.)
 */
export function ProfileCard({ children, className, noPadding = false }: ProfileCardProps) {
  return (
    <div className={cn(
      'bg-white/[0.02] border border-white/[0.06] rounded-2xl',
      'shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]',
      !noPadding && 'p-4 sm:p-5',
      className
    )}>
      {children}
    </div>
  )
}

interface ProfileCardHeaderProps {
  title: string
  action?: React.ReactNode
}

export function ProfileCardHeader({ title, action }: ProfileCardHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[13px] font-semibold text-white/90 tracking-tight">{title}</h2>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}