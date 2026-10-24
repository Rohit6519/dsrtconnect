import { createClient } from '@/lib/supabase/server'
import { ReferralView } from '@/components/referrals/ReferralView'
import { DsrtPage } from '@/components/dsrt'

export default async function ReferralsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let { data: code } = await supabase
    .from('referral_codes')
    .select('*')
    .eq('user_id', user!.id)
    .maybeSingle()

  if (!code) {
    await supabase.rpc('generate_referral_code', { p_user_id: user!.id })
    const { data: newCode } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('user_id', user!.id)
      .maybeSingle()
    code = newCode
  }

  const { data: referrals } = await supabase
    .from('referrals')
    .select('*, users:referred_id(full_name, username, avatar_url, created_at)')
    .eq('referrer_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <DsrtPage width="default" className="py-8">
      <ReferralView code={code} referrals={referrals || []} />
    </DsrtPage>
  )
}