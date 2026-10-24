import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const VENTURE_TYPES = [
  { key: 'startup', label: 'Startup' },
  { key: 'scale-up', label: 'Scale-up' },
  { key: 'studio', label: 'Studio' },
  { key: 'holding', label: 'Holding' },
  { key: 'social-enterprise', label: 'Social Enterprise' },
  { key: 'nonprofit', label: 'Nonprofit' },
  { key: 'research-lab', label: 'Research Lab' },
  { key: 'government', label: 'Government Initiative' },
  { key: 'community-org', label: 'Community Org' },
  { key: 'agency', label: 'Agency' },
  { key: 'consultancy', label: 'Consultancy' },
  { key: 'fund', label: 'Fund' },
  { key: 'accelerator', label: 'Accelerator' },
  { key: 'incubator', label: 'Incubator' },
  { key: 'corporate-innovation', label: 'Corporate Innovation' },
  { key: 'joint-venture', label: 'Joint Venture' },
  { key: 'cooperative', label: 'Cooperative' },
  { key: 'franchise', label: 'Franchise' },
  { key: 'other', label: 'Other' },
]

export async function GET() {
  return NextResponse.json({ types: VENTURE_TYPES })
}