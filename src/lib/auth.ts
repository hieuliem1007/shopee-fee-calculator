// src/lib/auth.ts
//
// REFACTORED for Phase 1 Stable
// - approveUser/rejectUser dùng RPC functions từ DB (atomic transactions)
// - Map error code → message tiếng Việt thân thiện
// - Loại bỏ getDefaultFeatures() cũ (logic đã chuyển vào DB function)

import { supabase } from './supabase'
import type { Profile, ProfileStatus } from './supabase'


// ── Activity log type ───────────────────────────────────────────
export interface ActivityLogEntry {
  id: string
  user_id: string
  action: string
  feature_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}


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
      if (error.message?.includes('Cannot suspend yourself')) {
        return 'Không thể tự khóa chính mình'
      }
      if (error.message?.includes('Cannot delete yourself')) {
        return 'Không thể tự xóa chính mình'
      }
      if (error.message?.includes('User is already suspended')) {
        return 'User này đã bị khóa rồi'
      }
      if (error.message?.includes('User is not suspended')) {
        return 'User này không ở trạng thái khóa'
      }
      if (error.message?.includes('User is already deleted')) {
        return 'User này đã bị xóa'
      }
      if (error.message?.includes('Suspension reason is required')) {
        return 'Vui lòng nhập lý do khóa'
      }
      if (error.message?.includes('Phone cannot be empty')) {
        return 'Số điện thoại không được rỗng'
      }
      if (error.message?.includes('Full name cannot be empty')) {
        return 'Tên không được rỗng'
      }
      if (error.message?.includes('No changes to apply')) {
        return 'Không có thay đổi nào để lưu'
      }
      if (error.message?.includes('Feature list cannot be empty')) {
        return 'Danh sách quyền không được rỗng'
      }
      if (error.message?.includes('Invalid feature ids')) {
        return 'Có quyền không tồn tại trong hệ thống'
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


// ── Admin: list users (paginated, filterable) ────────────────────
export interface ListUsersOptions {
  status?: ProfileStatus | 'all'
  search?: string
  page: number
  pageSize: number
}

export async function listUsers(
  options: ListUsersOptions
): Promise<{ users: Profile[]; total: number }> {
  const { status = 'all', search = '', page, pageSize } = options
  const from = page * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .eq('is_admin', false)

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const term = search.trim()
  if (term) {
    const safe = term.replace(/[%,]/g, ' ')
    const pattern = `%${safe}%`
    query = query.or(
      `full_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`
    )
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) return { users: [], total: 0 }
  return { users: (data ?? []) as Profile[], total: count ?? 0 }
}

export async function getUserById(id: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data as Profile
}

export async function getUserActivityLog(
  userId: string,
  limit: number = 50
): Promise<ActivityLogEntry[]> {
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return []
  return (data ?? []) as ActivityLogEntry[]
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


// ── Suspend / unsuspend / soft delete (RPC wrappers) ─────────────
export async function suspendUser(
  userId: string,
  reason: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('suspend_user', {
    p_user_id: userId,
    p_reason: reason,
  })
  if (error) return { error: mapErrorMessage(error) }
  return { error: null }
}

export async function unsuspendUser(
  userId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('unsuspend_user', {
    p_user_id: userId,
  })
  if (error) return { error: mapErrorMessage(error) }
  return { error: null }
}

export async function softDeleteUser(
  userId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('soft_delete_user', {
    p_user_id: userId,
  })
  if (error) return { error: mapErrorMessage(error) }
  return { error: null }
}

export interface UpdateUserProfileAdminInput {
  full_name?: string
  phone?: string
  package_label?: string | null
  package_note?: string | null
}

export async function updateUserProfileAdmin(
  userId: string,
  data: UpdateUserProfileAdminInput
): Promise<{ error: string | null }> {
  const params: Record<string, unknown> = { p_user_id: userId }
  if (data.full_name !== undefined) params.p_full_name = data.full_name
  if (data.phone !== undefined) params.p_phone = data.phone
  if (data.package_label !== undefined) params.p_package_label = data.package_label
  if (data.package_note !== undefined) params.p_package_note = data.package_note

  const { error } = await supabase.rpc('update_user_profile_admin', params)
  if (error) return { error: mapErrorMessage(error) }
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