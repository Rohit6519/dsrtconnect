import {
  TextAa,
  TextT,
  RadioButton,
  CheckSquare,
  Check,
  Link as LinkIcon,
  Hash,
  CalendarBlank,
  Paperclip,
  FolderSimple,
  Rocket,
  Sparkle,
} from '@phosphor-icons/react'

export type QuestionType =
  | 'short_text'
  | 'long_text'
  | 'single_choice'
  | 'multi_choice'
  | 'checkbox'
  | 'url'
  | 'number'
  | 'date'
  | 'file'
  | 'project_select'
  | 'venture_select'
  | 'skill_select'

export const QUESTION_TYPE_META: Record<
  QuestionType,
  { label: string; hint: string; Icon: any; hasOptions: boolean }
> = {
  short_text: {
    label: 'Short answer',
    hint: 'One-line text (up to 200 chars).',
    Icon: TextAa,
    hasOptions: false,
  },
  long_text: {
    label: 'Long answer',
    hint: 'Multi-line text (up to 2000 chars).',
    Icon: TextT,
    hasOptions: false,
  },
  single_choice: {
    label: 'Single choice',
    hint: 'Pick exactly one option.',
    Icon: RadioButton,
    hasOptions: true,
  },
  multi_choice: {
    label: 'Multiple choice',
    hint: 'Pick one or more options.',
    Icon: CheckSquare,
    hasOptions: true,
  },
  checkbox: {
    label: 'Yes / No',
    hint: 'A single confirmation checkbox.',
    Icon: Check,
    hasOptions: false,
  },
  url: {
    label: 'URL',
    hint: 'A valid link (https://…).',
    Icon: LinkIcon,
    hasOptions: false,
  },
  number: {
    label: 'Number',
    hint: 'Numeric input (optional min/max).',
    Icon: Hash,
    hasOptions: false,
  },
  date: {
    label: 'Date',
    hint: 'Applicant picks a calendar date.',
    Icon: CalendarBlank,
    hasOptions: false,
  },
  file: {
    label: 'File upload',
    hint: 'Attach a file (PDF, doc, image).',
    Icon: Paperclip,
    hasOptions: false,
  },
  project_select: {
    label: 'Relevant project',
    hint: 'Pick a DSRT project from their portfolio.',
    Icon: FolderSimple,
    hasOptions: false,
  },
  venture_select: {
    label: 'Relevant venture',
    hint: 'Pick a DSRT venture they are part of.',
    Icon: Rocket,
    hasOptions: false,
  },
  skill_select: {
    label: 'Skill selection',
    hint: 'Pick one or more skills from their profile.',
    Icon: Sparkle,
    hasOptions: false,
  },
}

export const QUESTION_GROUPS: { title: string; types: QuestionType[] }[] = [
  { title: 'Text', types: ['short_text', 'long_text', 'url'] },
  { title: 'Choice', types: ['single_choice', 'multi_choice', 'checkbox'] },
  { title: 'Structured', types: ['number', 'date', 'file'] },
  {
    title: 'DSRT-linked',
    types: ['project_select', 'venture_select', 'skill_select'],
  },
]

export const DEFAULT_LABELS: Record<QuestionType, string> = {
  short_text: 'Short answer question',
  long_text: 'Why are you interested in this opportunity?',
  single_choice: 'Choose one option',
  multi_choice: 'Select all that apply',
  checkbox: 'I confirm I have read the requirements',
  url: 'Share a relevant link',
  number: 'Enter a number',
  date: 'Select a date',
  file: 'Upload a supporting file',
  project_select: 'Select your most relevant project',
  venture_select: 'Select a venture you are part of',
  skill_select: 'Select relevant skills',
}