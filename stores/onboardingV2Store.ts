import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type OnboardingStepKey = 'identity' | 'profile' | 'professional' | 'skills' | 'personalization' | 'security_pin'
export type OnboardingState = 'IDENTITY' | 'PROFILE' | 'PROFESSIONAL' | 'SKILLS' | 'PERSONALIZATION' | 'SECURITY_PIN' | 'COMPLETED'
export type StepStatus = 'NOT_VISITED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED'

export interface LocationData {
  display_name: string
  city: string
  region?: string
  country: string
  country_code?: string
  latitude?: number
  longitude?: number
  provider_place_id?: string
}

export interface Skill {
  id: string
  canonical_name: string
  category: string
  subcategory?: string
}

export interface OnboardingFormData {
  // Step 1: Identity
  username: string
  usernameValid: boolean
  
  // Step 2: Profile
  display_name: string
  avatar_url: string | null
  avatar_status: 'NOT_SET' | 'UPLOADED' | 'SKIPPED'
  location_data: LocationData | null
  
  // Step 3: Professional
  professional_roles: string[]
  
  // Step 4: Skills
  skills: Skill[]
  skills_skipped: boolean
  
  // Step 5: Personalization
  goals: string[]
  interest_topics: string[]
  building_status: 'ACTIVELY_BUILDING' | 'EXPLORING_IDEA' | 'LOOKING_TO_JOIN' | 'NOT_RIGHT_NOW' | ''
  building_intent: {
    project_name?: string
    project_description?: string
  }
}

interface OnboardingV2Store {
  // Server state
  onboarding_state: OnboardingState
  step_states: Record<OnboardingStepKey, StepStatus>
  
  // Client form buffer
  data: OnboardingFormData
  
  // UI state
  currentStep: OnboardingStepKey
  isSaving: boolean
  hasUnsavedChanges: boolean
  
  // Actions
  setOnboardingState: (state: OnboardingState) => void
  setStepStates: (states: Record<OnboardingStepKey, StepStatus>) => void
  setCurrentStep: (step: OnboardingStepKey) => void
  updateData: (partial: Partial<OnboardingFormData>) => void
  markStepComplete: (step: OnboardingStepKey) => void
  markStepSkipped: (step: OnboardingStepKey) => void
  setSaving: (saving: boolean) => void
  setUnsavedChanges: (has: boolean) => void
  reset: () => void
  hydrateFromServer: (payload: {
    onboarding_state: OnboardingState
    step_states: Record<OnboardingStepKey, StepStatus>
    profile: any
  }) => void
}

const initialData: OnboardingFormData = {
  username: '',
  usernameValid: false,
  display_name: '',
  avatar_url: null,
  avatar_status: 'NOT_SET',
  location_data: null,
  professional_roles: [],
  skills: [],
  skills_skipped: false,
  goals: [],
  interest_topics: [],
  building_status: '',
  building_intent: {},
}

const initialStepStates: Record<OnboardingStepKey, StepStatus> = {
  identity: 'NOT_VISITED',
  profile: 'NOT_VISITED',
  professional: 'NOT_VISITED',
  skills: 'NOT_VISITED',
  personalization: 'NOT_VISITED',
  security_pin: 'NOT_VISITED',
}

// Map state machine → current step
export function stateToStep(state: OnboardingState): OnboardingStepKey {
  switch (state) {
    case 'IDENTITY': return 'identity'
    case 'PROFILE': return 'profile'
    case 'PROFESSIONAL': return 'professional'
    case 'SKILLS': return 'skills'
    case 'PERSONALIZATION': return 'personalization'
    case 'SECURITY_PIN': return 'security_pin'
    case 'COMPLETED': return 'security_pin'
    default: return 'identity'
  }
}

export function stepToState(step: OnboardingStepKey): OnboardingState {
  switch (step) {
    case 'identity': return 'IDENTITY'
    case 'profile': return 'PROFILE'
    case 'professional': return 'PROFESSIONAL'
    case 'skills': return 'SKILLS'
    case 'personalization': return 'PERSONALIZATION'
    case 'security_pin': return 'SECURITY_PIN'
  }
}

export const useOnboardingV2Store = create<OnboardingV2Store>()(
  persist(
    (set, get) => ({
      onboarding_state: 'IDENTITY',
      step_states: initialStepStates,
      data: initialData,
      currentStep: 'identity',
      isSaving: false,
      hasUnsavedChanges: false,

      setOnboardingState: (state) => set({ onboarding_state: state }),
      
      setStepStates: (states) => set({ step_states: states }),
      
      setCurrentStep: (step) => set({ currentStep: step }),
      
      updateData: (partial) => set((s) => ({
        data: { ...s.data, ...partial },
        hasUnsavedChanges: true,
      })),
      
      markStepComplete: (step) => set((s) => ({
        step_states: { ...s.step_states, [step]: 'COMPLETED' },
        hasUnsavedChanges: false,
      })),
      
      markStepSkipped: (step) => set((s) => ({
        step_states: { ...s.step_states, [step]: 'SKIPPED' },
        hasUnsavedChanges: false,
      })),
      
      setSaving: (saving) => set({ isSaving: saving }),
      
      setUnsavedChanges: (has) => set({ hasUnsavedChanges: has }),
      
      reset: () => set({
        onboarding_state: 'IDENTITY',
        step_states: initialStepStates,
        data: initialData,
        currentStep: 'identity',
        isSaving: false,
        hasUnsavedChanges: false,
      }),
      
      hydrateFromServer: ({ onboarding_state, step_states, profile }) => {
        const currentStep = stateToStep(onboarding_state)
        
        set({
          onboarding_state,
          step_states,
          currentStep,
          data: {
            username: profile?.username || '',
            usernameValid: !!(profile?.username && !profile.username.startsWith('pending_')),
            display_name: profile?.full_name || '',
            avatar_url: profile?.avatar_url || null,
            avatar_status: profile?.avatar_status || (profile?.avatar_url ? 'UPLOADED' : 'NOT_SET'),
            location_data: profile?.location_data || null,
            professional_roles: profile?.professional_roles || [],
            skills: [],
            skills_skipped: step_states.skills === 'SKIPPED',
            goals: profile?.goals || [],
            interest_topics: profile?.interest_topics || [],
            building_status: profile?.building_status || '',
            building_intent: profile?.building_intent || {},
          },
          hasUnsavedChanges: false,
        })
      },
    }),
    {
      name: 'dsrt-onboarding-v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        data: s.data,
        currentStep: s.currentStep,
      }),
    }
  )
)