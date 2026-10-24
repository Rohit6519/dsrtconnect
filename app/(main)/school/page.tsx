import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Clock, TrendingUp } from 'lucide-react'

export default async function SchoolPage() {
  const supabase = createClient()

  const { data: courses } = await supabase
    .from('startup_courses')
    .select('*')
    .order('order_index', { ascending: true })

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-purple-500/10 to-transparent p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs uppercase tracking-wider text-purple-500 font-bold">
            DSRT Startup School
          </span>
        </div>
        <h1 className="text-3xl font-bold">Learn to build. Ship. Grow.</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Curated courses distilled from the best startup wisdom — YC, First
          Round, Paul Graham, Naval, and real Indian founder experience.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(courses || []).map((c) => (
          <Link
            key={c.id}
            href={`/school/${c.slug}`}
            className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-6 hover:border-border transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="text-4xl">{c.icon}</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg group-hover:underline">
                  {c.title}
                </h3>
                {c.subtitle && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {c.subtitle}
                  </p>
                )}
                <p className="text-sm text-muted-foreground/80 mt-2 line-clamp-2">
                  {c.description}
                </p>
                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {c.duration_min} min
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {c.difficulty}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}