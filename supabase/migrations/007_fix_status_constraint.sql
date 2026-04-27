-- ═══════════════════════════════════════════════════════════════════
-- 007_fix_status_constraint.sql
--
-- BUG FIX: profiles_status_check constraint missing 'deleted' value
--
-- Discovered: Milestone 2.3 (28/04/2026), khi test soft_delete_user qua UI
-- Root cause: File 001_initial_schema.sql tạo constraint thiếu 'deleted'
-- Phase 2 thêm RPC soft_delete_user dùng status='deleted' nhưng quên
-- update constraint → blocked tại DB layer.
--
-- Fix: DROP + ADD CONSTRAINT với 5 status values đầy đủ.
--
-- Idempotent: chạy nhiều lần OK (DROP IF EXISTS + ADD).
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('pending', 'active', 'rejected', 'suspended', 'deleted'));

-- VERIFY:
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'public.profiles'::regclass
--   AND conname = 'profiles_status_check';
--
-- Kỳ vọng: CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text,
--   'rejected'::text, 'suspended'::text, 'deleted'::text])))
