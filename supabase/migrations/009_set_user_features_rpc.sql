-- ═══════════════════════════════════════════════════════════════════
-- 009_set_user_features_rpc.sql
--
-- Phase 2 Milestone 2.4: Atomic replace features của user
--
-- Tại sao cần RPC này (thay vì gọi grant + revoke riêng lẻ)?
-- → Tránh race condition: nếu grant pass nhưng revoke fail, state inconsistent
-- → 1 transaction, 1 audit log entry, dễ rollback
--
-- NOTE: spec gốc dùng public.is_admin(v_caller_id) nhưng signature thực
-- của public.is_admin() KHÔNG nhận arg. Đã đổi sang is_admin() no-arg
-- (function tự đọc auth.uid() bên trong).
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.set_user_features(
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
  v_target_status text;
  v_target_is_admin boolean;
  v_current_features text[];
  v_to_grant text[];
  v_to_revoke text[];
  v_invalid_features text[];
BEGIN
  -- Guard 1: caller must be admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admin can manage features' USING ERRCODE = 'P0001';
  END IF;

  -- Guard 2: target user must exist
  SELECT status, is_admin INTO v_target_status, v_target_is_admin
  FROM public.profiles WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0001';
  END IF;

  -- Guard 3: cannot manage admin features
  IF v_target_is_admin THEN
    RAISE EXCEPTION 'Cannot manage admin features' USING ERRCODE = 'P0001';
  END IF;

  -- Guard 4: validate all feature_ids exist and are level=2 (only children, not parents)
  IF p_feature_ids IS NOT NULL AND array_length(p_feature_ids, 1) > 0 THEN
    SELECT array_agg(fid) INTO v_invalid_features
    FROM unnest(p_feature_ids) AS fid
    WHERE NOT EXISTS (
      SELECT 1 FROM public.features
      WHERE id = fid AND level = 2
    );

    IF v_invalid_features IS NOT NULL AND array_length(v_invalid_features, 1) > 0 THEN
      RAISE EXCEPTION 'Invalid features: %', array_to_string(v_invalid_features, ', ')
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Compute diff
  SELECT COALESCE(array_agg(feature_id), ARRAY[]::text[]) INTO v_current_features
  FROM public.user_features WHERE user_id = p_user_id;

  v_to_grant := COALESCE(
    (SELECT array_agg(f) FROM unnest(p_feature_ids) AS f
     WHERE f != ALL(v_current_features)),
    ARRAY[]::text[]
  );

  v_to_revoke := COALESCE(
    (SELECT array_agg(f) FROM unnest(v_current_features) AS f
     WHERE f != ALL(COALESCE(p_feature_ids, ARRAY[]::text[]))),
    ARRAY[]::text[]
  );

  -- Apply changes atomically
  IF array_length(v_to_revoke, 1) > 0 THEN
    DELETE FROM public.user_features
    WHERE user_id = p_user_id AND feature_id = ANY(v_to_revoke);
  END IF;

  IF array_length(v_to_grant, 1) > 0 THEN
    INSERT INTO public.user_features (user_id, feature_id, granted_by)
    SELECT p_user_id, fid, v_caller_id FROM unnest(v_to_grant) AS fid;
  END IF;

  -- Log single audit entry
  INSERT INTO public.activity_log (user_id, action, metadata)
  VALUES (
    v_caller_id,
    'user.features_replaced',
    jsonb_build_object(
      'target_user_id', p_user_id,
      'granted', v_to_grant,
      'revoked', v_to_revoke,
      'final_features', p_feature_ids,
      'granted_count', COALESCE(array_length(v_to_grant, 1), 0),
      'revoked_count', COALESCE(array_length(v_to_revoke, 1), 0)
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'granted_count', COALESCE(array_length(v_to_grant, 1), 0),
    'revoked_count', COALESCE(array_length(v_to_revoke, 1), 0),
    'total_features', COALESCE(array_length(p_feature_ids, 1), 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_user_features(uuid, text[]) TO authenticated;
