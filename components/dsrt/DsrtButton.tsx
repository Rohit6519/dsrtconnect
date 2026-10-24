'use client'
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

const dsrtButtonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 select-none gap-2',
  {
    variants: {
      variant: {
        // Primary DSRT — Midnight Steel gradient
        primary:
          'bg-gradient-to-b from-[#1e3a5f] to-[#2c5282] text-white border border-[#2c5282]/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_1px_2px_rgba(0,0,0,0.4)] hover:from-[#25467a] hover:to-[#345d94] active:from-[#1a3352] active:to-[#264769]',
        // White inverted — CTA
        white:
          'bg-white text-black border border-white/20 shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.7)] hover:bg-zinc-200 active:bg-zinc-300',
        // Ghost — transparent
        ghost:
          'text-white/70 hover:text-white hover:bg-white/[0.06] active:bg-white/[0.08]',
        // Outline — bordered transparent
        outline:
          'text-white/80 hover:text-white bg-transparent border border-white/[0.12] hover:bg-white/[0.04] hover:border-white/[0.2]',
        // Danger
        danger:
          'bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500/15 hover:border-red-500/50',
        // Subtle — for less prominent actions
        subtle:
          'bg-white/[0.04] text-white/80 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white',
      },
      size: {
        xs: 'h-7 px-2.5 text-[11px] rounded-md',
        sm: 'h-8 px-3 text-[12px] rounded-lg',
        md: 'h-9 px-4 text-[13px] rounded-lg',
        lg: 'h-10 px-5 text-[14px] rounded-xl',
        xl: 'h-11 px-6 text-[15px] rounded-xl',
        icon: 'h-9 w-9 rounded-lg',
        'icon-sm': 'h-8 w-8 rounded-lg',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
)

export interface DsrtButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof dsrtButtonVariants> {
  asChild?: boolean
  loading?: boolean
}

export const DsrtButton = React.forwardRef<HTMLButtonElement, DsrtButtonProps>(
  (
    { className, variant, size, fullWidth, asChild = false, loading, disabled, children, ...props },
    ref
  ) => {
    
    // IF asChild === true, we must ONLY render the Slot and pass the children exactly as they are.
    // Radix Slot crashes if you pass it multiple children (like a spinner + text) when it expects a single element like <Link>.
    if (asChild) {
      return (
        <Slot
          className={cn(dsrtButtonVariants({ variant, size, fullWidth, className }))}
          ref={ref as React.Ref<HTMLElement>}
          {...props}
        >
          {children}
        </Slot>
      )
    }

    // IF asChild === false, we render a standard button and can safely inject the loading spinner.
    return (
      <button
        className={cn(dsrtButtonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {children}
      </button>
    )
  }
)
DsrtButton.displayName = 'DsrtButton'