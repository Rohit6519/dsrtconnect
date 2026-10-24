'use client'

import { useAssessment } from './AssessmentContext'
import { Step01_Venture } from './steps/Step01_Venture'
import { Step02_Problem } from './steps/Step02_Problem'
import { Step03_Insight } from './steps/Step03_Insight'
import { Step04_Customer } from './steps/Step04_Customer'
import { Step05_Solution } from './steps/Step05_Solution'
import { Step06_Market } from './steps/Step06_Market'
import { Step07_Competition } from './steps/Step07_Competition'
import { Step08_FounderTeam } from './steps/Step08_FounderTeam'
import { Step09_RealityCheck } from './steps/Step09_RealityCheck'
import { Step10_NextMove } from './steps/Step10_NextMove'

export function AssessmentStepRouter() {
  const { currentStep } = useAssessment()

  switch (currentStep) {
    case 1:  return <Step01_Venture />
    case 2:  return <Step02_Problem />
    case 3:  return <Step03_Insight />
    case 4:  return <Step04_Customer />
    case 5:  return <Step05_Solution />
    case 6:  return <Step06_Market />
    case 7:  return <Step07_Competition />
    case 8:  return <Step08_FounderTeam />
    case 9:  return <Step09_RealityCheck />
    case 10: return <Step10_NextMove />
    default: return null
  }
}