import { usePathname } from 'next/navigation'
import { dsrtNavigation } from '@/components/nav/navConfig'

export function useActiveNav() {
  const pathname = usePathname()

  let activePrimary = dsrtNavigation.find(nav => pathname.startsWith(nav.href))
  
  // Strict matching logic to prevent overlap
  if (pathname === '/home' || pathname === '/feed' || pathname === '/following' || pathname === '/trending' || pathname === '/pulse') {
    activePrimary = dsrtNavigation.find(n => n.id === 'home')
  }

  const activeSub = activePrimary?.children?.find(sub => pathname === sub.href)

  return {
    activePrimary,
    activeSub,
  }
}