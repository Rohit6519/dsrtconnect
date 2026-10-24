'use client'

import { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

/**
 * Solid filled DSRT project tab icons.
 * - fill="currentColor" so consumers control tone via CSS
 * - evenodd fill rule for cutout regions (rings, gears)
 * - 24x24 viewBox, consistent stroke-free geometry
 * - Each icon is a genuinely unique shape — never a variant of another
 */
const BASE: SVGProps<SVGSVGElement> = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: 'currentColor',
  fillRule: 'evenodd',
  clipRule: 'evenodd',
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. OVERVIEW
// Three solid rounded rectangles — dashboard cards
// ═══════════════════════════════════════════════════════════════════════════
export const IconOverview = (p: IconProps) => (
  <svg {...BASE} {...p}>
    <path d="M4 4.5C4 3.67 4.67 3 5.5 3H18.5C19.33 3 20 3.67 20 4.5V8.5C20 9.33 19.33 10 18.5 10H5.5C4.67 10 4 9.33 4 8.5V4.5Z" />
    <path d="M4 13.5C4 12.67 4.67 12 5.5 12H12.5C13.33 12 14 12.67 14 13.5V19.5C14 20.33 13.33 21 12.5 21H5.5C4.67 21 4 20.33 4 19.5V13.5Z" />
    <path d="M16 13.5C16 12.67 16.67 12 17.5 12H18.5C19.33 12 20 12.67 20 13.5V19.5C20 20.33 19.33 21 18.5 21H17.5C16.67 21 16 20.33 16 19.5V13.5Z" />
  </svg>
)

// ═══════════════════════════════════════════════════════════════════════════
// 2. UPDATES
// Feed rows + broadcast pulse dot with ring (top-right)
// ═══════════════════════════════════════════════════════════════════════════
export const IconUpdates = (p: IconProps) => (
  <svg {...BASE} {...p}>
    {/* Feed rows */}
    <rect x="3" y="10.5" width="13" height="2.5" rx="1.25" />
    <rect x="3" y="15.5" width="10" height="2.5" rx="1.25" />
    <rect x="3" y="20.5" width="15" height="2.5" rx="1.25" transform="translate(0, -3.5)" />

    {/* Solid broadcast dot */}
    <circle cx="19" cy="6" r="2.5" />

    {/* Broadcast ring using evenodd cutout */}
    <path d="M19 1.5C21.485 1.5 23.5 3.515 23.5 6C23.5 8.485 21.485 10.5 19 10.5C16.515 10.5 14.5 8.485 14.5 6C14.5 3.515 16.515 1.5 19 1.5ZM19 3C17.343 3 16 4.343 16 6C16 7.657 17.343 9 19 9C20.657 9 22 7.657 22 6C22 4.343 20.657 3 19 3Z" opacity="0.5" />
  </svg>
)

// ═══════════════════════════════════════════════════════════════════════════
// 3. TEAM
// Three connected member nodes forming a triangle graph, with connection lines
// ═══════════════════════════════════════════════════════════════════════════
export const IconTeam = (p: IconProps) => (
  <svg {...BASE} {...p}>
    {/* Connection lines drawn first (behind nodes) */}
    <rect x="7.5" y="6.25" width="9" height="1.5" rx="0.75" />
    <path d="M6.35 8.5L9.9 15.4L8.55 16.1L5 9.2L6.35 8.5Z" />
    <path d="M17.65 8.5L14.1 15.4L15.45 16.1L19 9.2L17.65 8.5Z" />

    {/* Three solid nodes */}
    <circle cx="6" cy="7" r="3" />
    <circle cx="18" cy="7" r="3" />
    <circle cx="12" cy="18" r="3" />
  </svg>
)

// ═══════════════════════════════════════════════════════════════════════════
// 4. REVIEWS
// Speech bubble with a solid 5-point star embedded
// ═══════════════════════════════════════════════════════════════════════════
export const IconReviews = (p: IconProps) => (
  <svg {...BASE} {...p}>
    {/* Speech bubble with tail (single filled path) */}
    <path d="M4 5.5C4 4.67 4.67 4 5.5 4H18.5C19.33 4 20 4.67 20 5.5V15C20 15.83 19.33 16.5 18.5 16.5H11.2L7.6 19.7C7.02 20.22 6.1 19.81 6.1 19.04V16.5H5.5C4.67 16.5 4 15.83 4 15V5.5Z" opacity="0.35" />

    {/* Solid star embedded on top */}
    <path d="M12 6.5L13.55 9.65L17 10.15L14.5 12.6L15.09 16.05L12 14.42L8.91 16.05L9.5 12.6L7 10.15L10.45 9.65L12 6.5Z" />
  </svg>
)

// ═══════════════════════════════════════════════════════════════════════════
// 5. DOCUMENTATION
// Folded page with corner fold + content lines
// ═══════════════════════════════════════════════════════════════════════════
export const IconDocumentation = (p: IconProps) => (
  <svg {...BASE} {...p}>
    {/* Page body with folded corner cutout — evenodd creates the fold triangle */}
    <path d="M6 2.5C4.895 2.5 4 3.395 4 4.5V19.5C4 20.605 4.895 21.5 6 21.5H18C19.105 21.5 20 20.605 20 19.5V8.5L14 2.5H6ZM8 11.5C8 11.086 8.336 10.75 8.75 10.75H15.25C15.664 10.75 16 11.086 16 11.5C16 11.914 15.664 12.25 15.25 12.25H8.75C8.336 12.25 8 11.914 8 11.5ZM8 14.5C8 14.086 8.336 13.75 8.75 13.75H15.25C15.664 13.75 16 14.086 16 14.5C16 14.914 15.664 15.25 15.25 15.25H8.75C8.336 15.25 8 14.914 8 14.5ZM8 17.5C8 17.086 8.336 16.75 8.75 16.75H12.25C12.664 16.75 13 17.086 13 17.5C13 17.914 12.664 18.25 12.25 18.25H8.75C8.336 18.25 8 17.914 8 17.5Z" />

    {/* Folded corner triangle — brighter to show depth */}
    <path d="M14 2.5L20 8.5H15C14.448 8.5 14 8.052 14 7.5V2.5Z" opacity="0.6" />
  </svg>
)

// ═══════════════════════════════════════════════════════════════════════════
// 6. APPLICANTS
// Inbox tray with a downward arrow (incoming applications)
// ═══════════════════════════════════════════════════════════════════════════
export const IconApplicants = (p: IconProps) => (
  <svg {...BASE} {...p}>
    {/* Down arrow (incoming) — drawn above tray */}
    <path d="M12 2.5C12.414 2.5 12.75 2.836 12.75 3.25V9.44L14.72 7.47C15.013 7.177 15.487 7.177 15.78 7.47C16.073 7.763 16.073 8.237 15.78 8.53L12.53 11.78C12.237 12.073 11.763 12.073 11.47 11.78L8.22 8.53C7.927 8.237 7.927 7.763 8.22 7.47C8.513 7.177 8.987 7.177 9.28 7.47L11.25 9.44V3.25C11.25 2.836 11.586 2.5 12 2.5Z" />

    {/* Inbox tray — filled with subtle top opening */}
    <path d="M4.5 12H8.25L9.5 14.25H14.5L15.75 12H19.5C20.605 12 21.5 12.895 21.5 14V19.5C21.5 20.605 20.605 21.5 19.5 21.5H4.5C3.395 21.5 2.5 20.605 2.5 19.5V14C2.5 12.895 3.395 12 4.5 12Z" />
  </svg>
)

// ═══════════════════════════════════════════════════════════════════════════
// 7. SETTINGS
// Hexagonal gear with center hole (DSRT geometric)
// ═══════════════════════════════════════════════════════════════════════════
export const IconSettings = (p: IconProps) => (
  <svg {...BASE} {...p}>
    {/* Hexagon gear body with center hole — evenodd makes the ring */}
    <path d="M12 2L20.66 7V17L12 22L3.34 17V7L12 2ZM12 8.5C10.067 8.5 8.5 10.067 8.5 12C8.5 13.933 10.067 15.5 12 15.5C13.933 15.5 15.5 13.933 15.5 12C15.5 10.067 13.933 8.5 12 8.5Z" />

    {/* Gear teeth — 4 small nubs at cardinal points */}
    <rect x="11.25" y="0.5" width="1.5" height="2.5" rx="0.5" />
    <rect x="11.25" y="21" width="1.5" height="2.5" rx="0.5" />
    <rect x="19.8" y="5.75" width="2.8" height="1.5" rx="0.5" transform="rotate(30, 21.2, 6.5)" />
    <rect x="1.4" y="16.25" width="2.8" height="1.5" rx="0.5" transform="rotate(30, 2.8, 17)" />
    <rect x="19.8" y="16.75" width="2.8" height="1.5" rx="0.5" transform="rotate(-30, 21.2, 17.5)" />
    <rect x="1.4" y="5.25" width="2.8" height="1.5" rx="0.5" transform="rotate(-30, 2.8, 6)" />
  </svg>
)

// ═══════════════════════════════════════════════════════════════════════════
// REGISTRY — consumed by TabBar in ProjectDetailPage
// ═══════════════════════════════════════════════════════════════════════════

export const PROJECT_TAB_ICONS = {
  overview:      IconOverview,
  updates:       IconUpdates,
  team:          IconTeam,
  reviews:       IconReviews,
  documentation: IconDocumentation,
  applicants:    IconApplicants,
  settings:      IconSettings,
} as const

export type ProjectTabId = keyof typeof PROJECT_TAB_ICONS