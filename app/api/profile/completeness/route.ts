import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface Check {
  id: string
  label: string
  weight: number
  completed: boolean
  action_url?: string
}

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId') || user.id

  const [
    { data: profile },
    { data: skills },
    { data: education },
    { data: experience },
    { data: integrations },
    { data: journeyEvents },
  ] = await Promise.all([
    supabase.from('users').select('*').eq('id', userId).single(),
    supabase.from('user_skills').select('id').eq('user_id', userId),
    supabase.from('user_education').select('id').eq('user_id', userId),
    supabase.from('user_experience').select('id').eq('user_id', userId),
    supabase.from('user_integrations').select('provider').eq('user_id', userId).eq('is_active', true),
    supabase.from('journey_events').select('id').eq('user_id', userId),
  ])

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const checks: Check[] = [
    { 
      id: 'avatar',
      label: 'Add a profile photo', 
      weight: 10, 
      completed: !!profile.avatar_url,
      action_url: '/profile/' + profile.username,
    },
    { 
      id: 'cover',
      label: 'Add a cover photo', 
      weight: 5, 
      completed: !!profile.cover_url,
    },
    { 
      id: 'tagline',
      label: 'Write a tagline', 
      weight: 10, 
      completed: !!profile.tagline,
    },
    { 
      id: 'bio',
      label: 'Write a bio', 
      weight: 10, 
      completed: !!profile.bio,
    },
    { 
      id: 'location',
      label: 'Add your location', 
      weight: 5, 
      completed: !!profile.location,
    },
    { 
      id: 'brings',
      label: 'Set what you bring', 
      weight: 10, 
      completed: (profile.brings?.length || 0) > 0,
    },
    { 
      id: 'skills',
      label: 'Add at least 3 skills', 
      weight: 10, 
      completed: (skills?.length || 0) >= 3,
    },
    { 
      id: 'education',
      label: 'Add education', 
      weight: 5, 
      completed: (education?.length || 0) > 0,
    },
    { 
      id: 'experience',
      label: 'Add work experience', 
      weight: 10, 
      completed: (experience?.length || 0) > 0,
    },
    { 
      id: 'integrations',
      label: 'Connect an integration', 
      weight: 10,
      completed: (integrations?.length || 0) > 0,
      action_url: '/settings/integrations',
    },
    { 
      id: 'social',
      label: 'Add social links', 
      weight: 5, 
      completed: !!(profile.github_url || profile.twitter_url || profile.linkedin_url),
    },
    { 
      id: 'journey',
      label: 'Add a journey event', 
      weight: 5, 
      completed: (journeyEvents?.length || 0) > 0,
    },
    { 
      id: 'interests',
      label: 'Set interest topics', 
      weight: 5, 
      completed: (profile.interest_topics?.length || 0) >= 2,
    },
  ]

  const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0)
  const completedWeight = checks
    .filter(c => c.completed)
    .reduce((sum, c) => sum + c.weight, 0)
  
  const percentage = Math.round((completedWeight / totalWeight) * 100)

  return NextResponse.json({
    percentage,
    checks,
    completed_count: checks.filter(c => c.completed).length,
    total_count: checks.length,
    is_verified_ready: percentage >= 80,
  })
}