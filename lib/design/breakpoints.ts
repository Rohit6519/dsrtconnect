/**
 * DSRT Breakpoint Tokens
 * Locked, single source of truth. Matches Tailwind defaults + adds mobile-first semantics.
 */
export const breakpoints = {
  xs: 375,   // small phones
  sm: 640,   // large phones
  md: 768,   // tablets
  lg: 1024,  // small laptops
  xl: 1280,  // laptops
  '2xl': 1536, // desktops
} as const

export type Breakpoint = keyof typeof breakpoints

export const mediaQueries = {
  mobile: `(max-width: ${breakpoints.md - 1}px)`,
  tablet: `(min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.lg - 1}px)`,
  desktop: `(min-width: ${breakpoints.lg}px)`,
  touch: '(hover: none) and (pointer: coarse)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
} as const