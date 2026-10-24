'use client'

import { DsrtLogo } from '@/components/ui/DsrtLogo'
import { cn } from '@/lib/utils'

interface LogoSphereProps {
  size?: number
  className?: string
}

export function LogoSphere({ size = 40, className }: LogoSphereProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center animate-pulse", className)}>
      <DsrtLogo size={size} showText={false} />
    </div>
  )
}