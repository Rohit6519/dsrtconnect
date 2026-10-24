'use client'

import React from 'react'
import { Warning, ArrowClockwise } from '@phosphor-icons/react'

type Props = {
  children: React.ReactNode
  label?: string
  onReset?: () => void
}

type State = { error: Error | null }

export class MailErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[DSRT Mail ErrorBoundary]', this.props.label || 'mail', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex-1 min-h-[240px] flex flex-col items-center justify-center text-center p-8 bg-[#0a0a0f]">
          <div className="w-12 h-12 rounded-xl bg-red-500/[0.08] border border-red-500/20 flex items-center justify-center mb-3">
            <Warning className="w-5 h-5 text-red-300" weight="fill" />
          </div>
          <p className="text-[14px] font-bold text-white mb-1">
            {this.props.label || 'Mail'} hit an unexpected error
          </p>
          <p className="text-[12px] text-white/45 max-w-sm mb-4">
            Your data is safe. Try reloading this panel. If it keeps happening, refresh the page.
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ error: null })
              this.props.onReset?.()
            }}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-[12.5px] font-semibold text-white"
          >
            <ArrowClockwise className="w-3.5 h-3.5" />
            Reload panel
          </button>
        </div>
      )
    }
    return this.props.children
  }
}