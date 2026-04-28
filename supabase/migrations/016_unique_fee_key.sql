-- ═══════════════════════════════════════════════════════════════════
-- 016_unique_fee_key.sql
--
-- Fix: race condition khi 2 admin tạo cùng fee_key đồng thời.
-- RPC create_default_fee chỉ check EXISTS rồi INSERT — không có
-- UNIQUE constraint ở DB. Lỗi đã note ở Milestone 3.2.
--
-- Partial unique index: chỉ enforce trên active rows. Cho phép
-- soft-delete row, sau đó INSERT lại fee_key trùng.
-- Idempotent: IF NOT EXISTS.
-- ═══════════════════════════════════════════════════════════════════

CREATE UNIQUE INDEX IF NOT EXISTS idx_default_fees_fee_key_active
  ON public.default_fees (fee_key)
  WHERE is_active = true;
