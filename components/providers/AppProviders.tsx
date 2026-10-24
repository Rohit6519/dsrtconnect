'use client'

import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import { SessionSyncProvider } from '@/components/auth/SessionSyncProvider'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <SessionSyncProvider>
        {children}
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            className: 'bg-[#0A0D14] border border-white/[0.08] text-white',
            descriptionClassName: 'text-white/60',
          }}
        />
      </SessionSyncProvider>
    </ThemeProvider>
  )
}