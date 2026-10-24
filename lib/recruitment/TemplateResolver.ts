import { createClient } from '@/lib/supabase/server'
import type { RecruitmentTemplate, TemplateScope } from './types'

/**
 * Resolve which template to use for a given key.
 * Order:
 *   1. Opportunity-specific override (scope='opportunity')
 *   2. Organization override (scope='organization')  [when org linked]
 *   3. Global DSRT default (scope='global')
 */
export async function resolveTemplate(params: {
  template_key: string
  opportunity_id?: string | null
  organization_id?: string | null
}): Promise<{ template: RecruitmentTemplate; scope_used: TemplateScope } | null> {
  const supabase = await createClient()

  // 1. opportunity scope
  if (params.opportunity_id) {
    const { data: t } = await supabase
      .from('recruitment_templates')
      .select('*')
      .eq('template_key', params.template_key)
      .eq('scope', 'opportunity')
      .eq('opportunity_id', params.opportunity_id)
      .eq('is_active', true)
      .maybeSingle()
    if (t) return { template: t as RecruitmentTemplate, scope_used: 'opportunity' }
  }

  // 2. organization scope
  if (params.organization_id) {
    const { data: t } = await supabase
      .from('recruitment_templates')
      .select('*')
      .eq('template_key', params.template_key)
      .eq('scope', 'organization')
      .eq('organization_id', params.organization_id)
      .eq('is_active', true)
      .maybeSingle()
    if (t) return { template: t as RecruitmentTemplate, scope_used: 'organization' }
  }

  // 3. global default
  const { data: g } = await supabase
    .from('recruitment_templates')
    .select('*')
    .eq('template_key', params.template_key)
    .eq('scope', 'global')
    .eq('is_active', true)
    .maybeSingle()
  if (g) return { template: g as RecruitmentTemplate, scope_used: 'global' }

  return null
}