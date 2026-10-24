import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#05070D] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#4F7CFF]/10 border border-[#4F7CFF]/20 flex items-center justify-center mb-6 text-[#4F7CFF] font-mono text-2xl font-bold">
        404
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Page Not Found</h1>
      <p className="text-sm text-white/50 max-w-sm mb-6">
        The page or resource you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/home"
        className="h-10 px-5 rounded-md bg-[#4F7CFF] hover:bg-[#3D6BF5] text-white text-xs font-semibold inline-flex items-center justify-center transition-all"
      >
        Return Home
      </Link>
    </div>
  )
}