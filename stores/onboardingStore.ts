import { create } from 'zustand'

interface OnboardingData {
  full_name: string
  username: string
  tagline: string
  location: string
  brings: string[]
  seeking: string[]
  skill_ids: string[]
  interest_topics: string[]
  institution_id: string
  institution_name: string
  degree: string
  field: string
  start_year: number
  is_current: boolean
  end_year: number
  availability: string
}

interface OnboardingStore {
  step: number
  data: Partial<OnboardingData>
  setStep: (step: number) => void
  updateData: (data: Partial<OnboardingData>) => void
  nextStep: () => void
  prevStep: () => void
  reset: () => void
}

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  step: 1,
  data: {},
  setStep: (step) => set({ step }),
  updateData: (data) =>
    set((state) => ({ data: { ...state.data, ...data } })),
  nextStep: () => set((state) => ({ step: state.step + 1 })),
  prevStep: () => set((state) => ({ step: Math.max(1, state.step - 1) })),
  reset: () => set({ step: 1, data: {} }),
}))