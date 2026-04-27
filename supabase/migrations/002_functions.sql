-- ═══════════════════════════════════════════════════════════════════
-- 002_functions.sql
-- 
-- Functions, triggers, và RPC procedures
-- 
-- Nguyên tắc:
-- 1. Mọi mutation đa-bảng PHẢI là Postgres function (atomic transaction)
-- 2. Functions có quyền cao dùng SECURITY DEFINER + SET search_path
-- 3. Helper functions check permission có STABLE để Postgres cache
-- 4. Validate input trước khi UPDATE/INSERT
-- 
-- THỨ TỰ APPLY: 001 → 002 → 003 → 004 → 005
-- ═══════════════════════════════════════════════════════════════════


-- ── HELPER 1: Kiểm tra user có phải admin không ───────────────────
-- SECURITY DEFINER + STABLE để bypass RLS và cache result
-- Trả về FALSE nếu chưa login (auth.uid() = NULL)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    FALSE
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS 
  'Kiểm tra user hiện tại có phải admin không. SECURITY DEFINER để bypass RLS, tránh recursion khi gọi từ policy.';


-- ── HELPER 2: Trigger tự tạo profile khi đăng ký ──────────────────
-- Validate phone và full_name không rỗng
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.raw_user_meta_data->>'phone', '') = '' THEN
    RAISE EXCEPTION 'Phone number is required (raw_user_meta_data.phone)';
  END IF;
  
  IF COALESCE(NEW.raw_user_meta_data->>'full_name', '') = '' THEN
    RAISE EXCEPTION 'Full name is required (raw_user_meta_data.full_name)';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, phone, status)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    'pending'
  );
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 
  'Auto-tạo profile khi user đăng ký. Validate full_name và phone không rỗng.';

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ── HELPER 3: Trigger chặn user thường update field nhạy cảm ─────
-- Admin bypass via is_admin() check
-- Chỉ cho user thường update full_name, phone, last_login_at, updated_at
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_profile_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;
  
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Cannot change profile id' USING ERRCODE = '42501';
  END IF;
  
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Cannot change email (contact admin)' USING ERRCODE = '42501';
  END IF;
  
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Cannot change own status' USING ERRCODE = '42501';
  END IF;
  
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    RAISE EXCEPTION 'Cannot grant admin to self' USING ERRCODE = '42501';
  END IF;
  
  IF NEW.package_label IS DISTINCT FROM OLD.package_label THEN
    RAISE EXCEPTION 'Cannot change own package' USING ERRCODE = '42501';
  END IF;
  
  IF NEW.package_note IS DISTINCT FROM OLD.package_note THEN
    RAISE EXCEPTION 'Cannot change package note' USING ERRCODE = '42501';
  END IF;
  
  IF NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
    RAISE EXCEPTION 'Cannot change approval timestamp' USING ERRCODE = '42501';
  END IF;
  
  IF NEW.approved_by IS DISTINCT FROM OLD.approved_by THEN
    RAISE EXCEPTION 'Cannot change approved_by' USING ERRCODE = '42501';
  END IF;
  
  IF NEW.rejected_reason IS DISTINCT FROM OLD.rejected_reason THEN
    RAISE EXCEPTION 'Cannot change rejection reason' USING ERRCODE = '42501';
  END IF;
  
  IF NEW.suspended_reason IS DISTINCT FROM OLD.suspended_reason THEN
    RAISE EXCEPTION 'Cannot change suspension reason' USING ERRCODE = '42501';
  END IF;
  
  IF NEW.feature_usage_count IS DISTINCT FROM OLD.feature_usage_count THEN
    RAISE EXCEPTION 'Cannot manually change usage count' USING ERRCODE = '42501';
  END IF;
  
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Cannot change created_at' USING ERRCODE = '42501';
  END IF;
  
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prevent_unauthorized_profile_updates() IS 
  'Chặn user thường update các field nhạy cảm. Admin bypass via is_admin() check.';

DROP TRIGGER IF EXISTS prevent_profile_escalation ON public.profiles;
CREATE TRIGGER prevent_profile_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_unauthorized_profile_updates();


-- ── RPC 1: Admin duyệt user (ATOMIC) ──────────────────────────────
-- Đọc default_features từ bảng features (single source of truth)
-- Atomic: UPDATE profile + INSERT user_features + INSERT activity_log trong 1 transaction
CREATE OR REPLACE FUNCTION public.approve_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
  v_target_status text;
  v_default_features text[];
BEGIN
  -- 1. Validate auth + admin
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admin can approve users' USING ERRCODE = '42501';
  END IF;

  -- 2. Validate target user (FOR UPDATE để tránh race condition)
  SELECT status INTO v_target_status
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id USING ERRCODE = 'P0002';
  END IF;
  
  IF v_target_status <> 'pending' THEN
    RAISE EXCEPTION 'User is not pending (current status: %)', v_target_status 
      USING ERRCODE = 'P0001';
  END IF;

  -- 3. Đọc default_features TỪ BẢNG features (single source of truth)
  SELECT array_agg(id ORDER BY display_order) INTO v_default_features
  FROM public.features
  WHERE is_default_for_new_user = true;
  
  -- 4. Validate: phải có ít nhất 1 feature default
  IF v_default_features IS NULL OR array_length(v_default_features, 1) IS NULL THEN
    RAISE EXCEPTION 'No default features configured. Set is_default_for_new_user=true on at least 1 feature.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 5. UPDATE profile
  UPDATE public.profiles
  SET 
    status = 'active',
    approved_at = now(),
    approved_by = v_admin_id,
    updated_at = now()
  WHERE id = p_user_id;

  -- 6. INSERT user_features (atomic với UPDATE trên)
  INSERT INTO public.user_features (user_id, feature_id, granted_by)
  SELECT p_user_id, unnest(v_default_features), v_admin_id
  ON CONFLICT (user_id, feature_id) DO NOTHING;

  -- 7. Log activity
  INSERT INTO public.activity_log (user_id, action, metadata)
  VALUES (
    v_admin_id,
    'admin.approve_user',
    jsonb_build_object(
      'target_user_id', p_user_id,
      'features_granted', v_default_features
    )
  );
END;
$$;

COMMENT ON FUNCTION public.approve_user(uuid) IS 
  'Admin duyệt user. Atomic transaction. Đọc default features từ bảng features (cột is_default_for_new_user) - single source of truth.';


-- ── RPC 2: Admin từ chối user (ATOMIC) ────────────────────────────
CREATE OR REPLACE FUNCTION public.reject_user(p_user_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
  v_target_status text;
BEGIN
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admin can reject users' USING ERRCODE = '42501';
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Rejection reason is required' USING ERRCODE = 'P0001';
  END IF;

  SELECT status INTO v_target_status
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id USING ERRCODE = 'P0002';
  END IF;
  
  IF v_target_status <> 'pending' THEN
    RAISE EXCEPTION 'User is not pending (current status: %)', v_target_status 
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.profiles
  SET 
    status = 'rejected',
    rejected_reason = trim(p_reason),
    updated_at = now()
  WHERE id = p_user_id;

  INSERT INTO public.activity_log (user_id, action, metadata)
  VALUES (
    v_admin_id,
    'admin.reject_user',
    jsonb_build_object(
      'target_user_id', p_user_id,
      'reason', trim(p_reason)
    )
  );
END;
$$;

COMMENT ON FUNCTION public.reject_user(uuid, text) IS 
  'Admin từ chối user. Atomic: UPDATE status + INSERT activity_log trong 1 transaction.';


-- ── GRANT EXECUTE cho RPC functions ───────────────────────────────
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.approve_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_user(uuid, text) TO authenticated;