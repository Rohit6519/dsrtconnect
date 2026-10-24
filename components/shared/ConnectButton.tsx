'use client'

import { useComposer } from '@/components/mail/composer/ComposerContext'
import { cn } from '@/lib/utils'
import { PaperPlaneTilt } from '@phosphor-icons/react'

interface ConnectButtonProps {
  entityType: 'user' | 'venture' | 'project' | 'opportunity'
  entityId: string
  entityName: string
  entitySlug?: string // Made optional just in case
  sourceType?: 'connect' | 'application' | 'venture_invite' | 'project_invite' | 'direct'
  label?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  className?: string
  icon?: boolean
}

export function ConnectButton({ 
  entityType, entityId, entityName, entitySlug, 
  sourceType = 'connect', label, size = 'md', variant = 'secondary', 
  className, icon = false 
}: ConnectButtonProps) {
  const { openCompose } = useComposer()

  const handleOpen = () => {
    // Safe slug generation fallback to prevent the toLowerCase() crash
    const safeSlug = entitySlug || entityName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
    const dsrt_email = `${safeSlug.toLowerCase()}@dsrt.com`

    let subject = `Connecting regarding ${entityName}`
    if (sourceType === 'application') subject = `Application for ${entityName}`
    else if (entityType === 'user') subject = `Connection Request`

    openCompose({
      mode: 'new',
      to: [{ dsrt_email, display_name: entityName, entity_type: entityType, entity_id: entityId }],
      subject,
      source_type: sourceType,
      source_entity_type: entityType,
      source_entity_id: entityId
    })
  }

  const sizeClasses = {
    sm: 'h-7 px-2.5 text-[11.5px]',
    md: 'h-8 px-3.5 text-[12.5px]',
    lg: 'h-9 px-5 text-[13px]'
  }

  const variantClasses = {
    primary: 'bg-white text-black hover:bg-zinc-200 font-bold',
    secondary: 'bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white',
    outline: 'border border-white/[0.15] hover:border-white/[0.25] hover:bg-white/[0.04] text-white',
    ghost: 'hover:bg-white/[0.06] text-white/70 hover:text-white',
  }

  return (
    <button
      onClick={handleOpen}
      className={cn(
        "flex items-center justify-center gap-1.5 font-medium rounded-md transition-colors",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      {icon && <PaperPlaneTilt className="w-3.5 h-3.5" weight="fill" />}
      {label || (sourceType === 'application' ? 'Apply Now' : 'Connect')}
    </button>
  )
}