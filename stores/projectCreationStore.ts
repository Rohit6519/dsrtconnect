// stores/projectCreationStore.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type ProjectStepKey = 'identity' | 'definition' | 'build' | 'collaboration' | 'publish'

export interface ProjectDraftData {
  id?: string
  name: string
  project_type: string
  tagline: string
  logo_url: string | null
  cover_image_url: string | null
  
  description: string
  problem_statement: string
  goals: string
  primary_domain: string
  domains: string[]
  
  stage: string
  technologies: string[]
  repository_url: string
  is_open_source: boolean
  license: string
  
  collaboration_status: 'solo' | 'has_collaborators' | 'looking_for_collaborators' | 'open_to_contributors'
  collaborators: any[]
  looking_for_roles: any[]
  
  visibility: 'public' | 'unlisted' | 'private'
  show_in_explore: boolean
  show_on_profile: boolean
}

interface ProjectCreationStore {
  data: ProjectDraftData
  currentStep: ProjectStepKey
  completedSteps: Record<ProjectStepKey, boolean>
  isSaving: boolean
  hasUnsavedChanges: boolean
  lastSavedAt: string | null

  setCurrentStep: (step: ProjectStepKey) => void
  updateData: (partial: Partial<ProjectDraftData>) => void
  setSaving: (saving: boolean) => void
  markSaved: () => void
  setStepCompleted: (step: ProjectStepKey, completed: boolean) => void
  canNavigateToStep: (step: ProjectStepKey) => boolean
  reset: () => void
  hydrateFromServer: (draft: Partial<ProjectDraftData>) => void
}

const initialData: ProjectDraftData = {
  name: '',
  project_type: 'software',
  tagline: '',
  logo_url: null,
  cover_image_url: null,
  description: '',
  problem_statement: '',
  goals: '',
  primary_domain: '',
  domains: [],
  stage: 'idea',
  technologies: [],
  repository_url: '',
  is_open_source: false,
  license: '',
  collaboration_status: 'solo',
  collaborators: [],
  looking_for_roles: [],
  visibility: 'public',
  show_in_explore: true,
  show_on_profile: true,
}

const initialCompleted: Record<ProjectStepKey, boolean> = {
  identity: false,
  definition: false,
  build: false,
  collaboration: false,
  publish: false,
}

export const useProjectCreationStore = create<ProjectCreationStore>()(
  persist(
    (set, get) => ({
      data: initialData,
      currentStep: 'identity',
      completedSteps: initialCompleted,
      isSaving: false,
      hasUnsavedChanges: false,
      lastSavedAt: null,

      setCurrentStep: (step) => {
        if (get().canNavigateToStep(step)) {
          set({ currentStep: step })
        }
      },
      
      updateData: (partial) => {
        const newData = { ...get().data, ...partial }
        
        // Recalculate step completions automatically
        const completed = { ...get().completedSteps }
        completed.identity = !!(newData.name && newData.name.trim().length >= 2 && newData.project_type && newData.tagline && newData.tagline.trim().length >= 3)
        completed.definition = !!(newData.description && newData.description.trim().length >= 10 && newData.primary_domain)
        completed.build = !!(newData.stage)
        completed.collaboration = !!(newData.collaboration_status)
        completed.publish = false

        set({
          data: newData,
          completedSteps: completed,
          hasUnsavedChanges: true,
        })
      },
      
      setSaving: (saving) => set({ isSaving: saving }),
      
      markSaved: () => set({ hasUnsavedChanges: false, lastSavedAt: new Date().toISOString() }),

      setStepCompleted: (step, completed) => set((s) => ({
        completedSteps: { ...s.completedSteps, [step]: completed }
      })),

      canNavigateToStep: (targetStep) => {
        const steps: ProjectStepKey[] = ['identity', 'definition', 'build', 'collaboration', 'publish']
        const targetIdx = steps.indexOf(targetStep)
        const currentIdx = steps.indexOf(get().currentStep)
        
        if (targetIdx <= currentIdx) return true
        
        for (let i = 0; i < targetIdx; i++) {
          const stepKey = steps[i]
          if (!get().completedSteps[stepKey]) return false
        }
        return true
      },

      reset: () => set({
        data: initialData,
        currentStep: 'identity',
        completedSteps: initialCompleted,
        isSaving: false,
        hasUnsavedChanges: false,
        lastSavedAt: null
      }),

      hydrateFromServer: (draft) => {
        const completed: Record<ProjectStepKey, boolean> = { ...initialCompleted }
        
        if (draft.name && draft.name.trim().length >= 2 && draft.project_type && draft.tagline) {
          completed.identity = true
        }
        if (draft.description && (draft.primary_domain || (draft.domains && draft.domains.length > 0))) {
          completed.definition = true
        }
        if (draft.stage) {
          completed.build = true
        }
        if (draft.collaboration_status) {
          completed.collaboration = true
        }

        set((s) => ({
          data: { ...s.data, ...draft },
          completedSteps: completed,
          hasUnsavedChanges: false
        }))
      }
    }),
    {
      name: 'dsrt-project-draft-v3',
      storage: createJSONStorage(() => localStorage),
    }
  )
)