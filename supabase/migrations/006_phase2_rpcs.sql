-- ═══════════════════════════════════════════════════════════════════
-- 006_phase2_rpcs.sql
-- 
-- 6 RPC functions cho Phase 2: User Management
-- 
-- Pattern (từ lessons-learned Phase 1):
-- 1. SECURITY DEFINER + SET search_path = public
-- 2. Check is_admin() ở đầu - raise EXCEPTION nếu không phải admin
-- 3. Check target user tồn tại
-- 4. Check không thao tác chính mình (cho suspend, soft_delete)
-- 5. Atomic: UPDATE/INSERT cùng transaction
-- 6. INSERT activity_log entry
-- 7. RETURN jsonb metadata (success, user_id, action, timestamp, ...)
-- 
-- Action naming convention: {entity}.{verb_past_tense}
-- VD: user.suspended, user.features_granted
-- 
-- THỨ TỰ APPLY: 001 → 002 → 003 → 004 → 005 → 006 (file này)
-- ═══════════════════════════════════════════════════════════════════


-- ── RPC 1: suspend_user ───────────────────────────────────────────
-- Tạm khóa user. Status = 'suspended', user không login được.
-- Lưu suspended_reason để hiển thị trên trang /locked.
-- 
-- Guards:
-- - Caller phải là admin
-- - Target user phải tồn tại
-- - KHÔNG cho admin tự khóa chính mình
-- - Reason không được rỗng

CREATE OR REPLACE FUNCTION public.suspend_user(
  p_user_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_target_email text;
  v_target_status text;
BEGIN
  -- Guard 1: Caller phải là admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admin can suspend users' USING ERRCODE = '42501';
  END IF;
  
  -- Guard 2: Reason không được rỗng
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Suspension reason is required' USING ERRCODE = 'P0001';
  END IF;
  
  -- Guard 3: KHÔNG cho admin tự khóa chính mình
  IF p_user_id = v_caller_id THEN
    RAISE EXCEPTION 'Cannot suspend yourself' USING ERRCODE = 'P0001';
  END IF;
  
  -- Guard 4: Target user phải tồn tại + lock row
  SELECT email, status INTO v_target_email, v_target_status
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0002';
  END IF;
  
  -- Guard 5: User đã suspended rồi thì không cần suspend lại
  IF v_target_status = 'suspended' THEN
    RAISE EXCEPTION 'User is already suspended' USING ERRCODE = 'P0001';
  END IF;
  
  -- Action 1: UPDATE profile
  UPDATE public.profiles
  SET 
    status = 'suspended',
    suspended_reason = p_reason
  WHERE id = p_user_id;
  
  -- Action 2: INSERT activity_log
  INSERT INTO public.activity_log (user_id, action, metadata)
  VALUES (
    v_caller_id,
    'user.suspended',
    jsonb_build_object(
      'target_user_id', p_user_id,
      'target_email', v_target_email,
      'previous_status', v_target_status,
      'reason', p_reason
    )
  );
  
  -- Return metadata
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'action', 'user.suspended',
    'timestamp', now(),
    'previous_status', v_target_status
  );
END;
$$;


-- ── RPC 2: unsuspend_user ─────────────────────────────────────────
-- Mở khóa user đang bị suspended. Status = 'active', clear suspended_reason.
-- 
-- Guards:
-- - Caller phải là admin
-- - Target user phải tồn tại
-- - User phải đang ở status 'suspended' (không unsuspend user active/pending)

CREATE OR REPLACE FUNCTION public.unsuspend_user(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_target_email text;
  v_target_status text;
  v_previous_reason text;
BEGIN
  -- Guard 1: Caller phải là admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admin can unsuspend users' USING ERRCODE = '42501';
  END IF;
  
  -- Guard 2: Target user phải tồn tại + lock row
  SELECT email, status, suspended_reason 
    INTO v_target_email, v_target_status, v_previous_reason
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0002';
  END IF;
  
  -- Guard 3: User phải đang suspended
  IF v_target_status != 'suspended' THEN
    RAISE EXCEPTION 'User is not suspended (current status: %)', v_target_status 
      USING ERRCODE = 'P0001';
  END IF;
  
  -- Action 1: UPDATE profile - active + clear reason
  UPDATE public.profiles
  SET 
    status = 'active',
    suspended_reason = NULL
  WHERE id = p_user_id;
  
  -- Action 2: INSERT activity_log
  INSERT INTO public.activity_log (user_id, action, metadata)
  VALUES (
    v_caller_id,
    'user.unsuspended',
    jsonb_build_object(
      'target_user_id', p_user_id,
      'target_email', v_target_email,
      'previous_reason', v_previous_reason
    )
  );
  
  -- Return metadata
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'action', 'user.unsuspended',
    'timestamp', now()
  );
END;
$$;


-- ── RPC 3: soft_delete_user ───────────────────────────────────────
-- Xóa "mềm" user. Status = 'deleted', user không login được, không xuất hiện
-- trong list bình thường (cần filter status != 'deleted').
-- KHÔNG xóa khỏi auth.users hay xóa row → giữ audit trail.
-- 
-- Guards:
-- - Caller phải là admin
-- - Target user phải tồn tại
-- - KHÔNG cho admin tự xóa chính mình
-- - User đã deleted rồi thì không xóa lại

CREATE OR REPLACE FUNCTION public.soft_delete_user(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_target_email text;
  v_target_status text;
  v_target_full_name text;
BEGIN
  -- Guard 1: Caller phải là admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admin can delete users' USING ERRCODE = '42501';
  END IF;
  
  -- Guard 2: KHÔNG cho admin tự xóa chính mình
  IF p_user_id = v_caller_id THEN
    RAISE EXCEPTION 'Cannot delete yourself' USING ERRCODE = 'P0001';
  END IF;
  
  -- Guard 3: Target user phải tồn tại + lock row
  SELECT email, status, full_name 
    INTO v_target_email, v_target_status, v_target_full_name
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0002';
  END IF;
  
  -- Guard 4: User đã deleted rồi
  IF v_target_status = 'deleted' THEN
    RAISE EXCEPTION 'User is already deleted' USING ERRCODE = 'P0001';
  END IF;
  
  -- Action 1: UPDATE profile - soft delete
  -- Snapshot email/full_name vào suspended_reason để giữ thông tin
  -- (vì email không cho UPDATE bởi trigger, nhưng full_name có thể mất sau này)
  UPDATE public.profiles
  SET 
    status = 'deleted',
    suspended_reason = format('Soft deleted at %s by admin %s', now()::text, v_caller_id::text)
  WHERE id = p_user_id;
  
  -- Action 2: INSERT activity_log với snapshot
  INSERT INTO public.activity_log (user_id, action, metadata)
  VALUES (
    v_caller_id,
    'user.soft_deleted',
    jsonb_build_object(
      'target_user_id', p_user_id,
      'target_email', v_target_email,
      'target_full_name', v_target_full_name,
      'previous_status', v_target_status
    )
  );
  
  -- Return metadata
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'action', 'user.soft_deleted',
    'timestamp', now(),
    'previous_status', v_target_status
  );
END;
$$;
-- ── FIX RPC 3 (soft_delete_user) ──────────────────────────────────
-- Em đã viết RPC #3 ở phần 1 ghi đè suspended_reason → vi phạm SSoT.
-- Replace lại với version đúng: KHÔNG đụng suspended_reason khi delete.
-- Audit trail đã đầy đủ trong activity_log.metadata.

CREATE OR REPLACE FUNCTION public.soft_delete_user(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_target_email text;
  v_target_status text;
  v_target_full_name text;
  v_target_phone text;
  v_target_package_label text;
BEGIN
  -- Guard 1: Caller phải là admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admin can delete users' USING ERRCODE = '42501';
  END IF;
  
  -- Guard 2: KHÔNG cho admin tự xóa chính mình
  IF p_user_id = v_caller_id THEN
    RAISE EXCEPTION 'Cannot delete yourself' USING ERRCODE = 'P0001';
  END IF;
  
  -- Guard 3: Target user phải tồn tại + lock row + snapshot full info
  SELECT email, status, full_name, phone, package_label
    INTO v_target_email, v_target_status, v_target_full_name, 
         v_target_phone, v_target_package_label
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0002';
  END IF;
  
  -- Guard 4: User đã deleted rồi
  IF v_target_status = 'deleted' THEN
    RAISE EXCEPTION 'User is already deleted' USING ERRCODE = 'P0001';
  END IF;
  
  -- Action 1: UPDATE profile - chỉ đổi status, không đụng field khác
  UPDATE public.profiles
  SET status = 'deleted'
  WHERE id = p_user_id;
  
  -- Action 2: INSERT activity_log với FULL snapshot (audit trail nguồn duy nhất)
  INSERT INTO public.activity_log (user_id, action, metadata)
  VALUES (
    v_caller_id,
    'user.soft_deleted',
    jsonb_build_object(
      'target_user_id', p_user_id,
      'target_email', v_target_email,
      'target_full_name', v_target_full_name,
      'target_phone', v_target_phone,
      'target_package_label', v_target_package_label,
      'previous_status', v_target_status
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'action', 'user.soft_deleted',
    'timestamp', now(),
    'previous_status', v_target_status
  );
END;
$$;


-- ── RPC 4: update_user_profile_admin ──────────────────────────────
-- Admin sửa thông tin user: full_name, phone, package_label, package_note.
-- Sử dụng cho trang /admin/users/:id section "Thông tin".
-- 
-- Guards:
-- - Caller phải là admin
-- - Target user phải tồn tại
-- - Ít nhất 1 field phải khác giá trị cũ (tránh log thừa)
-- 
-- Note: KHÔNG cho update email/status/is_admin qua RPC này.
-- - Email: phải đổi qua Supabase Auth (Phase 5)
-- - Status: dùng suspend/unsuspend/soft_delete RPC riêng
-- - is_admin: chỉ đổi thủ công qua SQL (siêu nhạy cảm)

CREATE OR REPLACE FUNCTION public.update_user_profile_admin(
  p_user_id uuid,
  p_full_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_package_label text DEFAULT NULL,
  p_package_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_old_full_name text;
  v_old_phone text;
  v_old_package_label text;
  v_old_package_note text;
  v_changes jsonb := '{}'::jsonb;
  v_change_count int := 0;
BEGIN
  -- Guard 1: Caller phải là admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admin can update user profiles' USING ERRCODE = '42501';
  END IF;
  
  -- Guard 2: Target user phải tồn tại + lock row + snapshot
  SELECT full_name, phone, package_label, package_note
    INTO v_old_full_name, v_old_phone, v_old_package_label, v_old_package_note
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0002';
  END IF;
  
  -- Build change diff (chỉ track field nào thực sự đổi)
  IF p_full_name IS NOT NULL AND p_full_name IS DISTINCT FROM v_old_full_name THEN
    IF length(trim(p_full_name)) = 0 THEN
      RAISE EXCEPTION 'Full name cannot be empty' USING ERRCODE = 'P0001';
    END IF;
    v_changes := v_changes || jsonb_build_object('full_name', 
      jsonb_build_object('old', v_old_full_name, 'new', p_full_name));
    v_change_count := v_change_count + 1;
  END IF;
  
  IF p_phone IS NOT NULL AND p_phone IS DISTINCT FROM v_old_phone THEN
    IF length(trim(p_phone)) = 0 THEN
      RAISE EXCEPTION 'Phone cannot be empty' USING ERRCODE = 'P0001';
    END IF;
    v_changes := v_changes || jsonb_build_object('phone', 
      jsonb_build_object('old', v_old_phone, 'new', p_phone));
    v_change_count := v_change_count + 1;
  END IF;
  
  IF p_package_label IS DISTINCT FROM v_old_package_label THEN
    v_changes := v_changes || jsonb_build_object('package_label', 
      jsonb_build_object('old', v_old_package_label, 'new', p_package_label));
    v_change_count := v_change_count + 1;
  END IF;
  
  IF p_package_note IS DISTINCT FROM v_old_package_note THEN
    v_changes := v_changes || jsonb_build_object('package_note', 
      jsonb_build_object('old', v_old_package_note, 'new', p_package_note));
    v_change_count := v_change_count + 1;
  END IF;
  
  -- Guard 3: Phải có ít nhất 1 field thay đổi
  IF v_change_count = 0 THEN
    RAISE EXCEPTION 'No changes to apply' USING ERRCODE = 'P0001';
  END IF;
  
  -- Action 1: UPDATE profile - chỉ update field non-null
  UPDATE public.profiles
  SET 
    full_name = COALESCE(p_full_name, full_name),
    phone = COALESCE(p_phone, phone),
    package_label = CASE 
      WHEN p_package_label IS DISTINCT FROM v_old_package_label THEN p_package_label
      ELSE package_label END,
    package_note = CASE 
      WHEN p_package_note IS DISTINCT FROM v_old_package_note THEN p_package_note
      ELSE package_note END
  WHERE id = p_user_id;
  
  -- Action 2: INSERT activity_log với diff
  INSERT INTO public.activity_log (user_id, action, metadata)
  VALUES (
    v_caller_id,
    'user.profile_updated_by_admin',
    jsonb_build_object(
      'target_user_id', p_user_id,
      'changes', v_changes,
      'change_count', v_change_count
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'action', 'user.profile_updated_by_admin',
    'timestamp', now(),
    'change_count', v_change_count,
    'changes', v_changes
  );
END;
$$;


-- ── RPC 5: grant_user_features ────────────────────────────────────
-- Cấp 1 hoặc nhiều features cho user (idempotent - đã có thì skip).
-- Validate features tồn tại trong bảng features trước khi insert.
-- 
-- Guards:
-- - Caller phải là admin
-- - Target user phải tồn tại
-- - Tất cả feature_ids trong p_feature_ids phải tồn tại trong bảng features
-- - p_feature_ids không được rỗng

CREATE OR REPLACE FUNCTION public.grant_user_features(
  p_user_id uuid,
  p_feature_ids text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_target_email text;
  v_invalid_features text[];
  v_newly_granted text[];
  v_already_had text[];
  v_total_input int;
BEGIN
  -- Guard 1: Caller phải là admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admin can grant features' USING ERRCODE = '42501';
  END IF;
  
  -- Guard 2: p_feature_ids không được rỗng
  IF p_feature_ids IS NULL OR array_length(p_feature_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Feature list cannot be empty' USING ERRCODE = 'P0001';
  END IF;
  
  v_total_input := array_length(p_feature_ids, 1);
  
  -- Guard 3: Target user phải tồn tại
  SELECT email INTO v_target_email
  FROM public.profiles
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0002';
  END IF;
  
  -- Guard 4: Tất cả feature_ids phải tồn tại trong bảng features
  SELECT array_agg(fid) INTO v_invalid_features
  FROM unnest(p_feature_ids) AS fid
  WHERE NOT EXISTS (SELECT 1 FROM public.features WHERE id = fid);
  
  IF v_invalid_features IS NOT NULL AND array_length(v_invalid_features, 1) > 0 THEN
    RAISE EXCEPTION 'Invalid feature ids: %', v_invalid_features 
      USING ERRCODE = 'P0001';
  END IF;
  
  -- Tính diff: features đã có vs features cần grant mới
  SELECT array_agg(fid) INTO v_already_had
  FROM unnest(p_feature_ids) AS fid
  WHERE EXISTS (
    SELECT 1 FROM public.user_features 
    WHERE user_id = p_user_id AND feature_id = fid
  );
  
  -- Action 1: INSERT user_features (skip rows đã tồn tại)
  WITH inserted AS (
    INSERT INTO public.user_features (user_id, feature_id, granted_by)
    SELECT p_user_id, fid, v_caller_id
    FROM unnest(p_feature_ids) AS fid
    ON CONFLICT (user_id, feature_id) DO NOTHING
    RETURNING feature_id
  )
  SELECT array_agg(feature_id) INTO v_newly_granted FROM inserted;
  
  -- Action 2: INSERT activity_log
  INSERT INTO public.activity_log (user_id, action, metadata)
  VALUES (
    v_caller_id,
    'user.features_granted',
    jsonb_build_object(
      'target_user_id', p_user_id,
      'target_email', v_target_email,
      'requested_features', p_feature_ids,
      'newly_granted', COALESCE(v_newly_granted, ARRAY[]::text[]),
      'already_had', COALESCE(v_already_had, ARRAY[]::text[]),
      'total_input', v_total_input
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'action', 'user.features_granted',
    'timestamp', now(),
    'newly_granted', COALESCE(v_newly_granted, ARRAY[]::text[]),
    'already_had', COALESCE(v_already_had, ARRAY[]::text[]),
    'total_input', v_total_input
  );
END;
$$;


-- ── RPC 6: revoke_user_features ───────────────────────────────────
-- Thu hồi 1 hoặc nhiều features từ user.
-- Idempotent: feature không có thì skip.
-- 
-- Guards:
-- - Caller phải là admin
-- - Target user phải tồn tại
-- - p_feature_ids không được rỗng
-- 
-- Note: KHÔNG check feature_ids tồn tại trong bảng features (cho phép cleanup
-- features cũ đã xóa khỏi bảng).

CREATE OR REPLACE FUNCTION public.revoke_user_features(
  p_user_id uuid,
  p_feature_ids text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_target_email text;
  v_revoked text[];
  v_not_had text[];
  v_total_input int;
BEGIN
  -- Guard 1: Caller phải là admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admin can revoke features' USING ERRCODE = '42501';
  END IF;
  
  -- Guard 2: p_feature_ids không được rỗng
  IF p_feature_ids IS NULL OR array_length(p_feature_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Feature list cannot be empty' USING ERRCODE = 'P0001';
  END IF;
  
  v_total_input := array_length(p_feature_ids, 1);
  
  -- Guard 3: Target user phải tồn tại
  SELECT email INTO v_target_email
  FROM public.profiles
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0002';
  END IF;
  
  -- Tính diff: features không có (sẽ skip)
  SELECT array_agg(fid) INTO v_not_had
  FROM unnest(p_feature_ids) AS fid
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_features 
    WHERE user_id = p_user_id AND feature_id = fid
  );
  
  -- Action 1: DELETE user_features matching
  WITH deleted AS (
    DELETE FROM public.user_features
    WHERE user_id = p_user_id 
      AND feature_id = ANY(p_feature_ids)
    RETURNING feature_id
  )
  SELECT array_agg(feature_id) INTO v_revoked FROM deleted;
  
  -- Action 2: INSERT activity_log
  INSERT INTO public.activity_log (user_id, action, metadata)
  VALUES (
    v_caller_id,
    'user.features_revoked',
    jsonb_build_object(
      'target_user_id', p_user_id,
      'target_email', v_target_email,
      'requested_features', p_feature_ids,
      'revoked', COALESCE(v_revoked, ARRAY[]::text[]),
      'not_had', COALESCE(v_not_had, ARRAY[]::text[]),
      'total_input', v_total_input
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'action', 'user.features_revoked',
    'timestamp', now(),
    'revoked', COALESCE(v_revoked, ARRAY[]::text[]),
    'not_had', COALESCE(v_not_had, ARRAY[]::text[]),
    'total_input', v_total_input
  );
END;
$$;


-- ═══════════════════════════════════════════════════════════════════
-- VERIFY (chạy thủ công sau khi apply 006):
-- 
-- 1. Đếm functions Phase 2 (kỳ vọng: 6)
-- SELECT proname FROM pg_proc 
-- WHERE pronamespace = 'public'::regnamespace
--   AND proname IN ('suspend_user', 'unsuspend_user', 'soft_delete_user',
--                   'update_user_profile_admin', 'grant_user_features', 'revoke_user_features')
-- ORDER BY proname;
-- 
-- 2. Verify all return jsonb
-- SELECT proname, pg_get_function_result(oid) AS result_type
-- FROM pg_proc WHERE proname LIKE '%_user%' OR proname LIKE '%user_%'
-- ORDER BY proname;
-- 
-- 3. Test 1 RPC (admin gọi suspend chính mình → phải fail):
-- SELECT public.suspend_user(auth.uid(), 'test');
-- → Phải trả: ERROR: Cannot suspend yourself
-- ═══════════════════════════════════════════════════════════════════