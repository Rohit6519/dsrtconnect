import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { LessonView } from '@/components/school/LessonView'

interface PageProps {
  params: { slug: string; lesson: string }
}

export default async function LessonPage({ params }: PageProps) {
  const supabase = createClient()

  const { data: course } = await supabase
    .from('startup_courses')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (!course) notFound()

  const { data: lesson } = await supabase
    .from('startup_lessons')
    .select('*')
    .eq('course_id', course.id)
    .eq('slug', params.lesson)
    .single()

  if (!lesson) notFound()

  const { data: allLessons } = await supabase
    .from('startup_lessons')
    .select('id, slug, title, order_index')
    .eq('course_id', course.id)
    .order('order_index', { ascending: true })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: progress } = user
    ? await supabase
        .from('course_progress')
        .select('completed')
        .eq('user_id', user.id)
        .eq('lesson_id', lesson.id)
        .maybeSingle()
    : { data: null }

  return (
    <LessonView
      course={course}
      lesson={lesson}
      allLessons={allLessons || []}
      isCompleted={progress?.completed || false}
      userId={user?.id}
    />
  )
}