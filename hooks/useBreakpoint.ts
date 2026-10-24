'use client'
import { useMediaQuery } from './useMediaQuery'
import { mediaQueries } from '@/lib/design/breakpoints'

/**
 * Returns booleans for common breakpoints.
 * Usage: const { isMobile, isDesktop } = useBreakpoint()
 */
export function useBreakpoint() {
  const isMobile = useMediaQuery(mediaQueries.mobile)
  const isTablet = useMediaQuery(mediaQueries.tablet)
  const isDesktop = useMediaQuery(mediaQueries.desktop)
  const isTouch = useMediaQuery(mediaQueries.touch)
  const prefersReducedMotion = useMediaQuery(mediaQueries.reducedMotion)

  return { isMobile, isTablet, isDesktop, isTouch, prefersReducedMotion }
}