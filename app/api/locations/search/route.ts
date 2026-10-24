import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/locations/search?q=<query>
 *
 * Dual-provider strategy:
 *   1. Photon (komoot) — free, no UA restrictions, fast
 *   2. Nominatim fallback — if Photon fails
 *
 * Returns: { results: [{ display_name, lat, lon, address }] }
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').trim()

  if (q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  // ── Try Photon first (more reliable for free usage) ──────────────
  try {
    const photonUrl = new URL('https://photon.komoot.io/api/')
    photonUrl.searchParams.set('q', q)
    photonUrl.searchParams.set('limit', '10')
    photonUrl.searchParams.set('lang', 'en')

    const photonRes = await fetch(photonUrl.toString(), {
      headers: { Accept: 'application/json' },
      // @ts-ignore — Next.js cache option
      next: { revalidate: 3600 },
    })

    if (photonRes.ok) {
      const photonData = await photonRes.json()
      const features = Array.isArray(photonData?.features) ? photonData.features : []

      if (features.length > 0) {
        const results = features
          .map((f: any) => {
            const p = f.properties || {}
            const coords = f.geometry?.coordinates || [] // [lon, lat]
            const parts = [
              p.name,
              p.city || p.town || p.village || p.county,
              p.state,
              p.country,
            ].filter(Boolean)
            // Dedupe consecutive same parts
            const unique: string[] = []
            for (const part of parts) {
              if (unique[unique.length - 1] !== part) unique.push(part)
            }
            return {
              display_name: unique.join(', ') || p.name || 'Unknown',
              lat: String(coords[1] ?? ''),
              lon: String(coords[0] ?? ''),
              address: {
                city: p.city || p.town || p.village || p.name || null,
                state: p.state || null,
                country: p.country || null,
              },
            }
          })
          .filter((r: any) => r.display_name && r.lat && r.lon)

        if (results.length > 0) {
          return NextResponse.json({ results, provider: 'photon' })
        }
      }
    }
  } catch (err) {
    console.error('Photon geocoder failed, trying Nominatim:', err)
  }

  // ── Nominatim fallback ───────────────────────────────────────────
  try {
    const nomUrl = new URL('https://nominatim.openstreetmap.org/search')
    nomUrl.searchParams.set('q', q)
    nomUrl.searchParams.set('format', 'jsonv2')
    nomUrl.searchParams.set('addressdetails', '1')
    nomUrl.searchParams.set('limit', '10')
    nomUrl.searchParams.set('accept-language', 'en')

    const nomRes = await fetch(nomUrl.toString(), {
      headers: {
        'User-Agent': 'DSRT-Connect/1.0 (https://dsrt.io; contact@dsrt.io)',
        Accept: 'application/json',
        'Accept-Language': 'en',
      },
      // @ts-ignore
      next: { revalidate: 3600 },
    })

    if (!nomRes.ok) {
      console.error('Nominatim HTTP error:', nomRes.status)
      return NextResponse.json({ results: [], provider: 'none' })
    }

    const raw = await nomRes.json()
    if (!Array.isArray(raw)) {
      return NextResponse.json({ results: [], provider: 'none' })
    }

    const results = raw
      .filter((r: any) => r?.display_name && r?.lat && r?.lon)
      .map((r: any) => ({
        display_name: r.display_name,
        lat: String(r.lat),
        lon: String(r.lon),
        address: {
          city:
            r.address?.city ||
            r.address?.town ||
            r.address?.village ||
            r.address?.municipality ||
            null,
          state: r.address?.state || r.address?.state_district || null,
          country: r.address?.country || null,
        },
      }))

    return NextResponse.json({ results, provider: 'nominatim' })
  } catch (err) {
    console.error('Nominatim failed:', err)
    return NextResponse.json({ results: [], provider: 'none' })
  }
}