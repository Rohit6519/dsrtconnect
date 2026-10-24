'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, CheckCircle2, Circle } from 'lucide-react'

interface LessonViewProps {
  course: any
  lesson: any
  allLessons: any[]
  isCompleted: boolean
  userId?: string
}

export function LessonView({
  course,
  lesson,
  allLessons,
  isCompleted: initialCompleted,
  userId,
}: LessonViewProps) {
  const router = useRouter()
  const supabase = createClient()
  const [completed, setCompleted] = useState(initialCompleted)

  const currentIdx = allLessons.findIndex((l) => l.id === lesson.id)
  const prev = currentIdx > 0 ? allLessons[currentIdx - 1] : null
  const next = currentIdx < allLessons.length - 1 ? allLessons[currentIdx + 1] : null

  const toggleComplete = async () => {
    if (!userId) return
    const newState = !completed
    setCompleted(newState)

    await supabase.from('course_progress').upsert(
      {
        user_id: userId,
        lesson_id: lesson.id,
        completed: newState,
        completed_at: newState ? new Date().toISOString() : null,
      },
      { onConflict: 'user_id,lesson_id' }
    )
  }

  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('# '))
        return (
          <h1 key={i} className="text-2xl font-bold mt-6 mb-3">
            {line.slice(2)}
          </h1>
        )
      if (line.startsWith('## '))
        return (
          <h2 key={i} className="text-xl font-semibold mt-5 mb-2">
            {line.slice(3)}
          </h2>
        )
      if (line.startsWith('> '))
        return (
          <blockquote
            key={i}
            className="border-l-2 border-primary/40 pl-4 italic text-muted-foreground my-3"
          >
            {line.slice(2)}
          </blockquote>
        )
      if (line.match(/^\d+\.\s/))
        return (
          <li key={i} className="ml-6 list-decimal">
            {line.replace(/^\d+\.\s/, '')}
          </li>
        )
      if (line.startsWith('- '))
        return (
          <li key={i} className="ml-6 list-disc">
            {line.slice(2)}
          </li>
        )
      if (line.startsWith('**') && line.endsWith('**'))
        return (
          <p key={i} className="font-bold my-2">
            {line.slice(2, -2)}
          </p>
        )
      if (!line.trim()) return <div key={i} className="h-2" />
      return (
        <p key={i} className="leading-relaxed my-2">
          {line}
        </p>
      )
    })
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <Link
        href={`/school/${course.slug}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {course.title}
      </Link>

      <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-6 md:p-8 space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Lesson {currentIdx + 1} of {allLessons.length}</span>
          <span>·</span>
          <span>{lesson.duration_min} min read</span>
        </div>

        <h1 className="text-3xl font-bold">{lesson.title}</h1>

        <div className="text-sm text-foreground/90 space-y-1">
          {renderMarkdown(lesson.content)}
        </div>

        <div className="pt-6 border-t border-border/40 flex items-center gap-2">
          <Button
            onClick={toggleComplete}
            variant={completed ? 'outline' : 'default'}
            size="sm"
          >
            {completed ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" />
                Completed
              </>
            ) : (
              <>
                <Circle className="w-4 h-4 mr-2" />
                Mark as complete
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {prev ? (
          <Link
            href={`/school/${course.slug}/${prev.slug}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            href={`/school/${course.slug}/${next.slug}`}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            {next.title}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </div>
  )
}