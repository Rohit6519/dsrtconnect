// filepath: components/auth/AuthBackground.tsx
'use client'

export function AuthBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#05070D]">
      {/* Actual background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/auth-bg.jpg')",
          opacity: 0.6,
          filter: 'saturate(1.05) contrast(1.05)',
        }}
      />

      {/* Readability veils */}
      <div className="absolute inset-0 bg-[#05070D]/55" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#05070D]/90 via-[#05070D]/45 to-[#05070D]/20" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#05070D]/25 via-transparent to-[#05070D]/90" />

      {/* Soft top blue glow */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[900px] h-[520px] rounded-full bg-[#4F7CFF]/20 blur-[110px] pointer-events-none" />

      {/* Subtle wireframe accent (desktop) */}
      <div className="absolute hidden lg:block top-1/2 -translate-y-1/2 left-0 -translate-x-[12%] w-[720px] h-[720px] opacity-[0.12] pointer-events-none">
        <svg viewBox="0 0 800 800" className="w-full h-full animate-[spin_180s_linear_infinite]">
          {Array.from({ length: 18 }).map((_, i) => (
            <ellipse
              key={i}
              cx="400"
              cy="400"
              rx="300"
              ry="110"
              transform={`rotate(${i * 20} 400 400)`}
              stroke="url(#auth-wire)"
              fill="none"
              strokeWidth="1"
            />
          ))}
          <defs>
            <linearGradient id="auth-wire" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4F7CFF" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.12" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  )
}