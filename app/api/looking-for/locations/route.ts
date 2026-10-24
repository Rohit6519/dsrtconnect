import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Built-in fallback dataset of major world cities.
// This keeps autocomplete instant + always available even before DB is populated.
const CITIES: Array<{ city: string; country: string; region?: string }> = [
  // Special "remote" tokens
  { city: 'Remote', country: 'Worldwide' },
  { city: 'Remote', country: 'US' },
  { city: 'Remote', country: 'EU' },
  { city: 'Remote', country: 'Americas' },
  { city: 'Remote', country: 'Asia' },
  { city: 'Hybrid', country: 'Any' },
  // North America
  { city: 'San Francisco', country: 'United States', region: 'CA' },
  { city: 'New York', country: 'United States', region: 'NY' },
  { city: 'Los Angeles', country: 'United States', region: 'CA' },
  { city: 'Seattle', country: 'United States', region: 'WA' },
  { city: 'Boston', country: 'United States', region: 'MA' },
  { city: 'Austin', country: 'United States', region: 'TX' },
  { city: 'Chicago', country: 'United States', region: 'IL' },
  { city: 'Denver', country: 'United States', region: 'CO' },
  { city: 'Miami', country: 'United States', region: 'FL' },
  { city: 'Atlanta', country: 'United States', region: 'GA' },
  { city: 'Washington', country: 'United States', region: 'DC' },
  { city: 'Toronto', country: 'Canada', region: 'ON' },
  { city: 'Vancouver', country: 'Canada', region: 'BC' },
  { city: 'Montreal', country: 'Canada', region: 'QC' },
  { city: 'Mexico City', country: 'Mexico' },
  // Europe
  { city: 'London', country: 'United Kingdom' },
  { city: 'Manchester', country: 'United Kingdom' },
  { city: 'Edinburgh', country: 'United Kingdom' },
  { city: 'Dublin', country: 'Ireland' },
  { city: 'Paris', country: 'France' },
  { city: 'Berlin', country: 'Germany' },
  { city: 'Munich', country: 'Germany' },
  { city: 'Hamburg', country: 'Germany' },
  { city: 'Amsterdam', country: 'Netherlands' },
  { city: 'Rotterdam', country: 'Netherlands' },
  { city: 'Madrid', country: 'Spain' },
  { city: 'Barcelona', country: 'Spain' },
  { city: 'Lisbon', country: 'Portugal' },
  { city: 'Rome', country: 'Italy' },
  { city: 'Milan', country: 'Italy' },
  { city: 'Zurich', country: 'Switzerland' },
  { city: 'Geneva', country: 'Switzerland' },
  { city: 'Vienna', country: 'Austria' },
  { city: 'Stockholm', country: 'Sweden' },
  { city: 'Copenhagen', country: 'Denmark' },
  { city: 'Oslo', country: 'Norway' },
  { city: 'Helsinki', country: 'Finland' },
  { city: 'Warsaw', country: 'Poland' },
  { city: 'Prague', country: 'Czech Republic' },
  { city: 'Budapest', country: 'Hungary' },
  { city: 'Athens', country: 'Greece' },
  { city: 'Istanbul', country: 'Turkey' },
  // Asia-Pacific
  { city: 'Bangalore', country: 'India' },
  { city: 'Bengaluru', country: 'India' },
  { city: 'Mumbai', country: 'India' },
  { city: 'Delhi', country: 'India' },
  { city: 'New Delhi', country: 'India' },
  { city: 'Hyderabad', country: 'India' },
  { city: 'Pune', country: 'India' },
  { city: 'Chennai', country: 'India' },
  { city: 'Kolkata', country: 'India' },
  { city: 'Gurugram', country: 'India' },
  { city: 'Noida', country: 'India' },
  { city: 'Ahmedabad', country: 'India' },
  { city: 'Jaipur', country: 'India' },
  { city: 'Kochi', country: 'India' },
  { city: 'Singapore', country: 'Singapore' },
  { city: 'Tokyo', country: 'Japan' },
  { city: 'Osaka', country: 'Japan' },
  { city: 'Kyoto', country: 'Japan' },
  { city: 'Seoul', country: 'South Korea' },
  { city: 'Hong Kong', country: 'Hong Kong' },
  { city: 'Shanghai', country: 'China' },
  { city: 'Beijing', country: 'China' },
  { city: 'Shenzhen', country: 'China' },
  { city: 'Taipei', country: 'Taiwan' },
  { city: 'Bangkok', country: 'Thailand' },
  { city: 'Jakarta', country: 'Indonesia' },
  { city: 'Kuala Lumpur', country: 'Malaysia' },
  { city: 'Manila', country: 'Philippines' },
  { city: 'Ho Chi Minh City', country: 'Vietnam' },
  { city: 'Hanoi', country: 'Vietnam' },
  { city: 'Sydney', country: 'Australia' },
  { city: 'Melbourne', country: 'Australia' },
  { city: 'Brisbane', country: 'Australia' },
  { city: 'Auckland', country: 'New Zealand' },
  // Middle East
  { city: 'Dubai', country: 'United Arab Emirates' },
  { city: 'Abu Dhabi', country: 'United Arab Emirates' },
  { city: 'Tel Aviv', country: 'Israel' },
  { city: 'Riyadh', country: 'Saudi Arabia' },
  { city: 'Doha', country: 'Qatar' },
  { city: 'Cairo', country: 'Egypt' },
  // Africa
  { city: 'Nairobi', country: 'Kenya' },
  { city: 'Cape Town', country: 'South Africa' },
  { city: 'Johannesburg', country: 'South Africa' },
  { city: 'Lagos', country: 'Nigeria' },
  { city: 'Accra', country: 'Ghana' },
  { city: 'Casablanca', country: 'Morocco' },
  // South America
  { city: 'São Paulo', country: 'Brazil' },
  { city: 'Rio de Janeiro', country: 'Brazil' },
  { city: 'Buenos Aires', country: 'Argentina' },
  { city: 'Santiago', country: 'Chile' },
  { city: 'Bogotá', country: 'Colombia' },
  { city: 'Lima', country: 'Peru' },
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim().toLowerCase()
  const limit = Math.min(parseInt(searchParams.get('limit') || '15'), 30)

  // 1. Static match (instant)
  const staticMatches = q
    ? CITIES.filter(c => {
        const label = `${c.city} ${c.country} ${c.region || ''}`.toLowerCase()
        return label.includes(q)
      })
    : CITIES.slice(0, limit)

  // 2. Merge with DB `locations` (custom / high-usage locations)
  const supabase = await createClient()
  let dbData: any[] = []
  try {
    let query = supabase.from('locations')
      .select('id, city, country, display, usage_count')
      .order('usage_count', { ascending: false })
      .limit(limit)
    if (q) query = query.or(`city.ilike.%${q}%,country.ilike.%${q}%,display.ilike.%${q}%`)
    const { data } = await query
    dbData = data || []
  } catch { /* ignore */ }

  // Merge, dedupe by displayed label
  const seen = new Set<string>()
  const merged: Array<{ label: string; city?: string; country?: string; source: 'db' | 'static' }> = []

  for (const d of dbData) {
    const label = d.display || `${d.city}${d.country ? ', ' + d.country : ''}`
    const norm = label.toLowerCase()
    if (seen.has(norm)) continue
    seen.add(norm)
    merged.push({ label, city: d.city, country: d.country, source: 'db' })
  }

  for (const c of staticMatches) {
    const label = c.region ? `${c.city}, ${c.region}, ${c.country}` : `${c.city}, ${c.country}`
    const norm = label.toLowerCase()
    if (seen.has(norm)) continue
    seen.add(norm)
    merged.push({ label, city: c.city, country: c.country, source: 'static' })
  }

  return NextResponse.json({ suggestions: merged.slice(0, limit) })
}
