// src/lib/activity-log.ts
//
// Phase 7 — wrapper RPC list_activity_log (admin only).
// Đọc 19 action server-side đã track sẵn từ Phase 1-3.

import { supabase } from './supabase'

export interface ActivityLogRow {
  id: string
  user_id: string | null
  user_email: string | null
  user_full_name: string | null
  action: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface ListActivityLogParams {
  search?: string
  actionPrefix?: string  // 'admin.', 'user.', 'fee.', 'category.', 'profile.', 'system_config.'
  userId?: string
  from?: string  // ISO timestamp
  to?: string
  offset?: number
  limit?: number
}

export interface ListActivityLogResult {
  total: number
  rows: ActivityLogRow[]
}

export async function listActivityLog(
  params: ListActivityLogParams = {}
): Promise<{ data: ListActivityLogResult | null; error: string | null }> {
  const { data, error } = await supabase.rpc('list_activity_log', {
    p_search: params.search ?? null,
    p_action_prefix: params.actionPrefix ?? null,
    p_user_id: params.userId ?? null,
    p_from: params.from ?? null,
    p_to: params.to ?? null,
    p_offset: params.offset ?? 0,
    p_limit: params.limit ?? 50,
  })
  if (error) {
    return { data: null, error: error.message ?? 'Lỗi không xác định' }
  }
  return { data: data as ListActivityLogResult, error: null }
}
