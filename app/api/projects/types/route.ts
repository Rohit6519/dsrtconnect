import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const PROJECT_TYPES = [
  { key: 'side-project', label: 'Side Project' },
  { key: 'hackathon', label: 'Hackathon Build' },
  { key: 'open-source', label: 'Open Source' },
  { key: 'learning', label: 'Learning Project' },
  { key: 'portfolio', label: 'Portfolio Piece' },
  { key: 'client-work', label: 'Client Work' },
  { key: 'research', label: 'Research Project' },
  { key: 'mvp', label: 'MVP / Prototype' },
  { key: 'startup', label: 'Startup Product' },
  { key: 'bootcamp', label: 'Bootcamp Project' },
  { key: 'case-study', label: 'Case Study' },
  { key: 'community', label: 'Community Contribution' },
  { key: 'game-jam', label: 'Game Jam' },
  { key: 'creative', label: 'Creative Work' },
  { key: 'experiment', label: 'Experiment' },
  { key: 'other', label: 'Other' },
]

export async function GET() {
  return NextResponse.json({ types: PROJECT_TYPES })
}