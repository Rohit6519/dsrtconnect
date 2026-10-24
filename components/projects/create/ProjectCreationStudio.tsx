'use client'

import { useEffect, useCallback, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, LogOut } from 'lucide-react'
import { WarningCircle } from '@phosphor-icons/react'
import { DsrtLogo } from '@/components/ui/DsrtLogo'
import { useProjectCreationStore, ProjectStepKey } from '@/stores/projectCreationStore'

import { ProjectCreationSidebar, PROJECT_STEPS } from './ProjectCreationSidebar'
import { ProjectCreationFooter } from './ProjectCreationFooter'

import { IdentityStep } from './steps/IdentityStep'
import { DefinitionStep } from './steps/DefinitionStep'
import { BuildStep } from './steps/BuildStep'
import { CollaborationStep } from './steps/CollaborationStep'
import { PublishStep } from './steps/PublishStep'
import { DsrtPage, DsrtButton } from '@/components/dsrt'

const STEP_HEADINGS: Record<ProjectStepKey, { heading: string; description: string }> = {
  identity: {
    heading: 'Start with the identity of your project',
    description: 'Give your project a clear identity so people can understand what it is at a glance.',
  },
  definition: {
    heading: "Explain what you're building",
    description: 'Help people understand the problem, idea, and purpose behind your project.',
  },
  build: {
    heading: 'How is this project being built?',
    description: 'Tell DSRT about your development stage, technology stack, and source repository.',
  },
  collaboration: {
    heading: 'Decide who is involved',
    description: 'Set your collaboration preferences, invite team members, or draft open roles for DSRT Looking For.',
  },
  publish: {
    heading: 'Ready to launch?',
    description: 'Review your project preview and completeness checklist before making it live.',
  },
}

interface Props {
  continueDraftId?: string | null
}

export function ProjectCreationStudio({ continueDraftId }: Props) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [draftCount, setDraftCount] = useState<number>(0)
  const [showLimitWarning, setShowLimitWarning] = useState(false)
  const savingLock = useRef(false)

  const {
    data,
    currentStep,
    completedSteps,
    isSaving,
    hasUnsavedChanges,
    setCurrentStep,
    setSaving,
    markSaved,
    canNavigateToStep,
    reset,
    hydrateFromServer,
    updateData,
  } = useProjectCreationStore()

  useEffect(() => {
    const init = async () => {
      try {
        const countRes = await fetch('/api/projects/drafts/count')
        const countData = await countRes.json().catch(() => ({ count: 0, limit: 10 }))
        setDraftCount(countData.count || 0)

        if (continueDraftId) {
          const res = await fetch(`/api/projects/draft/${encodeURIComponent(continueDraftId)}`)
          const json = await res.json().catch(() => ({}))

          if (res.ok && json.draft) {
            reset()
            hydrateFromServer(json.draft)
            toast.success(`Resumed draft: ${json.draft.name || 'Untitled'}`)
          } else {
            toast.error(json.error || 'Could not load draft')
            router.replace('/projects/create')
            return
          }
        } else {
          // Keep local in-progress draft if present; otherwise start fresh
          const hasLocal = !!(useProjectCreationStore.getState().data.name || useProjectCreationStore.getState().data.id)
          if (!hasLocal) reset()

          if ((countData.count || 0) >= (countData.limit || 10)) {
            setShowLimitWarning(true)
          }
        }
      } catch (err) {
        console.error('Init error:', err)
        toast.error('Failed to initialize project studio')
      } finally {
        setInitializing(false)
        setMounted(true)
      }
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [continueDraftId])

  const triggerAutoSave = useCallback(
    async (isExiting = false) => {
      if (savingLock.current) return null
      if (!data.name || data.name.trim().length < 2) {
        if (isExiting) toast.error('Add a project name (min 2 characters) before saving')
        return null
      }

      savingLock.current = true
      setSaving(true)
      try {
        const res = await fetch('/api/projects/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        const result = await res.json().catch(() => ({}))

        if (!res.ok) {
          if (result.code === 'DRAFT_LIMIT_REACHED') {
            toast.error(result.error || 'Draft limit reached', { duration: 6000 })
            setShowLimitWarning(true)
            if (isExiting) router.push('/projects')
            return null
          }
          throw new Error(result.error || 'Save failed')
        }

        if (result.project?.id) {
          // Keep id in store so publish works
          if (data.id !== result.project.id) {
            updateData({ id: result.project.id })
          }
        }

        markSaved()

        if (isExiting) {
          toast.success('Project draft saved')
          reset()
          router.push('/projects')
        }

        return result.project || null
      } catch (e: any) {
        console.error('Autosave error:', e)
        toast.error(e.message || 'Failed to save draft')
        return null
      } finally {
        setSaving(false)
        savingLock.current = false
      }
    },
    [data, markSaved, router, setSaving, reset, updateData]
  )

  // Debounced autosave while editing
  useEffect(() => {
    if (!mounted || initializing) return
    if (!hasUnsavedChanges) return
    if (!data.name || data.name.trim().length < 2) return

    const t = setTimeout(() => {
      triggerAutoSave(false)
    }, 1200)

    return () => clearTimeout(t)
  }, [data, hasUnsavedChanges, mounted, initializing, triggerAutoSave])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden' && hasUnsavedChanges) {
        triggerAutoSave(false)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [hasUnsavedChanges, triggerAutoSave])

  const handleSaveExit = () => triggerAutoSave(true)

  const handleNext = async () => {
    const steps: ProjectStepKey[] = ['identity', 'definition', 'build', 'collaboration', 'publish']
    const idx = steps.indexOf(currentStep)
    if (idx < steps.length - 1) {
      const nextStep = steps[idx + 1]
      setCurrentStep(nextStep)
      if (hasUnsavedChanges) await triggerAutoSave(false)
    }
  }

  const handleBack = () => {
    const steps: ProjectStepKey[] = ['identity', 'definition', 'build', 'collaboration', 'publish']
    const idx = steps.indexOf(currentStep)
    if (idx > 0) setCurrentStep(steps[idx - 1])
  }

  const handlePublishClick = async () => {
    // Ensure draft exists/saved before publish step trigger
    if (!data.id || hasUnsavedChanges) {
      const saved = await triggerAutoSave(false)
      if (!saved?.id && !useProjectCreationStore.getState().data.id) {
        toast.error('Could not save draft before publishing')
        return
      }
    }
    document.getElementById('hidden-publish-trigger')?.click()
  }

  if (!mounted || initializing) {
    return (
      <div className="min-h-screen bg-[#05070D] flex flex-col items-center justify-center gap-4">
        <DsrtLogo size={48} showText={false} />
        <p className="text-[11px] font-mono font-bold text-white/40 tracking-widest uppercase">
          Loading Studio...
        </p>
      </div>
    )
  }

  const { heading, description } = STEP_HEADINGS[currentStep]
  const currentStepNumber = PROJECT_STEPS.findIndex(s => s.key === currentStep) + 1
  const canContinueCurrent =
    completedSteps[currentStep] ||
    currentStep === 'publish' ||
    currentStep === 'build' ||
    currentStep === 'collaboration'
  const isAtLimit = draftCount >= 10 && !continueDraftId && !data.id

  return (
    <div className="min-h-screen bg-[#05070D] text-white flex flex-col">
      <header className="sticky top-0 z-30 bg-[#05070D]/95 backdrop-blur-md border-b border-white/[0.06] h-16 flex items-center px-4 sm:px-6">
        <div className="max-w-[1400px] w-full mx-auto flex items-center justify-between">
          <DsrtLogo size={26} showText />

          <div className="flex items-center gap-3">
            {isSaving ? (
              <span className="text-[11px] font-mono text-white/40 flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving...
              </span>
            ) : data.id ? (
              <span className="text-[11px] font-mono text-white/40">Draft saved</span>
            ) : null}

            <DsrtButton
              size="xs"
              variant="ghost"
              onClick={handleSaveExit}
              disabled={isSaving || !data.name}
            >
              <LogOut className="w-3.5 h-3.5" /> Save & Exit
            </DsrtButton>
          </div>
        </div>
      </header>

      {(showLimitWarning || isAtLimit) && (
        <DraftLimitBanner
          count={draftCount}
          limit={10}
          isAtLimit={isAtLimit}
          onDismiss={() => setShowLimitWarning(false)}
          onGoBack={() => router.push('/projects')}
        />
      )}

      <main className="flex-1 py-6 sm:py-10">
        <DsrtPage width="wide">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
            <ProjectCreationSidebar
              currentStep={currentStep}
              completedSteps={completedSteps}
              canNavigateToStep={canNavigateToStep}
              onStepClick={setCurrentStep}
            />

            <div className="flex-1 min-w-0 max-w-[680px]">
              <div className="mb-6">
                <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-1">
                  Step {currentStepNumber} of {PROJECT_STEPS.length}
                </p>
                <h1 className="text-[22px] sm:text-[26px] font-bold text-white tracking-tight leading-tight">
                  {heading}
                </h1>
                <p className="text-[13px] text-white/60 mt-1.5 leading-relaxed">
                  {description}
                </p>
              </div>

              <div className="space-y-6">
                {currentStep === 'identity' && <IdentityStep />}
                {currentStep === 'definition' && <DefinitionStep />}
                {currentStep === 'build' && <BuildStep />}
                {currentStep === 'collaboration' && <CollaborationStep />}
                {currentStep === 'publish' && <PublishStep />}
              </div>

              <ProjectCreationFooter
                currentStep={currentStep}
                isSaving={isSaving}
                canContinue={canContinueCurrent && !isAtLimit}
                onBack={handleBack}
                onContinue={handleNext}
                onPublish={handlePublishClick}
              />
            </div>
          </div>
        </DsrtPage>
      </main>
    </div>
  )
}

function DraftLimitBanner({
  count,
  limit,
  isAtLimit,
  onDismiss,
  onGoBack,
}: {
  count: number
  limit: number
  isAtLimit: boolean
  onDismiss: () => void
  onGoBack: () => void
}) {
  return (
    <div className={`border-b ${isAtLimit ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <WarningCircle className={`w-4 h-4 shrink-0 ${isAtLimit ? 'text-red-400' : 'text-amber-300'}`} />
          <p className="text-[12px] text-white/80">
            {isAtLimit ? (
              <>Draft limit reached ({count}/{limit}). Publish or archive a draft to continue.</>
            ) : (
              <>You have {count} of {limit} active drafts.</>
            )}
          </p>
        </div>
        {isAtLimit ? (
          <DsrtButton size="xs" variant="outline" onClick={onGoBack}>Manage Drafts</DsrtButton>
        ) : (
          <button onClick={onDismiss} className="text-[11px] font-mono text-white/40 hover:text-white">Dismiss</button>
        )}
      </div>
    </div>
  )
}