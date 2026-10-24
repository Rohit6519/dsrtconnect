import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Clock, ArrowLeft, CheckCircle2, PlayCircle } from 'lucide-react'

interface PageProps {
  params: { slug: string }
}

export default async function CoursePage({ params }: PageProps) {
  const supabase = createClient()

  const { data: course } = await supabase
    .from('startup_courses')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (!course) notFound()

  const { data: lessons } = await supabase
    .from('startup_lessons')
    .select('*')
    .eq('course_id', course.id)
    .order('order_index', { ascending: true })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: progress } = user
    ? await supabase
        .from('course_progress')
        .select('lesson_id, completed')
        .eq('user_id', user.id)
        .in(
          'lesson_id',
          (lessons || []).map((l) => l.id)
        )
    : { data: [] }

  const completedIds = new Set(
    (progress || []).filter((p) => p.completed).map((p) => p.lesson_id)
  )

  const progressPct =
    lessons && lessons.length > 0
      ? Math.round((completedIds.size / lessons.length) * 100)
      : 0

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <Link
        href="/school"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        All courses
      </Link>

      <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-purple-500/5 to-transparent p-6">
        <div className="flex items-start gap-4">
          <div className="text-5xl">{course.icon}</div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{course.title}</h1>
            {course.subtitle && (
              <p className="text-muted-foreground mt-1">{course.subtitle}</p>
            )}
            <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {course.duration_min} min
              </span>
              <span className="capitalize">{course.difficulty}</span>
              <span>·</span>
              <span>
                {completedIds.size}/{lessons?.length || 0} completed
              </span>
            </div>
            {progressPct > 0 && (
              <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {course.description && (
          <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
            {course.description}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3 px-2">
          Lessons
        </p>
        <div className="space-y-1">
          {(lessons || []).map((l, i) => {
            const isDone = completedIds.has(l.id)
            return (
              <Link
                key={l.id}
                href={`/school/${course.slug}/${l.slug}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/40 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <span className="text-xs font-semibold text-muted-foreground">
                      {i + 1}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{l.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.duration_min} min
                  </p>
                </div>
                <PlayCircle className="w-4 h-4 text-muted-foreground" />
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}