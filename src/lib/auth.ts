// src/lib/auth.ts
//
// REFACTORED for Phase 1 Stable
// - approveUser/rejectUser dùng RPC functions từ DB (atomic transactions)
// - Map error code → message tiếng Việt thân thiện
// - Loại bỏ getDefaultFeatures() cũ (logic đã chuyển vào DB function)

import { supabase } from './supabase'
import type { Profile } from './supabase'


// ── Error Code → Vietnamese Message Mapping ─────────────────────
function mapErrorMessage(error: { code?: string; message?: string } | null): string {
  if (!error) return 'Lỗi không xác định'
  
  switch (error.code) {
    case '28000':
      return 'Bạn cần đăng nhập lại'
    case '42501':
      return 'Bạn không có quyền thực hiện thao tác này'
    case 'P0002':
      return 'Không tìm thấy người dùng'
    case 'P0001':
      if (error.message?.includes('not pending')) {
        return 'User này không còn ở trạng thái chờ duyệt'
      }
      if (error.message?.includes('Invalid feature_ids')) {
        return 'Cấu hình features mặc định bị lỗi, liên hệ admin'
      }
      if (error.message?.includes('Rejection reason is required')) {
        return 'Vui lòng nhập lý do từ chối'
      }
      if (error.message?.includes('Cannot grant admin to self')) {
        return 'Không thể tự cấp quyền admin'
      }
      if (error.message?.includes('Cannot change')) {
        return 'Không có quyền thay đổi thông tin này'
      }
      return error.message || 'Lỗi không xác định'
    default:
      if (error.code?.startsWith('PGRST')) {
        return 'Lỗi kết nối, vui lòng thử lại'
      }
      return error.message?.replace(/^ERROR:\s*/i, '') || 'Lỗi không xác định'
  }
}


// ── Profile queries ──────────────────────────────────────────────

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

export async function getPendingUsers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  if (error) return []
  return data as Profile[]
}


// ── Approve user (REFACTORED — dùng RPC atomic) ──────────────────
export async function approveUser(
  userId: string,
  _adminId?: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('approve_user', {
    p_user_id: userId,
  })
  
  if (error) {
    return { error: mapErrorMessage(error) }
  }
  return { error: null }
}


// ── Reject user (REFACTORED — dùng RPC atomic) ───────────────────
export async function rejectUser(
  userId: string,
  reason: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('reject_user', {
    p_user_id: userId,
    p_reason: reason,
  })
  
  if (error) {
    return { error: mapErrorMessage(error) }
  }
  return { error: null }
}


// ── DEPRECATED — giữ cho backward compat nếu UI cần đọc display ──
export async function getDefaultFeaturesForDisplay(): Promise<string[]> {
  const { data } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'default_features_for_new_user')
    .single()
  if (!data) return ['shopee_calculator_access']
  return data.value as string[]
}