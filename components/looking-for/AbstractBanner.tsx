'use client'

import Link from 'next/link'

interface Banner {
  id: string
  variant: 'wave' | 'mesh' | 'lines'
  title?: string | null
  subtitle?: string | null
  cta_label?: string | null
  cta_url?: string | null
}

interface Props {
  banner: Banner
  active: boolean
}

export function AbstractBanner({ banner, active }: Props) {
  const inner = (
    <>
      <div className="absolute inset-0">
        {banner.variant === 'wave' && <WaveBanner />}
        {banner.variant === 'mesh' && <MeshBanner />}
        {banner.variant === 'lines' && <LinesBanner />}
      </div>

      {(banner.title || banner.subtitle) && (
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent pointer-events-none" />
      )}

      {(banner.title || banner.subtitle) && (
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 pointer-events-none">
          {banner.title && (
            <h2 className="text-white text-[22px] md:text-[30px] font-bold tracking-tight leading-tight max-w-2xl drop-shadow-lg">
              {banner.title}
            </h2>
          )}
          {banner.subtitle && (
            <p className="text-white/95 text-[13.5px] md:text-[15px] mt-2 max-w-xl leading-relaxed font-medium drop-shadow">
              {banner.subtitle}
            </p>
          )}
          {banner.cta_label && banner.cta_url && (
            <div className="mt-4 pointer-events-auto">
              <span className="inline-flex items-center h-9 px-4 rounded-md bg-white text-black text-[13px] font-semibold hover:bg-zinc-100 transition-colors">
                {banner.cta_label}
              </span>
            </div>
          )}
        </div>
      )}
    </>
  )

  return (
    <div
      className={
        'absolute inset-0 transition-opacity duration-700 ' +
        (active ? 'opacity-100 z-[1]' : 'opacity-0 z-0 pointer-events-none')
      }
    >
      {banner.cta_url ? (
        <Link href={banner.cta_url} className="block absolute inset-0">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </div>
  )
}

// ============================================================================
// VARIANT 1 — Wave (warm — orange, purple, blue)
// ============================================================================
function WaveBanner() {
  return (
    <svg
      viewBox="0 0 1600 320"
      preserveAspectRatio="xMidYMid slice"
      className="w-full h-full block"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="wave-orange" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#c2410c" />
          <stop offset="45%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="wave-purple" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4c1d95" />
          <stop offset="50%" stopColor="#6d28d9" />
          <stop offset="100%" stopColor="#5b21b6" />
        </linearGradient>
        <linearGradient id="wave-blue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e40af" />
          <stop offset="50%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <filter id="wave-soft">
          <feGaussianBlur stdDeviation="0.5" />
        </filter>
      </defs>

      <rect width="1600" height="320" fill="url(#wave-orange)" />

      <path
        d="M 0,220 C 200,180 400,260 600,210 C 800,160 1000,240 1200,200 C 1400,160 1500,190 1600,180 L 1600,320 L 0,320 Z"
        fill="url(#wave-purple)"
        filter="url(#wave-soft)"
      />

      <ellipse cx="1350" cy="380" rx="500" ry="200" fill="url(#wave-blue)" opacity="0.95" />

      <path
        d="M 0,220 C 200,180 400,260 600,210 C 800,160 1000,240 1200,200 C 1400,160 1500,190 1600,180"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  )
}

// ============================================================================
// VARIANT 2 — Deep navy mesh with radial glow (GitHub / Vercel / Linear feel)
// ============================================================================
function MeshBanner() {
  return (
    <svg
      viewBox="0 0 1600 320"
      preserveAspectRatio="xMidYMid slice"
      className="w-full h-full block"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Deep navy base */}
        <linearGradient id="mesh-base" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0a1128" />
          <stop offset="50%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>

        {/* Central subtle blue glow */}
        <radialGradient id="mesh-glow-blue" cx="70%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.55" />
          <stop offset="45%" stopColor="#1e40af" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
        </radialGradient>

        {/* Left-side subtle purple accent */}
        <radialGradient id="mesh-glow-purple" cx="15%" cy="70%" r="45%">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.35" />
          <stop offset="60%" stopColor="#4c1d95" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
        </radialGradient>

        {/* Fine grid pattern */}
        <pattern id="mesh-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.035)" strokeWidth="1" />
        </pattern>

        <filter id="mesh-blur">
          <feGaussianBlur stdDeviation="1" />
        </filter>
      </defs>

      {/* Base navy */}
      <rect width="1600" height="320" fill="url(#mesh-base)" />

      {/* Grid overlay */}
      <rect width="1600" height="320" fill="url(#mesh-grid)" />

      {/* Purple glow (left) */}
      <rect width="1600" height="320" fill="url(#mesh-glow-purple)" />

      {/* Blue glow (right of center) */}
      <rect width="1600" height="320" fill="url(#mesh-glow-blue)" />

      {/* Thin diagonal accent line */}
      <line
        x1="0" y1="260"
        x2="1600" y2="80"
        stroke="rgba(96,165,250,0.15)"
        strokeWidth="1"
      />
      <line
        x1="0" y1="280"
        x2="1600" y2="100"
        stroke="rgba(96,165,250,0.08)"
        strokeWidth="1"
      />

      {/* Faint scattered dots for texture */}
      <g fill="rgba(255,255,255,0.5)">
        <circle cx="1200" cy="80" r="1" opacity="0.6" />
        <circle cx="1350" cy="140" r="1.2" opacity="0.5" />
        <circle cx="1450" cy="90" r="0.8" opacity="0.7" />
        <circle cx="1100" cy="200" r="1" opacity="0.4" />
        <circle cx="1250" cy="240" r="1.2" opacity="0.5" />
        <circle cx="1500" cy="180" r="0.9" opacity="0.6" />
        <circle cx="1380" cy="60" r="0.7" opacity="0.5" />
      </g>

      {/* Soft ambient highlight in top-right */}
      <ellipse
        cx="1300" cy="60" rx="300" ry="80"
        fill="rgba(147,197,253,0.08)"
        filter="url(#mesh-blur)"
      />
    </svg>
  )
}

// ============================================================================
// VARIANT 3 — Dark gradient with flowing wave lines (Stripe / Framer feel)
// ============================================================================
function LinesBanner() {
  return (
    <svg
      viewBox="0 0 1600 320"
      preserveAspectRatio="xMidYMid slice"
      className="w-full h-full block"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Dark background gradient — deep teal to charcoal */}
        <linearGradient id="lines-base" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#042f2e" />
          <stop offset="50%" stopColor="#0c1a1a" />
          <stop offset="100%" stopColor="#050505" />
        </linearGradient>

        {/* Cyan glow — center-right */}
        <radialGradient id="lines-glow" cx="65%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#0d9488" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#042f2e" stopOpacity="0" />
        </radialGradient>

        {/* Line gradient — cyan → transparent */}
        <linearGradient id="lines-stroke" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
          <stop offset="30%" stopColor="#22d3ee" stopOpacity="0.45" />
          <stop offset="70%" stopColor="#5eead4" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>

        <linearGradient id="lines-stroke-soft" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
          <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>

        <filter id="lines-soft">
          <feGaussianBlur stdDeviation="0.3" />
        </filter>
      </defs>

      {/* Base dark teal */}
      <rect width="1600" height="320" fill="url(#lines-base)" />

      {/* Cyan glow */}
      <rect width="1600" height="320" fill="url(#lines-glow)" />

      {/* Flowing wave lines — multiple offset for depth */}
      <g fill="none" filter="url(#lines-soft)">
        <path
          d="M -50,180 Q 300,80 700,160 T 1650,140"
          stroke="url(#lines-stroke)"
          strokeWidth="1.5"
        />
        <path
          d="M -50,200 Q 300,100 700,180 T 1650,160"
          stroke="url(#lines-stroke-soft)"
          strokeWidth="1"
        />
        <path
          d="M -50,220 Q 300,120 700,200 T 1650,180"
          stroke="url(#lines-stroke)"
          strokeWidth="1.2"
          opacity="0.7"
        />
        <path
          d="M -50,240 Q 300,140 700,220 T 1650,200"
          stroke="url(#lines-stroke-soft)"
          strokeWidth="1"
        />
        <path
          d="M -50,140 Q 300,50 700,130 T 1650,110"
          stroke="url(#lines-stroke-soft)"
          strokeWidth="1"
          opacity="0.6"
        />
        <path
          d="M -50,270 Q 300,180 700,250 T 1650,230"
          stroke="url(#lines-stroke)"
          strokeWidth="1"
          opacity="0.5"
        />
      </g>

      {/* Subtle horizontal accent */}
      <line
        x1="0" y1="200"
        x2="1600" y2="200"
        stroke="rgba(34,211,238,0.06)"
        strokeWidth="1"
      />
    </svg>
  )
}
