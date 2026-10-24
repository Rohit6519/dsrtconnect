import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { DocRenderer } from '@/components/project-detail/docs/DocRenderer'
import { DocContributors } from '@/components/project-detail/docs/DocContributors'
import { DocTableOfContents } from '@/components/project-detail/docs/DocTableOfContents'
import { BookOpen, ArrowSquareOut, Clock, Eye, House } from '@phosphor-icons/react/dist/ssr'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ project: string; section: string }>
}

export async function generateMetadata({ params }: Props) {
  const { project: projectSlug, section: sectionSlug } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, tagline')
    .eq('slug', projectSlug)
    .single()

  if (!project) return { title: 'Not found' }

  const { data: section } = await supabase
    .from('project_documentation')
    .select('title, content')
    .eq('project_id', project.id)
    .eq('slug', sectionSlug)
    .eq('is_published', true)
    .single()

  return {
    title: (section?.title || 'Documentation') + ' · ' + project.name,
    description: project.tagline || 'Documentation for ' + project.name,
  }
}

export default async function PublicDocPage({ params }: Props) {
  const { project: projectSlug, section: sectionSlug } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, slug, tagline, logo_url, icon, color')
    .eq('slug', projectSlug)
    .single()

  if (!project) notFound()

  const { data: section } = await supabase
    .from('project_documentation')
    .select('*')
    .eq('project_id', project.id)
    .eq('slug', sectionSlug)
    .eq('is_published', true)
    .single()

  if (!section) notFound()

  const { data: allSections } = await supabase
    .from('project_documentation')
    .select('id, slug, title, position, parent_id')
    .eq('project_id', project.id)
    .eq('is_published', true)
    .order('position', { ascending: true })

  const sectionList = allSections || []

  // Increment view count
  supabase.rpc('increment_doc_view', { p_doc_id: section.id }).then(() => {}, () => {})

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Top bar */}
      <header className="border-b border-white/[0.08] bg-[#0a0a0f]/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="flex items-center gap-2 text-white/70 hover:text-white">
              <House size={16} weight="fill" />
              <span className="text-[13px] font-semibold hidden sm:inline">DSRT</span>
            </Link>
            <span className="text-white/25">/</span>
            <Link href={'/projects/' + project.slug} className="flex items-center gap-2 min-w-0 hover:text-white">
              {project.logo_url ? (
                <img src={project.logo_url} alt="" className="w-6 h-6 rounded-md object-cover flex-shrink-0" />
              ) : (
                <div className="w-6 h-6 rounded-md bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-[13px] flex-shrink-0">
                  {project.icon || '⚡'}
                </div>
              )}
              <span className="text-[13px] font-semibold text-white truncate">{project.name}</span>
            </Link>
            <span className="text-white/25 hidden sm:inline">/</span>
            <span className="text-[13px] text-white/70 truncate hidden sm:inline">Documentation</span>
          </div>
          <Link
            href={'/projects/' + project.slug}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-white/70 hover:text-white bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] px-3 h-8 rounded-md"
          >
            View project <ArrowSquareOut size={11} />
          </Link>
        </div>
      </header>

      {/* Body */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 grid grid-cols-1 lg:grid-cols-[240px_1fr] xl:grid-cols-[240px_1fr_220px] gap-6">

        {/* Left: sections list */}
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white/45 uppercase tracking-wider mb-3">
              <BookOpen size={11} weight="fill" /> Sections
            </div>
            <nav className="space-y-0.5">
              {sectionList.map(s => (
                <Link
                  key={s.id}
                  href={'/docs/' + project.slug + '/' + (s.slug || s.id)}
                  className={
                    'block px-3 py-1.5 rounded-md text-[13px] transition-colors ' +
                    (s.id === section.id
                      ? 'bg-white/[0.06] text-white font-semibold'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.03]')
                  }
                >
                  {s.title}
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        {/* Center: content */}
        <main className="min-w-0">
          <div className="mb-4 pb-4 border-b border-white/[0.06]">
            <h1 className="text-[28px] md:text-[32px] font-bold text-white leading-tight tracking-tight">{section.title}</h1>
            <div className="flex items-center gap-3 mt-2 text-[12px] text-white/50">
              {section.reading_minutes && (
                <span className="flex items-center gap-1"><Clock size={11} /> {section.reading_minutes} min read</span>
              )}
              {typeof section.view_count === 'number' && section.view_count > 0 && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Eye size={11} /> {section.view_count.toLocaleString()} views</span>
                </>
              )}
              {section.updated_at && (
                <>
                  <span>·</span>
                  <span>Updated {new Date(section.updated_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </>
              )}
            </div>
          </div>

          <DocContributors slug={project.slug} docId={section.id} />

          {section.content ? (
            <DocRenderer content={section.content} />
          ) : (
            <p className="text-[14px] text-white/45 italic">This section is empty.</p>
          )}

          {/* Bottom CTA */}
          <div className="mt-12 pt-6 border-t border-white/[0.06]">
            <div className="bg-gradient-to-br from-purple-500/[0.05] to-transparent border border-white/[0.08] rounded-2xl p-6 text-center">
              <p className="text-[15px] font-semibold text-white mb-1">Enjoyed this?</p>
              <p className="text-[13px] text-white/60 mb-4">Follow {project.name} on DSRT Connect for more updates.</p>
              <Link
                href={'/projects/' + project.slug}
                className="inline-flex items-center gap-1.5 bg-white text-black hover:bg-white/90 font-semibold text-[13px] px-5 h-9 rounded-lg transition-colors"
              >
                View project on DSRT →
              </Link>
            </div>
          </div>
        </main>

        {/* Right: TOC */}
        <aside className="hidden xl:block">
          <div className="sticky top-20">
            <DocTableOfContents content={section.content || ''} />
          </div>
        </aside>
      </div>
    </div>
  )
}
