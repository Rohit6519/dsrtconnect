'use client'

interface Props {
  size?: number
  className?: string
}

/**
 * Official DSRT Connect mark.
 * Place your file at: public/dsrt-connect-logo.svg
 * (or .png — change src below if needed)
 */
export function DsrtConnectLogo({ size = 36, className = '' }: Props) {
  return (
    <div
      className={
        'relative shrink-0 overflow-hidden rounded-xl ' +
        'bg-gradient-to-b from-zinc-800/80 to-zinc-950 ' +
        'border border-zinc-700/50 ' +
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_8px_rgba(0,0,0,0.4)] ' +
        'flex items-center justify-center ' +
        className
      }
      style={{ width: size, height: size }}
    >
      <img
        src="/dsrt-connect-logo.svg"
        alt="DSRT Connect"
        width={size - 10}
        height={size - 10}
        className="object-contain"
      />
    </div>
  )
}