import { supabase } from './supabase'
import type { Profile } from './supabase'

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) return null
  return data as Profile
}

export async function updateLastLogin(userId: string) {
  await supabase
    .from('profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', userId)
}

export async function getDefaultFeatures(): Promise<string[]> {
  const { data } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'default_features_for_new_user')
    .single()
  if (!data) return ['shopee_calculator_access']
  return data.value as string[]
}

export async function approveUser(userId: string, adminId: string): Promise<{ error: string | null }> {
  const defaultFeatures = await getDefaultFeatures()

  const { error: statusError } = await supabase
    .from('profiles')
    .update({
      status: 'active',
      approved_at: new Date().toISOString(),
      approved_by: adminId,
    })
    .eq('id', userId)

  if (statusError) return { error: statusError.message }

  const featureRows = defaultFeatures.map((fid) => ({
    user_id: userId,
    feature_id: fid,
    granted_by: adminId,
  }))

  const { error: featError } = await supabase
    .from('user_features')
    .upsert(featureRows, { onConflict: 'user_id,feature_id' })

  if (featError) return { error: featError.message }
  return { error: null }
}

export async function rejectUser(
  userId: string,
  reason: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update({ status: 'rejected', rejected_reason: reason })
    .eq('id', userId)
  return { error: error?.message ?? null }
}

export async function getPendingUsers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  if (error) return []
  return data as Profile[]
}
