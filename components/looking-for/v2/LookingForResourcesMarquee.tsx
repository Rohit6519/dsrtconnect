'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowRight, ArrowSquareOut, Star, BookmarkSimple } from '@phosphor-icons/react'

export interface ResourceItem {
  id: string
  title: string
  provider: string
  category: string
  url: string
  description?: string
  is_hidden_gem?: boolean
}

const LOOKING_FOR_RESOURCES: ResourceItem[] = [
  {
    id: 'lf-res-1',
    title: 'How to Get Rich (Without Getting Lucky)',
    provider: 'Naval Ravikant',
    category: 'FOUNDER & CAREER',
    url: 'https://nav.al/rich',
    description: 'Building leverage, specific knowledge, and judgment without relying on luck.',
    is_hidden_gem: true,
  },
  {
    id: 'lf-res-2',
    title: 'YC Co-Founder Matching Engine',
    provider: 'Y Combinator',
    category: 'HIRING & COFOUNDER',
    url: 'https://www.ycombinator.com/cofounder-matching',
    description: 'The canonical algorithm for finding technical and business cofounders globally.',
    is_hidden_gem: true,
  },
  {
    id: 'lf-res-3',
    title: 'The Mom Test: How to Talk to Users & Cofounders',
    provider: 'Rob Fitzpatrick',
    category: 'VALIDATION & FIT',
    url: 'https://www.momtestbook.com',
    description: 'How to communicate and validate ideas without false positives from polite feedback.',
    is_hidden_gem: true,
  },
  {
    id: 'lf-res-4',
    title: 'Free Legal Forms & Contractor Agreements',
    provider: 'Cooley GO',
    category: 'LEGAL & CONTRACTS',
    url: 'https://www.cooleygo.com/documents/',
    description: 'Vetted NDAs, advisor agreements, contractor contracts, and offer letter templates.',
    is_hidden_gem: true,
  },
  {
    id: 'lf-res-5',
    title: 'Amp It Up: High-Velocity Execution & Hiring',
    provider: 'Frank Slootman',
    category: 'HIRING & TEAMS',
    url: 'https://www.snowflake.com/blog/amp-it-up/',
    description: "How Snowflake's CEO raises standards, speeds decisions, and hires elite contributors.",
    is_hidden_gem: false,
  },
  {
    id: 'lf-res-6',
    title: 'The 90-Day Onboarding Playbook',
    provider: 'First Round Review',
    category: 'TEAM MANAGEMENT',
    url: 'https://review.firstround.com',
    description: 'A structured blueprint to integrate new engineers and product leads quickly.',
    is_hidden_gem: true,
  },
  {
    id: 'lf-res-7',
    title: "The Founder's Dilemmas: Equity Splits & Control",
    provider: 'Noam Wasserman',
    category: 'COFOUNDER & EQUITY',
    url: 'https://www.hbs.edu',
    description: 'Data-backed research on cofounder equity, vesting, and avoiding early breakup.',
    is_hidden_gem: true,
  },
  {
    id: 'lf-res-8',
    title: 'Pricing Creativity: Value-Based Freelance Rates',
    provider: 'Chris Do / The Futur',
    category: 'FREELANCING',
    url: 'https://thefutur.com',
    description: 'How designers and developers price work based on value instead of hours.',
    is_hidden_gem: false,
  },
  {
    id: 'lf-res-9',
    title: 'Anonymous Technical Mock Interviews',
    provider: 'interviewing.io',
    category: 'INTERVIEWING',
    url: 'https://interviewing.io',
    description: 'Practice system design and coding interviews with senior Silicon Valley engineers.',
    is_hidden_gem: true,
  },
  {
    id: 'lf-res-10',
    title: 'Engineering & Product Compensation Engine',
    provider: 'Levels.fyi',
    category: 'SALARY & BENCHMARKS',
    url: 'https://www.levels.fyi',
    description: 'Verified salary, equity, and rate benchmarks across tech roles and markets.',
    is_hidden_gem: false,
  },
  {
    id: 'lf-res-11',
    title: 'Read.cv Builder Profiles',
    provider: 'Read.cv',
    category: 'PROOF OF WORK',
    url: 'https://read.cv',
    description: 'Minimalist proof-of-work profiles for engineers, designers, and researchers.',
    is_hidden_gem: true,
  },
  {
    id: 'lf-res-12',
    title: 'Radical Candor: Direct Feedback Without Friction',
    provider: 'Kim Scott',
    category: 'TEAM MANAGEMENT',
    url: 'https://www.radicalcandor.com',
    description: 'How to give direct feedback without damaging psychological safety on a team.',
    is_hidden_gem: false,
  },
  {
    id: 'lf-res-13',
    title: 'Clerky Legal Framework for Founding Teams',
    provider: 'Clerky',
    category: 'LEGAL & CONTRACTS',
    url: 'https://www.clerky.com',
    description: 'Legal paperwork for founding teams, NDAs, IP assignment, and contractor agreements.',
    is_hidden_gem: true,
  },
  {
    id: 'lf-res-14',
    title: 'Bonsai Freelance Contracts & Scope Generators',
    provider: 'HelloBonsai',
    category: 'FREELANCING',
    url: 'https://www.hellobonsai.com',
    description: 'Freelance contracts, milestone invoices, and scope-of-work agreement builders.',
    is_hidden_gem: false,
  },
  {
    id: 'lf-res-15',
    title: 'MicroMentor Free Founder Network',
    provider: 'MicroMentor',
    category: 'MENTORSHIP',
    url: 'https://www.micromentor.org',
    description: 'Free 1-on-1 mentorship connecting builders with experienced operators.',
    is_hidden_gem: true,
  },
  {
    id: 'lf-res-16',
    title: 'Reforge Career & Growth Ladders',
    provider: 'Reforge',
    category: 'CAREER & GROWTH',
    url: 'https://www.reforge.com',
    description: 'Career advancement frameworks, retention loops, and product-led growth systems.',
    is_hidden_gem: false,
  },
  {
    id: 'lf-res-17',
    title: 'A.Team Elite Builder Pods',
    provider: 'A.Team',
    category: 'TEAM FORMATION',
    url: 'https://www.a.team',
    description: 'Form elite product and engineering pods for high-impact builds.',
    is_hidden_gem: true,
  },
  {
    id: 'lf-res-18',
    title: 'Holloway Guide to Equity & Compensation',
    provider: 'Holloway',
    category: 'EQUITY & SALARY',
    url: 'https://www.holloway.com/g/equity-compensation',
    description: 'The definitive guide to stock options, vesting, dilution, and offer letters.',
    is_hidden_gem: true,
  },
  {
    id: 'lf-res-19',
    title: 'Peerlist Proof-of-Work Directory',
    provider: 'Peerlist',
    category: 'PROOF OF WORK',
    url: 'https://peerlist.io',
    description: 'Professional network based on real projects, GitHub activity, and design work.',
    is_hidden_gem: true,
  },
  {
    id: 'lf-res-20',
    title: "Lenny's Hiring & Interview Playbook",
    provider: 'Lenny Rachitsky',
    category: 'HIRING & TEAMS',
    url: 'https://www.lennysnewsletter.com',
    description: 'Battle-tested question banks, scorecards, and hiring funnels for PMs and engineers.',
    is_hidden_gem: true,
  },
  {
    id: 'lf-res-21',
    title: 'Contra Commission-Free Freelance OS',
    provider: 'Contra',
    category: 'FREELANCING',
    url: 'https://contra.com',
    description: 'Showcase work, manage contracts, and get paid with zero platform fees.',
    is_hidden_gem: false,
  },
  {
    id: 'lf-res-22',
    title: 'Demand Curve Hiring & Growth Playbooks',
    provider: 'Demand Curve',
    category: 'HIRING & GROWTH',
    url: 'https://www.demandcurve.com',
    description: 'Tactical acquisition, candidate outreach, and growth strategies for early startups.',
    is_hidden_gem: false,
  },
  {
    id: 'lf-res-23',
    title: 'Key Values Engineering Culture Matcher',
    provider: 'Key Values',
    category: 'CULTURE & FIT',
    url: 'https://www.keyvalues.com',
    description: 'Match engineering teams based on real operational values and work styles.',
    is_hidden_gem: true,
  },
  {
    id: 'lf-res-24',
    title: 'Basecamp Shape Up: Fixed Time, Variable Scope',
    provider: 'Basecamp',
    category: 'PROJECT WORKFLOW',
    url: 'https://basecamp.com/shapeup',
    description: 'Shape work into 6-week cycles with clear boundaries and ownership.',
    is_hidden_gem: true,
  },
  {
    id: 'lf-res-25',
    title: 'Stripe Atlas Founder & Contractor Guide',
    provider: 'Stripe Atlas',
    category: 'LEGAL & CONTRACTS',
    url: 'https://stripe.com/atlas/guides',
    description: 'Incorporation, founder stock, IP assignment, and compliant hiring basics.',
    is_hidden_gem: false,
  },
  {
    id: 'lf-res-26',
    title: 'YC Co-Founder Equity Split Matrix',
    provider: 'Y Combinator',
    category: 'COFOUNDER & EQUITY',
    url: 'https://www.ycombinator.com/library/5x-how-to-split-equity-among-co-founders',
    description: 'Why equal cofounder equity builds long-term alignment, and how to structure it.',
    is_hidden_gem: true,
  },
  {
    id: 'lf-res-27',
    title: 'Remote.com Global Hiring & Contractor Guide',
    provider: 'Remote.com',
    category: 'REMOTE WORK',
    url: 'https://remote.com/resources',
    description: 'Contractor vs employee classification and compliant remote hiring globally.',
    is_hidden_gem: false,
  },
  {
    id: 'lf-res-28',
    title: 'Carta Cap Table & Dilution Simulator',
    provider: 'Carta',
    category: 'EQUITY & SALARY',
    url: 'https://carta.com',
    description: 'Simulate option pools, vesting, and dilution before offering equity.',
    is_hidden_gem: false,
  },
  {
    id: 'lf-res-29',
    title: 'Deel Global Contractor Compliance OS',
    provider: 'Deel',
    category: 'REMOTE WORK',
    url: 'https://www.deel.com',
    description: 'Global contractor agreements, local tax compliance, and automated payouts.',
    is_hidden_gem: false,
  },
  {
    id: 'lf-res-30',
    title: "Do Things That Don't Scale",
    provider: 'Paul Graham',
    category: 'FOUNDER & CAREER',
    url: 'https://paulgraham.com/ds.html',
    description: 'Why manual recruiting and hands-on onboarding beats early automation.',
    is_hidden_gem: true,
  },
  {
    id: 'lf-res-31',
    title: 'Stanford CS183: Recruiting & Culture',
    provider: 'Sam Altman / Stanford',
    category: 'HIRING & TEAMS',
    url: 'https://startupclass.samaltman.com',
    description: 'How to recruit your first 10 teammates and evaluate mission fit.',
    is_hidden_gem: true,
  },
  {
    id: 'lf-res-32',
    title: 'Loom Async Communication Briefs',
    provider: 'Loom',
    category: 'REMOTE WORK',
    url: 'https://www.loom.com/blog',
    description: 'Replace status meetings with asynchronous video briefs for remote teams.',
    is_hidden_gem: false,
  },
  {
    id: 'lf-res-33',
    title: 'Notion Hiring & Applicant Tracking OS',
    provider: 'Notion',
    category: 'HIRING & TEMPLATES',
    url: 'https://www.notion.so/templates/category/hr-people',
    description: 'Candidate pipelines, interview scorecards, and onboarding templates.',
    is_hidden_gem: false,
  },
  {
    id: 'lf-res-34',
    title: 'Wellfound Salary & Equity Analytics',
    provider: 'Wellfound',
    category: 'SALARY & BENCHMARKS',
    url: 'https://wellfound.com/salaries',
    description: 'Role-based salary, equity, and remote flexibility benchmarks for startups.',
    is_hidden_gem: false,
  },
  {
    id: 'lf-res-35',
    title: 'The Co-Founder Alignment Framework',
    provider: 'Founders Future',
    category: 'COFOUNDER & EQUITY',
    url: 'https://www.foundersfuture.com',
    description: 'Pre-incorporation alignment questions every founding team should answer first.',
    is_hidden_gem: true,
  },
]

function notifySuccess(message: string) {
  try {
    toast.success(message)
  } catch {
    // never crash the app if toast provider is missing
  }
}

function notifyError(message: string) {
  try {
    toast.error(message)
  } catch {
    // never crash the app if toast provider is missing
  }
}

export function LookingForResourcesMarquee() {
  const [isPaused, setIsPaused] = useState(false)
  const [duplicated, setDuplicated] = useState<ResourceItem[]>([])
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    setDuplicated([
      ...LOOKING_FOR_RESOURCES,
      ...LOOKING_FOR_RESOURCES,
      ...LOOKING_FOR_RESOURCES,
    ])
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/resources/save')
        if (!res.ok) return
        const d = await res.json().catch(() => ({}))
        if (cancelled) return
        if (Array.isArray(d.saved)) {
          setSavedIds(new Set(d.saved.map((s: any) => s?.resource_id || s).filter(Boolean)))
        }
      } catch {
        // optional feature — ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleToggleSave = async (item: ResourceItem, wasSaved: boolean) => {
    setSavedIds((prev) => {
      const next = new Set(prev)
      if (wasSaved) next.delete(item.id)
      else next.add(item.id)
      return next
    })

    try {
      const res = await fetch('/api/resources/save', {
        method: wasSaved ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource_id: item.id, source_type: 'founder' }),
      })
      if (!res.ok) throw new Error('save failed')
      notifySuccess(wasSaved ? 'Removed from saved' : 'Saved to your library')
    } catch {
      setSavedIds((prev) => {
        const next = new Set(prev)
        if (wasSaved) next.add(item.id)
        else next.delete(item.id)
        return next
      })
      notifyError('Could not update saved status')
    }
  }

  // Slow continuous scroll (Technical Library pacing)
  const durationSeconds = Math.max(LOOKING_FOR_RESOURCES.length * 9, 280)

  if (duplicated.length === 0) return null

  return (
    <div className="mt-20 pt-12 border-t border-white/[0.08]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#121215] border border-white/[0.08] flex items-center justify-center shrink-0 overflow-hidden">
            <img
              src="/dsrt-resources-icon.png"
              alt="DSRT Resources"
              className="w-full h-full object-contain p-1.5"
            />
          </div>
          <div>
            <h2 className="text-[19px] font-bold text-white">
              Collaborator & Career Resources
            </h2>
            <p className="text-[13.5px] text-zinc-500 mt-0.5">
              Playbooks, legal templates, equity tools, and frameworks for builders looking to team up.
            </p>
          </div>
        </div>

        <Link
          href="/resources?source=founder"
          className="text-[12.5px] font-semibold text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
        >
          Explore library <ArrowRight size={11} />
        </Link>
      </div>

      <div
        className="relative overflow-hidden rounded-2xl"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-[#0a0a0b] to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-[#0a0a0b] to-transparent pointer-events-none" />

        <div
          className="flex gap-4 py-2"
          style={{
            animation: `marquee-looking-for-scroll ${durationSeconds}s linear infinite`,
            animationPlayState: isPaused ? 'paused' : 'running',
            width: 'fit-content',
            willChange: 'transform',
          }}
        >
          {duplicated.map((item, idx) => {
            const isSaved = savedIds.has(item.id)
            return (
              <a
                key={`${item.id}-${idx}`}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex-shrink-0 w-[300px] p-5 bg-[#121215] border border-white/[0.06] hover:border-white/[0.16] rounded-xl transition-all block relative"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleToggleSave(item, isSaved)
                  }}
                  className={
                    'absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center transition-all ' +
                    (isSaved
                      ? 'bg-white/[0.08] text-white'
                      : 'bg-transparent text-zinc-600 hover:bg-white/[0.06] hover:text-white')
                  }
                  aria-label={isSaved ? 'Remove from saved' : 'Save'}
                >
                  <BookmarkSimple size={13} weight={isSaved ? 'fill' : 'regular'} />
                </button>

                <div className="flex items-center gap-2 mb-3 pr-8">
                  <p className="text-[9.5px] font-mono uppercase tracking-widest text-zinc-500 font-bold flex-1 truncate">
                    {item.category}
                  </p>
                  {item.is_hidden_gem && (
                    <Star size={11} weight="fill" className="text-zinc-400 shrink-0" />
                  )}
                </div>

                <p className="text-[13.5px] font-bold text-white group-hover:text-zinc-200 transition-colors leading-snug mb-2 line-clamp-2 min-h-[38px]">
                  {item.title}
                </p>

                {item.description && (
                  <p className="text-[11.5px] text-zinc-500 leading-relaxed line-clamp-2 mb-3 min-h-[30px]">
                    {item.description}
                  </p>
                )}

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.04]">
                  <p className="text-[11px] text-zinc-400 font-semibold truncate">
                    {item.provider}
                  </p>
                  <ArrowSquareOut
                    size={11}
                    className="text-zinc-600 group-hover:text-white transition-colors shrink-0"
                  />
                </div>
              </a>
            )
          })}
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee-looking-for-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }
      `}</style>
    </div>
  )
}