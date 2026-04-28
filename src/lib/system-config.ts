// src/lib/system-config.ts
//
// Admin wrapper cho bảng system_config.
//
// Note quan trọng: cột `value` là jsonb. Supabase JS client sẽ trả về
// native JS value:
//   - jsonb '"abc"' → "abc" (string)
//   - jsonb '90' → 90 (number)
//   - jsonb '["a","b"]' → ["a", "b"] (array)
// → display: convert non-string sang JSON.stringify để render dễ.
// → edit: RPC `update_system_config_value(p_key, p_value text)` luôn
//   cast `to_jsonb(text)` ⇒ sau khi save, value sẽ thành string trong jsonb.
//   Edit UI cảnh báo khi config gốc là array/number.

import { supabase } from './supabase'

export interface SystemConfigEntry {
  key: string
  value: string         // Display string (đã convert từ jsonb)
  raw: unknown          // Raw value từ DB để check kiểu gốc
  is_string: boolean    // true nếu jsonb gốc là string
  description: string | null
  updated_at: string
  updated_by: string | null
}

function toDisplay(raw: unknown): { value: string; is_string: boolean } {
  if (typeof raw === 'string') return { value: raw, is_string: true }
  return { value: JSON.stringify(raw), is_string: false }
}

function extractError(error: { code?: string; message?: string } | null): string {
  if (!error) return 'Lỗi không xác định'
  return error.message?.replace(/^ERROR:\s*/i, '') || 'Lỗi không xác định'
}

export async function listSystemConfig(): Promise<SystemConfigEntry[]> {
  const { data, error } = await supabase
    .from('system_config')
    .select('key, value, description, updated_at, updated_by')
    .order('key', { ascending: true })

  if (error) return []
  return (data ?? []).map(row => {
    const r = row as {
      key: string; value: unknown; description: string | null
      updated_at: string; updated_by: string | null
    }
    const { value, is_string } = toDisplay(r.value)
    return {
      key: r.key,
      value,
      raw: r.value,
      is_string,
      description: r.description,
      updated_at: r.updated_at,
      updated_by: r.updated_by,
    }
  })
}

export async function updateSystemConfig(
  key: string,
  value: string
): Promise<{ data: { success: boolean; changed: boolean } | null; error: string | null }> {
  const { data, error } = await supabase.rpc('update_system_config_value', {
    p_key: key,
    p_value: value,
  })
  if (error) return { data: null, error: extractError(error) }
  return { data: data as { success: boolean; changed: boolean }, error: null }
}

// Validate value cho từng key đặc biệt. Return error message nếu invalid.
export function validateConfigValue(key: string, value: string): string | null {
  if (!value || value.length === 0) return 'Giá trị không được rỗng'
  if (key === 'zalo_link' || key === 'zalo_contact_link') {
    if (!/^https?:\/\/zalo\.(me|com)\//.test(value)) {
      return 'Link Zalo phải bắt đầu bằng https://zalo.me/ hoặc https://zalo.com/'
    }
  }
  return null
}
