export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100">
      <div className="border-b border-zinc-800">
        <div className="max-w-[1200px] mx-auto px-6 py-3 h-14 animate-pulse" />
      </div>
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="aspect-[5/1] w-full rounded-lg bg-zinc-900/60 animate-pulse mb-8" />
          <div className="h-10 w-3/4 bg-zinc-900/60 rounded animate-pulse mb-3" />
          <div className="h-5 w-1/2 bg-zinc-900/40 rounded animate-pulse mb-6" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-zinc-900/40 rounded animate-pulse" />
            <div className="h-4 w-11/12 bg-zinc-900/40 rounded animate-pulse" />
            <div className="h-4 w-10/12 bg-zinc-900/40 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}
