-- M6.5.2 — Admin Overview RPC
-- Returns 6 KPIs for /admin dashboard: user counts, saved results count,
-- top category, active share links, recent activity (10 most recent rows).
-- SECURITY DEFINER + is_admin() check.

CREATE OR REPLACE FUNCTION public.get_admin_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'total_users',          (SELECT COUNT(*) FROM profiles),
    'active_users',         (SELECT COUNT(*) FROM profiles WHERE status = 'active'),
    'pending_users',        (SELECT COUNT(*) FROM profiles WHERE status = 'pending'),
    'rejected_users',       (SELECT COUNT(*) FROM profiles WHERE status = 'rejected'),
    'total_saved_results',  (SELECT COUNT(*) FROM saved_results),
    'top_category',         (
      SELECT jsonb_build_object(
        'slug',  category_slug,
        'label', COALESCE(category_label, category_slug),
        'count', cnt
      )
      FROM (
        SELECT
          inputs->>'category'      AS category_slug,
          MAX(inputs->>'categoryLabel') AS category_label,
          COUNT(*)                 AS cnt
        FROM saved_results
        WHERE inputs->>'category' IS NOT NULL
        GROUP BY inputs->>'category'
        ORDER BY cnt DESC
        LIMIT 1
      ) t
    ),
    'active_share_links',   (
      SELECT COUNT(*) FROM shared_links
      WHERE expires_at IS NULL OR expires_at > NOW()
    ),
    'recent_activity',      COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',         a.id,
          'user_email', p.email,
          'action',     a.action,
          'feature_id', a.feature_id,
          'created_at', a.created_at
        ) ORDER BY a.created_at DESC
      )
      FROM (
        SELECT id, user_id, action, feature_id, created_at
        FROM activity_log
        ORDER BY created_at DESC
        LIMIT 10
      ) a
      LEFT JOIN profiles p ON p.id = a.user_id
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_overview() TO authenticated;

COMMENT ON FUNCTION public.get_admin_overview() IS
  'Returns 6 KPIs for /admin overview dashboard. Admin-only via is_admin() check.';
