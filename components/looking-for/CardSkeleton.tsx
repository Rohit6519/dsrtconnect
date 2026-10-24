'use client'

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-5 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-5 w-16 bg-zinc-800/80 rounded" />
        <div className="w-7 h-7 bg-zinc-800/80 rounded-md" />
      </div>
      <div className="h-4 w-3/4 bg-zinc-800/80 rounded mb-2" />
      <div className="h-3 w-1/3 bg-zinc-800/60 rounded mb-4" />
      <div className="h-3 w-full bg-zinc-800/60 rounded mb-1.5" />
      <div className="h-3 w-5/6 bg-zinc-800/60 rounded mb-4" />
      <div className="flex gap-1.5 mb-4">
        <div className="h-6 w-16 bg-zinc-800/60 rounded" />
        <div className="h-6 w-20 bg-zinc-800/60 rounded" />
        <div className="h-6 w-14 bg-zinc-800/60 rounded" />
      </div>
      <div className="h-3 w-1/2 bg-zinc-800/60 rounded" />
    </div>
  )
}

export function CardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}
