// src/lib/saved-results.ts
//
// Wrappers cho 6 RPCs Phase 4 (saved_results + shared_links).
// RPC raise lỗi tiếng Việt với ERRCODE P0001 — wrapper extract message
// và return shape thuần cho UI.

import { supabase } from './supabase'

export type ToolId = 'shopee_calculator'

export interface SaveResultInput {
  tool_id: ToolId
  product_name: string
  inputs: Record<string, unknown>
  fees_snapshot: unknown[]
  results: Record<string, unknown>
}

export interface SavedResultRow {
  id: string
  tool_id: string
  product_name: string | null
  inputs: Record<string, unknown>
  results: Record<string, unknown>
  created_at: string
  expires_at: string
}

export interface SavedResultDetail extends SavedResultRow {
  fees_snapshot: unknown[]
  share_slug: string | null
}

export interface ListMyResultsResponse {
  total: number
  rows: SavedResultRow[]
}

export interface PublicResultData {
  product_name: string | null
  tool_id: string
  inputs: Record<string, unknown>
  fees_snapshot: unknown[]
  results: Record<string, unknown>
  shared_at: string
}

function extractError(error: { code?: string; message?: string } | null): string {
  if (!error) return 'Lỗi không xác định'
  return error.message?.replace(/^ERROR:\s*/i, '') || 'Lỗi không xác định'
}

export async function saveResult(
  input: SaveResultInput
): Promise<{ data: { success: boolean; result_id: string; expires_at: string } | null; error: string | null }> {
  const { data, error } = await supabase.rpc('save_result', {
    p_tool_id: input.tool_id,
    p_product_name: input.product_name,
    p_inputs: input.inputs,
    p_fees_snapshot: input.fees_snapshot,
    p_results: input.results,
  })
  if (error) return { data: null, error: extractError(error) }
  return { data: data as { success: boolean; result_id: string; expires_at: string }, error: null }
}

export async function listMyResults(
  search?: string,
  offset: number = 0,
  limit: number = 20
): Promise<{ data: ListMyResultsResponse | null; error: string | null }> {
  const { data, error } = await supabase.rpc('list_my_results', {
    p_search: search ?? null,
    p_offset: offset,
    p_limit: limit,
  })
  if (error) return { data: null, error: extractError(error) }
  return { data: data as ListMyResultsResponse, error: null }
}

export async function getResultDetail(
  id: string
): Promise<{ data: SavedResultDetail | null; error: string | null }> {
  const { data, error } = await supabase.rpc('get_result_detail', { p_id: id })
  if (error) return { data: null, error: extractError(error) }
  return { data: data as SavedResultDetail, error: null }
}

export async function deleteResult(
  id: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('delete_result', { p_id: id })
  if (error) return { error: extractError(error) }
  return { error: null }
}

export async function createShareLink(
  resultId: string
): Promise<{ data: { success: boolean; slug: string; expires_at: string } | null; error: string | null }> {
  const { data, error } = await supabase.rpc('create_share_link', { p_result_id: resultId })
  if (error) return { data: null, error: extractError(error) }
  return { data: data as { success: boolean; slug: string; expires_at: string }, error: null }
}

export async function getPublicResult(
  slug: string
): Promise<{ data: PublicResultData | null; error: string | null }> {
  const { data, error } = await supabase.rpc('get_public_result', { p_slug: slug })
  if (error) return { data: null, error: extractError(error) }
  return { data: data as PublicResultData, error: null }
}
