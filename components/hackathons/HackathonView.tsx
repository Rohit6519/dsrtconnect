'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Trophy,
  Calendar,
  MapPin,
  Users,
  Award,
  CheckCircle2,
  ArrowLeft,
  Shield,
  Clock,
  Target,
  FileText,
  Sparkles,
} from 'lucide-react'
import { format, formatDistanceToNow, differenceInDays } from 'date-fns'
import { Markdown } from '@/components/shared/Markdown'
import Link from 'next/link'

interface HackathonViewProps {
  hackathon: any
  isRegistered: boolean
  totalRegistered: number
  currentUserId?: string
}

export function HackathonView({
  hackathon,
  isRegistered: initialRegistered,
  totalRegistered,
  currentUserId,
}: HackathonViewProps) {
  const router = useRouter()
  const supabase = createClient()
  const [registered, setRegistered] = useState(initialRegistered)
  const [loading, setLoading] = useState(false)
  const [count, setCount] = useState(totalRegistered)

  const toggleRegistration = async () => {
    if (!currentUserId) {
      router.push('/login')
      return
    }

    setLoading(true)

    if (registered) {
      await supabase
        .from('hackathon_registrations')
        .delete()
        .eq('hackathon_id', hackathon.id)
        .eq('user_id', currentUserId)
      setRegistered(false)
      setCount((c) => c - 1)
    } else {
      await supabase.from('hackathon_registrations').insert({
        hackathon_id: hackathon.id,
        user_id: currentUserId,
      })
      setRegistered(true)
      setCount((c) => c + 1)
    }

    setLoading(false)
    router.refresh()
  }

  const isDsrtOfficial = hackathon.created_by_admin_role === 'dsrt_super_admin'
  const daysToStart = hackathon.start_date
    ? differenceInDays(new Date(hackathon.start_date), new Date())
    : null
  const isPastRegistration = hackathon.registration_deadline
    ? new Date(hackathon.registration_deadline) < new Date()
    : false

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <Link
        href="/hackathons"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        All Hackathons
      </Link>

      {/* Hero Card */}
      <div className="rounded-3xl border-2 border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-pink-500/5 to-transparent backdrop-blur-sm overflow-hidden shadow-2xl shadow-rose-500/10">
        {hackathon.cover_url && (
          <div className="h-48 md:h-64 bg-muted overflow-hidden relative">
            <img
              src={hackathon.cover_url}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        )}

        <div className="p-6 md:p-8 space-y-5">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-rose-500 to-pink-600 shadow-lg shadow-rose-500/30">
              <Trophy className="w-3 h-3 text-white" />
              <span className="text-[10px] uppercase tracking-widest text-white font-bold">
                Official Hackathon
              </span>
            </div>
            {isDsrtOfficial && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-yellow-500 to-amber-600 shadow-lg">
                <Shield className="w-3 h-3 text-white" />
                <span className="text-[10px] uppercase tracking-widest text-white font-bold">
                  DSRT Official
                </span>
              </div>
            )}
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                hackathon.status === 'upcoming'
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : hackathon.status === 'live'
                    ? 'bg-red-500/10 text-red-500 animate-pulse'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {hackathon.status}
            </span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-muted/60">
              {hackathon.mode}
            </span>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
              {hackathon.title}
            </h1>
            {hackathon.tagline && (
              <p className="text-lg text-muted-foreground mt-3">
                {hackathon.tagline}
              </p>
            )}
          </div>

          {/* Host */}
          <div className="flex items-center gap-3 pb-4 border-b border-border/40">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Hosted by</p>
              <p className="font-semibold">{hackathon.host_name}</p>
            </div>
            {hackathon.communities && (
              <Link
                href={`/community/${hackathon.communities.slug}`}
                className="ml-auto px-3 py-1.5 text-xs rounded-full border border-border/40 hover:bg-muted/40"
              >
                {hackathon.communities.name}
              </Link>
            )}
          </div>

          {/* Key Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {hackathon.start_date && (
              <DetailBox
                icon={Calendar}
                label="Starts"
                value={format(new Date(hackathon.start_date), 'MMM d')}
                subtitle={
                  daysToStart !== null && daysToStart > 0
                    ? `in ${daysToStart}d`
                    : daysToStart === 0
                      ? 'today'
                      : 'started'
                }
              />
            )}
            {hackathon.end_date && (
              <DetailBox
                icon={Clock}
                label="Duration"
                value={`${differenceInDays(
                  new Date(hackathon.end_date),
                  new Date(hackathon.start_date)
                )} days`}
              />
            )}
            {hackathon.location && (
              <DetailBox
                icon={MapPin}
                label="Location"
                value={hackathon.location}
              />
            )}
            {hackathon.prize_pool && (
              <DetailBox
                icon={Award}
                label="Prize Pool"
                value={hackathon.prize_pool}
                highlight
              />
            )}
          </div>

          {/* Themes */}
          {hackathon.themes && hackathon.themes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {hackathon.themes.map((t: string) => (
                <span
                  key={t}
                  className="px-3 py-1.5 text-xs rounded-full bg-rose-500/10 text-rose-500 font-medium border border-rose-500/20"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Registration section */}
          <div className="pt-5 border-t border-border/40 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-2xl font-bold">{count.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  builders registered
                </p>
              </div>

              <div className="text-right">
                {hackathon.registration_deadline && (
                  <p className="text-xs text-muted-foreground mb-2">
                    {isPastRegistration
                      ? 'Registration closed'
                      : `Registration closes ${formatDistanceToNow(new Date(hackathon.registration_deadline), { addSuffix: true })}`}
                  </p>
                )}
                <Button
                  size="lg"
                  onClick={toggleRegistration}
                  disabled={loading || (!registered && isPastRegistration)}
                  variant={registered ? 'outline' : 'default'}
                  className={
                    !registered
                      ? 'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-lg shadow-rose-500/30'
                      : ''
                  }
                >
                  {registered ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" />
                      Registered — Withdraw
                    </>
                  ) : isPastRegistration ? (
                    'Registration Closed'
                  ) : (
                    <>
                      <Trophy className="w-4 h-4 mr-2" />
                      Register Now
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {hackathon.description && (
        <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-6 md:p-8">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold">About this hackathon</h2>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <Markdown content={hackathon.description} />
          </div>
        </div>
      )}

      {/* Judging Criteria */}
      {hackathon.judging_criteria && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 md:p-8">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-emerald-500" />
            <h2 className="font-semibold">Judging Criteria</h2>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <Markdown content={hackathon.judging_criteria} />
          </div>
        </div>
      )}

      {/* Submission Guidelines */}
      {hackathon.submission_guidelines && (
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6 md:p-8">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-blue-500" />
            <h2 className="font-semibold">Submission Guidelines</h2>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <Markdown content={hackathon.submission_guidelines} />
          </div>
        </div>
      )}

      {/* CTA */}
      {!registered && !isPastRegistration && (
        <div className="rounded-2xl border-2 border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-pink-500/5 p-8 text-center space-y-4">
          <Sparkles className="w-10 h-10 text-rose-500 mx-auto" />
          <div>
            <h3 className="text-2xl font-bold">Ready to build?</h3>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              Join {count.toLocaleString()} other builders. Registration takes 30
              seconds.
            </p>
          </div>
          <Button
            size="lg"
            onClick={toggleRegistration}
            disabled={loading}
            className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-lg shadow-rose-500/30"
          >
            <Trophy className="w-4 h-4 mr-2" />
            Register for {hackathon.title}
          </Button>
        </div>
      )}
    </div>
  )
}

function DetailBox({ icon: Icon, label, value, subtitle, highlight }: any) {
  return (
    <div
      className={`rounded-xl p-3 ${
        highlight
          ? 'bg-amber-500/10 border border-amber-500/20'
          : 'bg-background/40 border border-border/40'
      }`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <Icon
          className={`w-3.5 h-3.5 ${
            highlight ? 'text-amber-500' : 'text-muted-foreground'
          }`}
        />
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          {label}
        </p>
      </div>
      <p className={`font-bold ${highlight ? 'text-amber-500' : ''}`}>
        {value}
      </p>
      {subtitle && (
        <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>
      )}
    </div>
  )
}