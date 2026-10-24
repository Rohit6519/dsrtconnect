// ============================================================
// app/api/coco/knowledge/seed/route.ts
// Seed default DSRT KB documents (admin-only, idempotent).
// ============================================================

import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { chunkDocument } from '@/lib/coco/knowledge/chunker'
import { generateEmbedding } from '@/lib/coco/knowledge/embeddings'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120

const SEED_DOCS = [
  {
    slug: 'platform-overview',
    title: 'DSRT Platform Overview',
    category: 'basics',
    content: `# DSRT Connect

DSRT is a builder ecosystem for founders, engineers, designers, and researchers to launch real projects and ventures together.

## Core Modules
- **Projects** — collaborative build workspaces with team, roles, documentation, and analytics.
- **Ventures** — early-stage companies with assessment frameworks, investor visibility, and open roles.
- **Community** — topic-based groups with events, discussion, and shared projects.
- **Looking For** — opportunities: hiring, co-founders, collaborators, mentors.
- **Mail** — DSRT-native email with entity-aware identities (send as yourself or your project).
- **Home Feed** — personalized activity across everything you follow.
- **COCO** — your always-available AI operating layer.

## Design Language
DSRT uses a serious, dark, restrained interface (#05070D base) with subtle borders and formal typography. Avoid neon or heavy gradients.`,
  },
  {
    slug: 'projects-guide',
    title: 'Projects: What They Are and How to Create Them',
    category: 'projects',
    content: `# Projects on DSRT

A **project** is a collaborative build workspace. It has a name, tagline, description, team, roles, documentation, and status.

## Creating a Project
1. Click "New" in the top navigation, or go to /projects/new.
2. Follow the 5-step wizard: Identity → Definition → Build → Collaboration → Publish.
3. Set a slug (unique URL handle).
4. Upload a banner: **1600×400px** recommended, dark backgrounds work best.
5. Set the status: Idea, MVP, Alpha, Beta, Live, or Archived.

## Project vs Venture
Use a **project** for a build, tool, product, or research effort.
Use a **venture** if you're building a company with a business model, market, and traction targets.

## Banner Dimensions
Recommended: **1600 × 400 pixels** (4:1 aspect ratio).
Max size: 5MB. Formats: PNG, JPG, WebP.

## Roles
Owner, Co-founder, Lead, Contributor, Advisor. Only Owner and Co-founder can delete or transfer.`,
  },
  {
    slug: 'ventures-guide',
    title: 'Ventures vs Projects: The Difference',
    category: 'ventures',
    content: `# Ventures on DSRT

A **venture** is an early-stage company or startup. Ventures have:
- A market and target customer
- A business model
- A team with defined equity considerations
- An assessment framework (10-step review)
- Investor-visible metrics: stage, sector, funding, traction

## When to Create a Venture Instead of a Project
- You have (or intend to have) revenue
- You have (or intend to raise) funding
- You have a defined market and customer
- You want investor visibility on DSRT

Projects can be **converted to ventures** once they mature. Go to project settings → "Convert to Venture".

## Venture Stages
Idea → Pre-MVP → MVP → Early Validation → Growth → Scaling`,
  },
  {
    slug: 'venture-assessment',
    title: 'Venture Assessment: The 10-Step Framework',
    category: 'ventures',
    content: `# The DSRT Venture Assessment

Every venture goes through a 10-step assessment before it's fully published. This clarifies your thinking and makes the venture credible to investors and collaborators.

## The 10 Steps
1. **Venture Basics** — Name, tagline, one-liner.
2. **Problem** — The specific pain point you're solving.
3. **Insight** — What you understand that others don't.
4. **Customer** — Who exactly hurts most from this problem.
5. **Solution** — Your approach.
6. **Market** — Size, growth, category.
7. **Competition** — Who else is trying, and why you're different.
8. **Founder Team** — Who's building this and why you.
9. **Reality Check** — Honest risks and assumptions.
10. **Next Move** — What you're doing in the next 30 days.

## How to Choose Stage Options
Match your stage to actual evidence:
- **Idea**: no build, no users
- **Pre-MVP**: building, no users
- **MVP**: shipped, first testers
- **Early Validation**: paying users or clear signal
- **Growth**: consistent revenue growth
- **Scaling**: funded, hiring, expanding

Don't inflate. Investors filter for honesty.`,
  },
  {
    slug: 'mail-guide',
    title: 'DSRT Mail: Sending, Composing, and Identity',
    category: 'mail',
    content: `# DSRT Mail

DSRT Mail is a native communication system integrated with the platform. You can send email as yourself, or on behalf of your project or venture.

## Sending Mail
1. Open /inbox or click Mail in the sidebar.
2. Click Compose. Choose your identity in "From".
3. Enter recipients: username (@handle), email, project, or venture.
4. Compose subject and body. Attach files (max 25MB, up to 15 attachments).
5. Send now or schedule.

## Identity
- **Personal** — sent as @your-username
- **Project** — sent as a project (only if you have roles there)
- **Venture** — sent as a venture (only if you have roles there)

Recipients see which identity you sent from.

## Drafts
All composers autosave every few seconds. Drafts live in the Drafts folder.

## Attachments
Max 25MB per file. Max 15 files per message. Supported: images, docs, PDFs, code.`,
  },
  {
    slug: 'community-guide',
    title: 'Communities: Discovery, Membership, and Governance',
    category: 'community',
    content: `# Communities on DSRT

Communities are topic-based groups. Anyone can create one. Members discuss, share projects, host events, and collaborate.

## Joining
Some communities are open, some require approval. Click "Join" on any community page.

## Roles
- **Owner** — full control
- **Admin** — settings + moderation
- **Moderator** — moderation only
- **Member** — participate

## Content
Posts, polls, discussions, events. Members can also link their projects to the community.

## Moderation
Reports go to community mods. Users can appeal decisions through the Appeals panel.`,
  },
  {
    slug: 'looking-for-guide',
    title: 'Looking For: Posting and Applying to Opportunities',
    category: 'opportunities',
    content: `# Looking For on DSRT

Post or find opportunities: hiring, co-founders, collaborators, mentors, investment.

## Posting an Opportunity
Go to /looking-for/create. Fill:
- Type (Role, Co-founder, Advisor, etc.)
- Title, description
- Requirements (skills, experience)
- Compensation (equity, salary, hourly, none)
- Deadline
- Context (attach to a project or venture)

## Applying
Click "Apply" on any opportunity. Some require a written pitch and portfolio links. Applications route to the poster's dashboard.

## Managing Applications
Under /looking-for/my-opportunities you see all applicants, can filter, message, and move them through stages.`,
  },
  {
    slug: 'design-guidelines',
    title: 'DSRT Design Guidelines: Banners, Logos, Avatars',
    category: 'design',
    content: `# Design Guidelines

## Project Banner
- Recommended: **1600 × 400 pixels** (4:1)
- Max size: 5MB
- Formats: PNG, JPG, WebP
- Use dark backgrounds. Avoid heavy text; project title renders over it.

## Venture Logo
- Square, minimum 512 × 512 pixels
- SVG preferred, PNG acceptable
- Transparent background recommended
- Max 2MB

## Avatar
- Square, minimum 400 × 400 pixels
- Auto-cropped to circle
- Max 5MB

## Post Media
- Images: up to 4 per post, max 10MB each
- Video: single video per post, max 100MB, MP4 recommended

## Community Cover
- 1600 × 500 pixels
- Same restrictions as project banners

## Colors
Base: #05070D. Border: rgba(255,255,255,0.06). Accent: subtle only. No neon.`,
  },
  {
    slug: 'profile-guide',
    title: 'Profile: Building Your DSRT Identity',
    category: 'profile',
    content: `# Your DSRT Profile

Your profile is your public builder identity. It shows your work, skills, ventures, projects, and connections.

## Sections
- **Header** — avatar, banner, name, tagline, verification
- **About Me** — long-form bio
- **Featured Work** — showcase up to 6 projects/ventures/artifacts
- **Skills** — tagged with proficiency
- **Experience** — work history
- **Education** — degrees, courses, certifications
- **Certifications** — verified credentials with issuer
- **Social Links** — GitHub, LinkedIn, Twitter, personal site

## Verification
Verify your email, then apply for platform verification (blue check) if you meet criteria: real name, complete profile, active for 30+ days, clean moderation record.

## Followers vs Connections
- **Follow** — one-way, public content only
- **Connect** — mutual, unlocks DMs and full profile`,
  },
  {
    slug: 'permissions-guide',
    title: 'Permissions & Verification on DSRT',
    category: 'security',
    content: `# Permissions & Verification

## Account States
- **Unverified** — email not confirmed
- **Verified email** — can post and interact
- **Verified identity** — blue check, elevated trust
- **Restricted** — moderation action, limited features
- **Suspended** — account paused

## Rate Limits
- Posts: 20 per day (new users), 100 per day (verified)
- Follows: 200 per day
- Applications: 50 per day
- Mail: 100 per day

## What Requires Verification
- Sending connection requests
- Applying to opportunities with cash compensation
- Creating a venture
- Posting jobs on Looking For

## What COCO Cannot Do
COCO does not: process payments, change security settings, delete accounts or ventures, bypass moderation, read another user's private data. These require you to act directly in Settings.`,
  },
  {
    slug: 'coco-guide',
    title: 'Using COCO: Your DSRT Assistant',
    category: 'coco',
    content: `# COCO — Your DSRT Assistant

COCO is the AI operating layer of DSRT. She lives in the bottom-right pill on every page and understands where you are.

## What COCO Can Do
- **Navigate**: "Take me to my ventures" → opens /ventures.
- **Answer**: "What size should my project banner be?" — cites DSRT guidelines.
- **Control the UI**: "Switch to the team tab" — actually clicks it.
- **Workflows**: "Open mail and draft a note to @rohit inviting him to join my project" — full multi-step.
- **Identity checks**: When you send outbound communications, she asks whether to act personally or on behalf of a project/venture.

## What COCO Cannot Do
- Send emails without your explicit confirmation
- Delete anything
- Change security settings
- Read other users' private data
- Bypass DSRT rules

## Tips
- Be specific about the target: "invite @rohit to DSRT AI" is clearer than "invite him".
- COCO remembers preferences you explicitly state ("prefer formal tone").
- Use COCO on any page — she reads the page context automatically.`,
  },
  {
    slug: 'faq',
    title: 'Frequently Asked Questions',
    category: 'basics',
    content: `# FAQ

## What's the difference between a project and a venture?
Projects are builds. Ventures are companies. Ventures include business model, market, and investor context. See ventures-guide.

## Can I convert a project to a venture?
Yes. Project Settings → Convert to Venture. This preserves the team and history.

## How do I delete my account?
Settings → Security → Delete Account. This is permanent after a 30-day grace period.

## Is DSRT free?
Core DSRT is free. Some premium features (advanced analytics, higher rate limits, verified badges for teams) will be paid.

## Can I use COCO on mobile?
Yes. The COCO panel takes about 75% of the screen height on mobile and behaves like a bottom sheet.

## How do I report abuse?
Every post, message, and profile has a Report option. Reports go to moderation and are reviewed within 48 hours.

## Where's my data stored?
DSRT uses Supabase (Postgres) with encrypted mail bodies and vault items. See our Privacy page.`,
  },
]

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  }

  const results: any[] = []

  for (const doc of SEED_DOCS) {
    try {
      // Upsert doc row
      const { data: existing } = await adminClient
        .from('coco_knowledge_docs')
        .select('id')
        .eq('slug', doc.slug)
        .maybeSingle()

      let docId: string
      if (existing) {
        docId = existing.id
        await adminClient
          .from('coco_knowledge_docs')
          .update({ title: doc.title, category: doc.category, is_active: true })
          .eq('id', docId)
        await adminClient.from('coco_knowledge_chunks').delete().eq('doc_id', docId)
      } else {
        const { data: newDoc, error } = await adminClient
          .from('coco_knowledge_docs')
          .insert({ slug: doc.slug, title: doc.title, category: doc.category })
          .select('id')
          .single()
        if (error || !newDoc) throw new Error(error?.message || 'insert failed')
        docId = newDoc.id
      }

      // Chunk + embed
      const chunks = chunkDocument(doc.content)
      const rows: any[] = []
      for (const chunk of chunks) {
        const embedding = await generateEmbedding(chunk.content)
        rows.push({
          doc_id: docId,
          chunk_index: chunk.index,
          content: chunk.content,
          content_tokens: chunk.tokenCount,
          embedding,
        })
      }

      if (rows.length > 0) {
        const { error: chunkErr } = await adminClient
          .from('coco_knowledge_chunks')
          .insert(rows)
        if (chunkErr) throw new Error(chunkErr.message)
      }

      results.push({ slug: doc.slug, chunks: chunks.length, ok: true })
    } catch (err: any) {
      results.push({ slug: doc.slug, ok: false, error: err.message })
    }
  }

  return NextResponse.json({ ok: true, seeded: results.length, results })
}