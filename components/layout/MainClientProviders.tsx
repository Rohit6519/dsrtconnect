'use client'

import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { MailIdentityProvider } from '@/components/mail/hooks/useMailIdentity'
import { ComposerProvider } from '@/components/mail/composer/ComposerContext'
import { ComposerModal } from '@/components/mail/composer/ComposerModal'
import { CommandPaletteProvider } from '@/components/command/CommandPaletteProvider'

export function MainClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      <CommandPaletteProvider>
        <MailIdentityProvider>
          <ComposerProvider>
            {children}
            <ComposerModal />
          </ComposerProvider>
        </MailIdentityProvider>
      </CommandPaletteProvider>
      
      <Toaster 
        theme="dark"
        toastOptions={{
          style: {
            background: '#0a0a0f',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
          },
        }}
      />
    </ThemeProvider>
  )
}