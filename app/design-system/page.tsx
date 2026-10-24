// ============================================================
// app/design-system/page.tsx
// Server Component page wrapper.
// Enforces force-dynamic route segment config at build time.
// ============================================================

import DesignSystemClient from './DesignSystemClient'

export const dynamic = 'force-dynamic'

export default function Page() {
  return <DesignSystemClient />
}