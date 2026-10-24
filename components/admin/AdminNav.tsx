'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ShieldAlert, LogOut, Trophy, Users, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DsrtButton } from '@/components/dsrt'

interface AdminNavProps {
  profile: any
}

export function AdminNav({ profile }: AdminNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const isSuper = profile?.admin_role === 'dsrt_super_admin'

  const navItems = [
    { name: 'Hackathons', href: '/admin/hackathons', icon: Trophy },
    ...(isSuper
      ? [
          { name: 'Admins', href: '/admin/community-admins', icon: Users },
          { name: 'Settings', href: '/admin/settings', icon: Settings },
        ]
      : []),
  ]

  return (
    <nav className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#05070D]/95 backdrop-blur-xl">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-[64px] flex items-center justify-between gap-4">
        
        <Link href="/admin/hackathons" className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#1e3a5f] to-[#0f172a] border border-[#2c5282]/50 flex items-center justify-center shadow-inner">
            <ShieldAlert size={18} className="text-[#93c5fd]" />
          </div>
          <div className="hidden sm:block">
            <p className="text-[14px] font-bold text-white leading-tight">DSRT Admin</p>
            <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest mt-0.5">
              {profile?.admin_role?.replace(/_/g, ' ')}
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-colors whitespace-nowrap',
                  isActive
                    ? 'bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {item.name}
              </Link>
            )
          })}

          <div className="w-px h-5 bg-white/10 mx-2 shrink-0" />

          <DsrtButton
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0 px-2"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </DsrtButton>
        </div>
      </div>
    </nav>
  )
}