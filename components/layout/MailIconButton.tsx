'use client'
import Link from 'next/link'
import { DsrtMail } from '@/components/icons/DsrtIcons'
import { useNavBadges } from '@/hooks/useNavBadges'

export function MailIconButton({ userId }: { userId: string }) {
  const badges = useNavBadges(userId)
  
  return (
    <Link 
      href="/inbox" 
      className="relative p-2 rounded-full text-white/70 hover:text-white hover:bg-white/[0.05] transition-colors"
    >
      <DsrtMail className="w-5 h-5" />
      {badges.inbox > 0 && (
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[#05070D]" />
      )}
    </Link>
  )
}