-- ═══════════════════════════════════════════════════════════════════
-- 004_rls_policies.sql
-- 
-- Row Level Security policies cho 10 bảng (29 policies tổng cộng)
-- 
-- Nguyên tắc:
-- 1. DROP toàn bộ policy cũ trước → idempotent
-- 2. Mỗi bảng có policy riêng cho từng operation (SELECT/INSERT/UPDATE/DELETE)
-- 3. Dùng public.is_admin() cho admin checks (tránh recursion)
-- 4. Mọi policy có WITH CHECK rõ ràng cho INSERT/UPDATE
-- 5. Roles = 'authenticated' (không dùng 'public' để tránh anon vô tình match)
-- 6. Anon chỉ access được features, default_fees, shared_links (qua slug)
-- 
-- THỨ TỰ APPLY: 001 → 002 → 003 → 004 → 005
-- ═══════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════
-- BƯỚC 1: DROP TẤT CẢ POLICIES CŨ (idempotent)
-- ═══════════════════════════════════════════════════════════════════

-- activity_log
DROP POLICY IF EXISTS "Admin can view all activity" ON public.activity_log;
DROP POLICY IF EXISTS "System can insert activity" ON public.activity_log;
DROP POLICY IF EXISTS "Users can view own activity" ON public.activity_log;
DROP POLICY IF EXISTS "activity_log_select_own" ON public.activity_log;
DROP POLICY IF EXISTS "activity_log_select_admin" ON public.activity_log;
DROP POLICY IF EXISTS "activity_log_insert_own" ON public.activity_log;

-- default_fees
DROP POLICY IF EXISTS "Anyone can read default_fees" ON public.default_fees;
DROP POLICY IF EXISTS "Only admin can modify default_fees" ON public.default_fees;
DROP POLICY IF EXISTS "default_fees_select_all" ON public.default_fees;
DROP POLICY IF EXISTS "default_fees_modify_admin" ON public.default_fees;

-- email_templates
DROP POLICY IF EXISTS "Only admin can manage email_templates" ON public.email_templates;
DROP POLICY IF EXISTS "email_templates_admin_only" ON public.email_templates;

-- features
DROP POLICY IF EXISTS "Anyone can read features" ON public.features;
DROP POLICY IF EXISTS "Only admin can modify features" ON public.features;
DROP POLICY IF EXISTS "features_select_all" ON public.features;
DROP POLICY IF EXISTS "features_modify_admin" ON public.features;

-- fee_audit_log
DROP POLICY IF EXISTS "Only admin can insert fee_audit_log" ON public.fee_audit_log;
DROP POLICY IF EXISTS "Only admin can view fee_audit_log" ON public.fee_audit_log;
DROP POLICY IF EXISTS "fee_audit_log_select_admin" ON public.fee_audit_log;
DROP POLICY IF EXISTS "fee_audit_log_insert_admin" ON public.fee_audit_log;

-- profiles
DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;

-- saved_results
DROP POLICY IF EXISTS "Admin can view all results" ON public.saved_results;
DROP POLICY IF EXISTS "Users can manage own results" ON public.saved_results;
DROP POLICY IF EXISTS "saved_results_select_own" ON public.saved_results;
DROP POLICY IF EXISTS "saved_results_insert_own" ON public.saved_results;
DROP POLICY IF EXISTS "saved_results_update_own" ON public.saved_results;
DROP POLICY IF EXISTS "saved_results_delete_own" ON public.saved_results;
DROP POLICY IF EXISTS "saved_results_select_admin" ON public.saved_results;

-- shared_links
DROP POLICY IF EXISTS "Anyone can read shared_links" ON public.shared_links;
DROP POLICY IF EXISTS "Users can manage own shared_links" ON public.shared_links;
DROP POLICY IF EXISTS "shared_links_select_own" ON public.shared_links;
DROP POLICY IF EXISTS "shared_links_insert_own" ON public.shared_links;
DROP POLICY IF EXISTS "shared_links_update_own" ON public.shared_links;
DROP POLICY IF EXISTS "shared_links_delete_own" ON public.shared_links;
DROP POLICY IF EXISTS "shared_links_select_anon" ON public.shared_links;
DROP POLICY IF EXISTS "shared_links_select_admin" ON public.shared_links;

-- system_config
DROP POLICY IF EXISTS "Anyone can read system_config" ON public.system_config;
DROP POLICY IF EXISTS "Only admin can modify system_config" ON public.system_config;
DROP POLICY IF EXISTS "system_config_select_authenticated" ON public.system_config;
DROP POLICY IF EXISTS "system_config_modify_admin" ON public.system_config;

-- user_features
DROP POLICY IF EXISTS "Admin can manage all user_features" ON public.user_features;
DROP POLICY IF EXISTS "Users can view own features" ON public.user_features;
DROP POLICY IF EXISTS "user_features_select_own" ON public.user_features;
DROP POLICY IF EXISTS "user_features_modify_admin" ON public.user_features;


-- ═══════════════════════════════════════════════════════════════════
-- BƯỚC 2: TẠO LẠI POLICIES — TỪNG BẢNG (29 policies)
-- ═══════════════════════════════════════════════════════════════════


-- ── BẢNG: profiles (4 policies) ──────────────────────────────────
-- LƯU Ý: KHÔNG có INSERT policy vì profile chỉ tạo qua trigger handle_new_user
-- LƯU Ý: KHÔNG có DELETE policy → không ai xóa được profiles từ frontend

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_select_admin"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
-- Note: Trigger prevent_profile_escalation chặn user thường update field nhạy cảm

CREATE POLICY "profiles_update_admin"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ── BẢNG: features (2 policies) ──────────────────────────────────

CREATE POLICY "features_select_all"
  ON public.features FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY "features_modify_admin"
  ON public.features FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ── BẢNG: user_features (2 policies) ─────────────────────────────

CREATE POLICY "user_features_select_own"
  ON public.user_features FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_features_modify_admin"
  ON public.user_features FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ── BẢNG: default_fees (2 policies) ──────────────────────────────

CREATE POLICY "default_fees_select_all"
  ON public.default_fees FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY "default_fees_modify_admin"
  ON public.default_fees FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ── BẢNG: fee_audit_log (2 policies) ─────────────────────────────
-- Audit log immutable: chỉ có SELECT + INSERT, KHÔNG có UPDATE/DELETE

CREATE POLICY "fee_audit_log_select_admin"
  ON public.fee_audit_log FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "fee_audit_log_insert_admin"
  ON public.fee_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND changed_by = auth.uid());


-- ── BẢNG: email_templates (1 policy) ─────────────────────────────

CREATE POLICY "email_templates_admin_only"
  ON public.email_templates FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ── BẢNG: saved_results (5 policies) ─────────────────────────────

CREATE POLICY "saved_results_select_own"
  ON public.saved_results FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "saved_results_insert_own"
  ON public.saved_results FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "saved_results_update_own"
  ON public.saved_results FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "saved_results_delete_own"
  ON public.saved_results FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "saved_results_select_admin"
  ON public.saved_results FOR SELECT TO authenticated
  USING (public.is_admin());


-- ── BẢNG: shared_links (6 policies) ──────────────────────────────

CREATE POLICY "shared_links_select_own"
  ON public.shared_links FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "shared_links_insert_own"
  ON public.shared_links FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "shared_links_update_own"
  ON public.shared_links FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "shared_links_delete_own"
  ON public.shared_links FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Anon đọc được shared_links chưa expired
CREATE POLICY "shared_links_select_anon"
  ON public.shared_links FOR SELECT TO anon
  USING (expires_at IS NULL OR expires_at > now());

CREATE POLICY "shared_links_select_admin"
  ON public.shared_links FOR SELECT TO authenticated
  USING (public.is_admin());


-- ── BẢNG: system_config (2 policies — FIX LỖI #7) ────────────────
-- Chỉ authenticated đọc được system_config (anon không có quyền)

CREATE POLICY "system_config_select_authenticated"
  ON public.system_config FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "system_config_modify_admin"
  ON public.system_config FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ── BẢNG: activity_log (3 policies — FIX LỖI #3) ─────────────────
-- INSERT chặt chẽ: user chỉ được INSERT log với user_id = chính họ
-- (hoặc admin INSERT thay khi qua RPC approve_user/reject_user)

CREATE POLICY "activity_log_select_own"
  ON public.activity_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "activity_log_select_admin"
  ON public.activity_log FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "activity_log_insert_own"
  ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin());


-- ═══════════════════════════════════════════════════════════════════
-- VERIFY (chạy thủ công sau khi apply):
-- 
-- SELECT tablename, COUNT(*) AS policy_count
-- FROM pg_policies WHERE schemaname = 'public'
-- GROUP BY tablename ORDER BY tablename;
-- 
-- Kết quả mong đợi (29 policies tổng):
-- activity_log:    3
-- default_fees:    2
-- email_templates: 1
-- features:        2
-- fee_audit_log:   2
-- profiles:        4
-- saved_results:   5
-- shared_links:    6
-- system_config:   2
-- user_features:   2
-- ═══════════════════════════════════════════════════════════════════