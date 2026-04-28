-- ═══════════════════════════════════════════════════════════════════
-- 010_update_my_profile_rpc.sql
--
-- Phase 2 Milestone 2.5: User tự cập nhật profile của mình
-- Chỉ cho phép sửa: full_name, phone
-- KHÔNG cho sửa: email, status, package_label, package_note, is_admin
--                  (những field này admin mới được sửa qua update_user_profile_admin)
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_my_profile(
  p_full_name text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_old_full_name text;
  v_old_phone text;
  v_changed_fields text[] := ARRAY[]::text[];
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'P0001';
  END IF;

  SELECT full_name, phone INTO v_old_full_name, v_old_phone
  FROM public.profiles WHERE id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0001';
  END IF;

  IF p_full_name IS NOT NULL THEN
    IF length(trim(p_full_name)) = 0 THEN
      RAISE EXCEPTION 'Tên không được rỗng' USING ERRCODE = 'P0001';
    END IF;
    IF length(p_full_name) > 100 THEN
      RAISE EXCEPTION 'Tên tối đa 100 ký tự' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF p_phone IS NOT NULL THEN
    IF length(trim(p_phone)) = 0 THEN
      RAISE EXCEPTION 'Số điện thoại không được rỗng' USING ERRCODE = 'P0001';
    END IF;
    IF NOT (regexp_replace(p_phone, '\s', '', 'g') ~ '^[0-9]{10,11}$') THEN
      RAISE EXCEPTION 'Số điện thoại không hợp lệ (10-11 chữ số)' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  UPDATE public.profiles
  SET
    full_name = CASE WHEN p_full_name IS NOT NULL AND p_full_name IS DISTINCT FROM v_old_full_name
                     THEN p_full_name ELSE full_name END,
    phone = CASE WHEN p_phone IS NOT NULL AND p_phone IS DISTINCT FROM v_old_phone
                 THEN p_phone ELSE phone END,
    updated_at = NOW()
  WHERE id = v_user_id;

  IF p_full_name IS NOT NULL AND p_full_name IS DISTINCT FROM v_old_full_name THEN
    v_changed_fields := array_append(v_changed_fields, 'full_name');
  END IF;
  IF p_phone IS NOT NULL AND p_phone IS DISTINCT FROM v_old_phone THEN
    v_changed_fields := array_append(v_changed_fields, 'phone');
  END IF;

  IF array_length(v_changed_fields, 1) > 0 THEN
    INSERT INTO public.activity_log (user_id, action, metadata)
    VALUES (
      v_user_id,
      'profile.self_updated',
      jsonb_build_object(
        'changed_fields', v_changed_fields,
        'old_full_name', v_old_full_name,
        'old_phone', v_old_phone,
        'new_full_name', COALESCE(p_full_name, v_old_full_name),
        'new_phone', COALESCE(p_phone, v_old_phone)
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'changed_fields', v_changed_fields,
    'changed_count', COALESCE(array_length(v_changed_fields, 1), 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_my_profile(text, text) TO authenticated;
