'use client'

import { cn } from '@/lib/utils'
import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X, Save, LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface StudioNavGroup {
  label?: string
  items: StudioNavItem[]
}

export interface StudioNavItem {
  label: string
  href: string
  icon?: LucideIcon
  badge?: number | string
  disabled?: boolean
}

interface StudioShellProps {
  title: string
  subtitle?: string
  navGroups: StudioNavGroup[]
  children: ReactNode
  /** Autosave / draft status indicator */
  status?: 'idle' | 'saving' | 'saved' | 'error'
  statusText?: string
  /** Exit button destination */
  exitHref: string
  exitLabel?: string
  /** Optional action buttons (e.g., Preview, Publish) */
  actions?: ReactNode
  /** Optional footer */
  footer?: ReactNode
}

export function StudioShell({
  title,
  subtitle,
  navGroups,
  children,
  status = 'idle',
  statusText,
  exitHref,
  exitLabel = 'Save & exit',
  actions,
  footer,
}: StudioShellProps) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-surface-0 text-white flex flex-col">
      {/* Studio topbar */}
      <header className="h-14 border-b border-white/[0.06] bg-surface-1/80 backdrop-blur-md flex items-center px-6 sticky top-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-white truncate leading-tight">
              {title}
            </p>
            {subtitle && (
              <p className="text-[11px] text-white/40 truncate leading-tight mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <StatusIndicator status={status} text={statusText} />
          {actions}
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="text-white/60 hover:text-white hover:bg-white/5 gap-1.5"
          >
            <Link href={exitHref}>
              <X className="w-3.5 h-3.5" />
              {exitLabel}
            </Link>
          </Button>
        </div>
      </header>

      {/* Body: nav rail + workspace */}
      <div className="flex-1 flex">
        <aside className="hidden md:flex flex-col w-64 border-r border-white/[0.06] bg-surface-1/60 py-6 px-3 space-y-6">
          {navGroups.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <p className="label-mono px-3 mb-2 text-white/40">
                  {group.label}
                </p>
              )}
              <nav className="space-y-0.5">
                {group.items.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(item.href + '/')
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.disabled ? '#' : item.href}
                      aria-disabled={item.disabled || undefined}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors',
                        item.disabled && 'opacity-40 pointer-events-none',
                        active
                          ? 'bg-white/[0.08] text-white'
                          : 'text-white/60 hover:bg-white/[0.04] hover:text-white'
                      )}
                    >
                      {Icon && (
                        <Icon
                          className="w-4 h-4 flex-shrink-0"
                          strokeWidth={1.75}
                        />
                      )}
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge !== undefined && item.badge !== 0 && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-white/[0.08] text-white/70 min-w-[18px] text-center leading-none">
                          {typeof item.badge === 'number' && item.badge > 99
                            ? '99+'
                            : item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </nav>
            </div>
          ))}
        </aside>

        <main className="flex-1 min-w-0 overflow-x-hidden">
          <div className="max-w-4xl mx-auto py-8 px-6 md:px-10">{children}</div>
        </main>
      </div>

      {footer && (
        <footer className="border-t border-white/[0.06] bg-surface-1/80 backdrop-blur-md">
          <div className="px-6 py-4">{footer}</div>
        </footer>
      )}
    </div>
  )
}

function StatusIndicator({
  status,
  text,
}: {
  status: 'idle' | 'saving' | 'saved' | 'error'
  text?: string
}) {
  if (status === 'idle') return null

  const config = {
    saving: {
      dot: 'bg-amber-400 animate-pulse',
      label: text || 'Saving…',
      color: 'text-amber-300/80',
    },
    saved: {
      dot: 'bg-emerald-400',
      label: text || 'Draft saved',
      color: 'text-emerald-300/80',
    },
    error: {
      dot: 'bg-red-400',
      label: text || 'Save failed',
      color: 'text-red-300/80',
    },
  }[status]

  return (
    <div
      className={cn(
        'hidden md:flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider',
        config.color
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
      {config.label}
    </div>
  )
}