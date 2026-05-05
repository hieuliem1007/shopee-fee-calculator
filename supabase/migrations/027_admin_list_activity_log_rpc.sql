-- ═══════════════════════════════════════════════════════════════════
-- 027_admin_list_activity_log_rpc.sql
--
-- Phase 7 — Activity Log Admin Page (MVP Approach 1)
-- RPC list_activity_log() với admin guard + filter + pagination.
-- Đọc 19 action server-side đã có sẵn từ Phase 1-3 trong table activity_log.
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.list_activity_log(
  p_search text DEFAULT NULL,           -- search email/full_name
  p_action_prefix text DEFAULT NULL,    -- 'admin.', 'user.', 'fee.', etc, NULL = tất cả
  p_user_id uuid DEFAULT NULL,          -- filter 1 user cụ thể
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL,
  p_offset int DEFAULT 0,
  p_limit int DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total int;
  v_rows jsonb;
BEGIN
  -- Admin guard
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Chỉ admin mới được xem activity log' USING ERRCODE = '42501';
  END IF;

  -- Limit max 200 để tránh DOS
  IF p_limit > 200 THEN p_limit := 200; END IF;
  IF p_limit < 1 THEN p_limit := 50; END IF;

  -- Total count
  SELECT count(*) INTO v_total
  FROM activity_log a
  LEFT JOIN profiles p ON p.id = a.user_id
  WHERE (p_search IS NULL OR p.email ILIKE '%' || p_search || '%' OR p.full_name ILIKE '%' || p_search || '%')
    AND (p_action_prefix IS NULL OR a.action LIKE p_action_prefix || '%')
    AND (p_user_id IS NULL OR a.user_id = p_user_id)
    AND (p_from IS NULL OR a.created_at >= p_from)
    AND (p_to IS NULL OR a.created_at <= p_to);

  -- Rows with pagination
  SELECT COALESCE(jsonb_agg(row_data ORDER BY row_created_at DESC), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT
      jsonb_build_object(
        'id', a.id,
        'user_id', a.user_id,
        'user_email', p.email,
        'user_full_name', p.full_name,
        'action', a.action,
        'metadata', a.metadata,
        'created_at', a.created_at
      ) AS row_data,
      a.created_at AS row_created_at
    FROM activity_log a
    LEFT JOIN profiles p ON p.id = a.user_id
    WHERE (p_search IS NULL OR p.email ILIKE '%' || p_search || '%' OR p.full_name ILIKE '%' || p_search || '%')
      AND (p_action_prefix IS NULL OR a.action LIKE p_action_prefix || '%')
      AND (p_user_id IS NULL OR a.user_id = p_user_id)
      AND (p_from IS NULL OR a.created_at >= p_from)
      AND (p_to IS NULL OR a.created_at <= p_to)
    ORDER BY a.created_at DESC
    OFFSET p_offset
    LIMIT p_limit
  ) sub;

  RETURN jsonb_build_object('total', v_total, 'rows', v_rows);
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_activity_log(text, text, uuid, timestamptz, timestamptz, int, int) TO authenticated;

COMMENT ON FUNCTION public.list_activity_log(text, text, uuid, timestamptz, timestamptz, int, int) IS
  'Phase 7 — Admin Activity Log MVP. Đọc 19 action server-side có sẵn (Phase 1-3). Filter + pagination. Admin only.';
