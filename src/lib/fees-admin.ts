// src/lib/fees-admin.ts
//
// Wrapper RPCs cho trang /admin/fees (Phase 3 Milestone 3.2+).
// RPC layer đã raise lỗi tiếng Việt (ERRCODE P0001), wrapper chỉ
// extract error message + return shape thuần cho UI.

import { supabase } from './supabase'

export type FeeUnit = 'percent' | 'vnd'

export interface DefaultFee {
  id: string
  fee_key: string
  fee_label: string
  fee_value: number
  fee_unit: FeeUnit
  category: string
  description: string | null
  display_order: number | null
  is_active: boolean
  updated_at: string
  updated_by: string | null
}

export interface CreateDefaultFeeInput {
  fee_key: string
  fee_label: string
  fee_value: number
  fee_unit: FeeUnit
  category: string
  description?: string | null
}

export interface UpdateDefaultFeeChanges {
  fee_label?: string
  fee_value?: number
  fee_unit?: FeeUnit
  description?: string | null
  display_order?: number
}

function extractError(error: { code?: string; message?: string } | null): string {
  if (!error) return 'Lỗi không xác định'
  // RPC tự raise tiếng Việt với ERRCODE P0001 — message đã sẵn tiếng Việt
  return error.message?.replace(/^ERROR:\s*/i, '') || 'Lỗi không xác định'
}

export async function listDefaultFees(
  includeInactive: boolean = false
): Promise<DefaultFee[]> {
  const { data, error } = await supabase.rpc('list_default_fees', {
    p_include_inactive: includeInactive,
  })
  if (error) return []
  return (data ?? []) as DefaultFee[]
}

export async function createDefaultFee(
  input: CreateDefaultFeeInput
): Promise<{ data: { success: boolean; fee_id: string } | null; error: string | null }> {
  const { data, error } = await supabase.rpc('create_default_fee', {
    p_fee_key: input.fee_key,
    p_fee_label: input.fee_label,
    p_fee_value: input.fee_value,
    p_fee_unit: input.fee_unit,
    p_category: input.category,
    p_description: input.description ?? null,
  })
  if (error) return { data: null, error: extractError(error) }
  return { data: data as { success: boolean; fee_id: string }, error: null }
}

export async function updateDefaultFee(
  id: string,
  changes: UpdateDefaultFeeChanges,
  reason: string
): Promise<{
  data: { success: boolean; changed_fields: string[]; changed_count: number } | null
  error: string | null
}> {
  const params: Record<string, unknown> = {
    p_id: id,
    p_reason: reason,
  }
  if (changes.fee_label !== undefined) params.p_fee_label = changes.fee_label
  if (changes.fee_value !== undefined) params.p_fee_value = changes.fee_value
  if (changes.fee_unit !== undefined) params.p_fee_unit = changes.fee_unit
  if (changes.description !== undefined) params.p_description = changes.description
  if (changes.display_order !== undefined) params.p_display_order = changes.display_order

  const { data, error } = await supabase.rpc('update_default_fee', params)
  if (error) return { data: null, error: extractError(error) }
  return {
    data: data as { success: boolean; changed_fields: string[]; changed_count: number },
    error: null,
  }
}

export async function softDeleteDefaultFee(
  id: string,
  reason: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('soft_delete_default_fee', {
    p_id: id,
    p_reason: reason,
  })
  if (error) return { error: extractError(error) }
  return { error: null }
}

// Heuristic: "phí seed gốc" = thuộc category shopee_fixed | shopee_variable
// (15 seed gốc, dùng để show warning mạnh khi xóa)
export function isSeedFee(fee: DefaultFee): boolean {
  return fee.category === 'shopee_fixed' || fee.category === 'shopee_variable'
}


// ════════════════════════════════════════════════════════════════
// Category fees (Tab 2)
// ════════════════════════════════════════════════════════════════

export interface CategoryFee {
  id: string
  category_name: string
  fee_value: number
  fee_unit: FeeUnit
  display_order: number | null
  is_active: boolean
  description: string | null
  updated_at: string
  updated_by: string | null
  created_at: string
}

export interface CreateCategoryFeeInput {
  category_name: string
  fee_value: number
  fee_unit?: FeeUnit
  description?: string | null
}

export interface UpdateCategoryFeeChanges {
  category_name?: string
  fee_value?: number
  fee_unit?: FeeUnit
  description?: string | null
  display_order?: number
}

export type ImportMode = 'replace' | 'merge'

export interface ImportRow {
  name: string
  fee_percent: number
  description?: string
}

export interface ImportResult {
  success: boolean
  imported: number
  updated: number
  skipped: number
  mode: ImportMode
}

export async function listCategoryFees(
  includeInactive: boolean = false
): Promise<CategoryFee[]> {
  const { data, error } = await supabase.rpc('list_category_fees', {
    p_include_inactive: includeInactive,
  })
  if (error) return []
  return (data ?? []) as CategoryFee[]
}

export async function createCategoryFee(
  input: CreateCategoryFeeInput
): Promise<{ data: { success: boolean; category_id: string } | null; error: string | null }> {
  const { data, error } = await supabase.rpc('create_category_fee', {
    p_category_name: input.category_name,
    p_fee_value: input.fee_value,
    p_fee_unit: input.fee_unit ?? 'percent',
    p_description: input.description ?? null,
  })
  if (error) return { data: null, error: extractError(error) }
  return { data: data as { success: boolean; category_id: string }, error: null }
}

export async function updateCategoryFee(
  id: string,
  changes: UpdateCategoryFeeChanges,
  reason: string
): Promise<{
  data: { success: boolean; changed_fields: string[]; changed_count: number } | null
  error: string | null
}> {
  const params: Record<string, unknown> = { p_id: id, p_reason: reason }
  if (changes.category_name !== undefined) params.p_category_name = changes.category_name
  if (changes.fee_value !== undefined) params.p_fee_value = changes.fee_value
  if (changes.fee_unit !== undefined) params.p_fee_unit = changes.fee_unit
  if (changes.description !== undefined) params.p_description = changes.description
  if (changes.display_order !== undefined) params.p_display_order = changes.display_order

  const { data, error } = await supabase.rpc('update_category_fee', params)
  if (error) return { data: null, error: extractError(error) }
  return {
    data: data as { success: boolean; changed_fields: string[]; changed_count: number },
    error: null,
  }
}

export async function softDeleteCategoryFee(
  id: string,
  reason: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('soft_delete_category_fee', {
    p_id: id,
    p_reason: reason,
  })
  if (error) return { error: extractError(error) }
  return { error: null }
}

export async function bulkImportCategories(
  rows: ImportRow[],
  mode: ImportMode
): Promise<{ data: ImportResult | null; error: string | null }> {
  const { data, error } = await supabase.rpc('bulk_import_categories', {
    p_categories: rows,
    p_mode: mode,
  })
  if (error) return { data: null, error: extractError(error) }
  return { data: data as ImportResult, error: null }
}
