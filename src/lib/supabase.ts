import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── Database row types (manual — matches PLAN.md schema) ──────────

export type ProfileStatus = 'pending' | 'active' | 'rejected' | 'suspended' | 'deleted'

export interface Profile {
  id: string
  full_name: string
  phone: string
  email: string
  status: ProfileStatus
  rejected_reason: string | null
  suspended_reason: string | null
  package_label: string | null
  package_note: string | null
  last_login_at: string | null
  feature_usage_count: number
  is_admin: boolean
  created_at: string
  updated_at: string
  approved_at: string | null
  approved_by: string | null
}

export interface Feature {
  id: string
  name: string
  description: string | null
  category: string
  parent_feature_id: string | null
  level: 1 | 2
  display_order: number
  is_default_for_new_user: boolean
  created_at: string
}

export interface SystemConfig {
  key: string
  value: unknown
  description: string | null
  updated_at: string
  updated_by: string | null
}
