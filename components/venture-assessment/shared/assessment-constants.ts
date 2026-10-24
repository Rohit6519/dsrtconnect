// ═══════════════════════════════════════════════════════════════════
// SHARED TAXONOMIES USED ACROSS ASSESSMENT STEPS
// ═══════════════════════════════════════════════════════════════════

export const STAGE_OPTIONS = [
  { value: 'idea',      label: 'Idea' },
  { value: 'validation',label: 'Validation' },
  { value: 'building',  label: 'Building' },
  { value: 'mvp',       label: 'MVP' },
  { value: 'beta',      label: 'Beta' },
  { value: 'launched',  label: 'Launched' },
  { value: 'growing',   label: 'Growing' },
  { value: 'scaling',   label: 'Scaling' },
]

export const PRIMARY_SECTORS = [
  { value: 'Technology',           label: 'Technology' },
  { value: 'Artificial Intelligence', label: 'Artificial Intelligence' },
  { value: 'Fintech',              label: 'Fintech' },
  { value: 'Healthcare',           label: 'Healthcare' },
  { value: 'Biotech',              label: 'Biotech' },
  { value: 'Climate & Energy',     label: 'Climate & Energy' },
  { value: 'Consumer',             label: 'Consumer' },
  { value: 'Enterprise SaaS',      label: 'Enterprise SaaS' },
  { value: 'E-commerce',           label: 'E-commerce' },
  { value: 'Education',            label: 'Education' },
  { value: 'Media & Entertainment',label: 'Media & Entertainment' },
  { value: 'Marketplace',          label: 'Marketplace' },
  { value: 'Manufacturing',        label: 'Manufacturing' },
  { value: 'Hardware & Robotics',  label: 'Hardware & Robotics' },
  { value: 'Real Estate',          label: 'Real Estate' },
  { value: 'Agriculture',          label: 'Agriculture' },
  { value: 'Logistics',            label: 'Logistics' },
  { value: 'Web3 & Crypto',        label: 'Web3 & Crypto' },
  { value: 'Deep Tech',            label: 'Deep Tech' },
  { value: 'Social Impact',        label: 'Social Impact' },
  { value: 'Other',                label: 'Other' },
]

export const IMPACT_TAG_OPTIONS = [
  { value: 'time_loss',              label: 'Time loss' },
  { value: 'money_loss',             label: 'Money loss' },
  { value: 'operational_inefficiency', label: 'Operational inefficiency' },
  { value: 'missed_opportunity',     label: 'Missed opportunity' },
  { value: 'poor_experience',        label: 'Poor experience' },
  { value: 'risk',                   label: 'Risk exposure' },
  { value: 'other',                  label: 'Other' },
]

export const DISCOVERY_SOURCE_OPTIONS = [
  { value: 'personal',      label: 'I experienced it personally' },
  { value: 'observed',      label: 'I observed others facing it' },
  { value: 'industry',      label: 'I worked in the industry' },
  { value: 'research',      label: 'Through research' },
  { value: 'conversations', label: 'Customer conversations' },
  { value: 'academic',      label: 'Academic or project work' },
  { value: 'other',         label: 'Other' },
]

export const BUILD_RISK_OPTIONS = [
  { value: 'technical',    label: 'Technical' },
  { value: 'regulatory',   label: 'Regulatory' },
  { value: 'distribution', label: 'Distribution' },
  { value: 'capital',      label: 'Capital' },
  { value: 'operations',   label: 'Operations' },
  { value: 'trust',        label: 'Trust / adoption' },
  { value: 'other',        label: 'Other' },
]

export const DISTRIBUTION_CHANNEL_OPTIONS = [
  { value: 'direct_outreach', label: 'Direct outreach' },
  { value: 'community',       label: 'Community' },
  { value: 'organic_search',  label: 'Organic search / SEO' },
  { value: 'partnerships',    label: 'Partnerships' },
  { value: 'sales',           label: 'Direct sales' },
  { value: 'marketplace',     label: 'Marketplace' },
  { value: 'referrals',       label: 'Referrals' },
  { value: 'paid_acquisition',label: 'Paid acquisition' },
  { value: 'content',         label: 'Content / thought leadership' },
  { value: 'events',          label: 'Events' },
  { value: 'other',           label: 'Other' },
]

export const COMPETITOR_TYPE_OPTIONS = [
  { value: 'direct',          label: 'Direct competitor' },
  { value: 'indirect',        label: 'Indirect competitor' },
  { value: 'non_consumption', label: 'Non-consumption / manual alternative' },
]

export const CAPABILITY_AREAS = [
  { key: 'product',        label: 'Product' },
  { key: 'engineering',    label: 'Engineering' },
  { key: 'design',         label: 'Design' },
  { key: 'sales',          label: 'Sales' },
  { key: 'operations',     label: 'Operations' },
  { key: 'domain_expertise',label: 'Domain expertise' },
  { key: 'marketing',      label: 'Marketing' },
  { key: 'finance',        label: 'Finance' },
]

export const CAPABILITY_LEVEL_OPTIONS = [
  { value: 'covered',  label: 'Covered' },
  { value: 'partial',  label: 'Partially covered' },
  { value: 'missing',  label: 'Not covered' },
]

export const CONFIDENCE_OPTIONS = [
  { value: 'low',    label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high',   label: 'High' },
]

export const RISK_CATEGORY_OPTIONS = [
  { value: 'no_demand',    label: 'No real demand' },
  { value: 'competition',  label: 'Competition' },
  { value: 'technology',   label: 'Technology' },
  { value: 'regulation',   label: 'Regulation' },
  { value: 'distribution', label: 'Distribution' },
  { value: 'team',         label: 'Team' },
  { value: 'capital',      label: 'Capital' },
  { value: 'execution',    label: 'Execution' },
  { value: 'other',        label: 'Other' },
]