-- ═══════════════════════════════════════════════════════════════════
-- 003_grants.sql
-- 
-- GRANT permissions cho 3 roles: authenticated, anon, service_role
-- 
-- Nguyên tắc:
-- 1. authenticated = user đã login → có quyền đầy đủ DML, RLS sẽ kiểm soát
-- 2. anon = user chưa login → chỉ SELECT các bảng public (features, default_fees, shared_links)
-- 3. service_role = backend code (edge functions) → quyền đầy đủ trên 10 bảng
-- 
-- Pattern: REVOKE trước, GRANT lại đúng → đảm bảo idempotent
-- (Có thể chạy nhiều lần mà không sai)
-- 
-- THỨ TỰ APPLY: 001 → 002 → 003 → 004 → 005
-- ═══════════════════════════════════════════════════════════════════


-- ── BƯỚC 1: REVOKE quyền thừa của anon (FIX LỖI #1) ──────────────
-- (Trước đây anon có INSERT trên profiles → nguy hiểm)
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.user_features FROM anon;
REVOKE ALL ON public.activity_log FROM anon;
REVOKE ALL ON public.fee_audit_log FROM anon;
REVOKE ALL ON public.email_templates FROM anon;
REVOKE ALL ON public.saved_results FROM anon;
REVOKE ALL ON public.system_config FROM anon;


-- ── BƯỚC 2: GRANT SELECT cho anon (chỉ 3 bảng public) ────────────
GRANT SELECT ON public.features TO anon;
GRANT SELECT ON public.default_fees TO anon;
GRANT SELECT ON public.shared_links TO anon;


-- ── BƯỚC 3: GRANT đầy đủ DML cho authenticated ───────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.features TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_features TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.default_fees TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_audit_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_results TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_log TO authenticated;


-- ── BƯỚC 4: GRANT đầy đủ DML cho service_role (FIX LỖI #2) ───────
-- service_role bypass RLS, dùng cho edge functions/admin scripts
-- Phase 5 sẽ cần khi setup Resend, scheduled jobs cleanup, etc.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.features TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_features TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.default_fees TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_audit_log TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_results TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_links TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_config TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_log TO service_role;


-- ── BƯỚC 5: GRANT USAGE schema ───────────────────────────────────
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;


-- ── BƯỚC 6: GRANT trên sequences ─────────────────────────────────
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;


-- ── BƯỚC 7: ALTER DEFAULT PRIVILEGES (cho bảng tạo MỚI sau này) ──
-- Khi Phase 2-5 thêm bảng mới, tự động có grant đúng
-- → Không bao giờ quên grant → tránh lặp lại lỗi GRANT thiếu
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated, service_role;