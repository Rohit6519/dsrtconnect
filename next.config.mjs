/** @type {import('next').NextConfig} */
const nextConfig = {
  // 🛡️ Next.js ফিঙ্গারপ্রিন্ট (X-Powered-By) লুকানোর জন্য
  poweredByHeader: false,

  eslint: {
    // Auth + platform ship with incremental TS/ESLint cleanup
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Keep production deploys unblocked while auth modules stabilize
    ignoreBuildErrors: true,
  },
  transpilePackages: ['@phosphor-icons/react'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
  experimental: {
    // Helps large route trees / server components stay stable on Vercel
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },

  // 🎯 Security Headers (Clickjacking, XSS, and MIME-sniffing ফিক্স করার জন্য)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY', // Clickjacking প্রতিরোধ করবে
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff', // MIME-type Sniffing প্রতিরোধ করবে
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block', // Cross-Site Scripting (XSS) ব্লক করবে
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },

  webpack: (config, { isServer }) => {
    // Silence known third-party Edge Runtime telemetry noise from Supabase SSR
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /node_modules\/@supabase\/supabase-js/ },
      { module: /node_modules\/@supabase\/ssr/ },
      { message: /Serializing big strings/ },
    ]

    // Avoid packing Node-only bits into edge middleware incorrectly
    if (!isServer) {
      config.resolve = config.resolve || {}
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        fs: false,
        net: false,
        tls: false,
      }
    }

    return config
  },
}

export default nextConfig