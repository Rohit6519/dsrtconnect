'use client'

import { useState } from 'react'

interface PulseCoverImageProps {
  imageUrl?: string | null
  categorySlug?: string
  categoryName?: string
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  startups: 'from-orange-500/60 via-amber-500/40 to-pink-500/60',
  technology: 'from-blue-500/60 via-cyan-500/40 to-indigo-500/60',
  'ai-robotics': 'from-purple-500/60 via-violet-500/40 to-fuchsia-500/60',
  finance: 'from-emerald-500/60 via-teal-500/40 to-green-500/60',
  biotech: 'from-rose-500/60 via-pink-500/40 to-red-500/60',
  climate: 'from-green-500/60 via-emerald-500/40 to-teal-500/60',
  space: 'from-indigo-500/60 via-blue-500/40 to-purple-500/60',
  aviation: 'from-sky-500/60 via-blue-500/40 to-indigo-500/60',
  default: 'from-slate-500/50 via-gray-500/30 to-zinc-500/50',
}

const CATEGORY_ICONS: Record<string, string> = {
  startups: '🚀',
  technology: '💻',
  'ai-robotics': '🤖',
  finance: '💰',
  biotech: '🧬',
  climate: '🌱',
  space: '🌌',
  aviation: '✈️',
  default: '📰',
}

export function PulseCoverImage({
  imageUrl,
  categorySlug,
  categoryName,
}: PulseCoverImageProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  const slug = categorySlug || 'default'
  const gradient = CATEGORY_GRADIENTS[slug] || CATEGORY_GRADIENTS.default
  const icon = CATEGORY_ICONS[slug] || CATEGORY_ICONS.default

  // Only try to show image if URL is provided AND hasn't errored
  const shouldShowImage = imageUrl && imageUrl.trim().length > 0 && !imageError

  if (shouldShowImage) {
    return (
      <div className="relative aspect-[2/1] bg-muted overflow-hidden">
        {/* Gradient background while loading */}
        {!imageLoaded && (
          <div
            className={`absolute inset-0 bg-gradient-to-br ${gradient} flex items-center justify-center`}
          >
            <div className="text-4xl opacity-40">{icon}</div>
          </div>
        )}
        <img
          src={imageUrl}
          alt=""
          onError={() => setImageError(true)}
          onLoad={(e) => {
            const img = e.target as HTMLImageElement
            // Detect broken/placeholder images
            if (img.naturalWidth < 200 || img.naturalHeight < 100) {
              setImageError(true)
              return
            }
            setImageLoaded(true)
          }}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>
    )
  }

  // Beautiful gradient fallback
  return (
    <div
      className={`aspect-[2/1] bg-gradient-to-br ${gradient} flex items-center justify-center relative overflow-hidden`}
    >
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }}
      />

      {/* Floating accents */}
      <div className="absolute top-8 right-8 w-32 h-32 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute bottom-8 left-8 w-24 h-24 rounded-full bg-white/10 blur-2xl" />

      {/* Center content */}
      <div className="relative text-center z-10">
        <div className="text-7xl md:text-8xl mb-4 opacity-90 drop-shadow-2xl">
          {icon}
        </div>
        <p className="text-sm uppercase tracking-widest text-white/90 font-bold drop-shadow">
          {categoryName || 'News'}
        </p>
      </div>
    </div>
  )
}
