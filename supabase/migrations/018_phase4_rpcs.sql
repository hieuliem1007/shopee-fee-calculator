-- ═══════════════════════════════════════════════════════════════════
-- 018_phase4_rpcs.sql
--
-- Phase 4 Milestone 4.1: 6 RPCs for saved_results + shared_links
-- ═══════════════════════════════════════════════════════════════════

-- ─── RPC 1: save_result ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.save_result(
  p_tool_id text,
  p_product_name text,
  p_inputs jsonb,
  p_fees_snapshot jsonb,
  p_results jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_expire_days int;
  v_new_id uuid;
  v_expires_at timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Phiên đăng nhập đã hết hạn' USING ERRCODE = 'P0001';
  END IF;

  IF p_tool_id IS NULL OR length(trim(p_tool_id)) = 0 THEN
    RAISE EXCEPTION 'tool_id không được rỗng' USING ERRCODE = 'P0001';
  END IF;

  IF p_inputs IS NULL OR p_results IS NULL OR p_fees_snapshot IS NULL THEN
    RAISE EXCEPTION 'Dữ liệu lưu không đầy đủ' USING ERRCODE = 'P0001';
  END IF;

  SELECT (value::text)::int INTO v_expire_days
  FROM public.system_config
  WHERE key = 'saved_results_expire_days';

  IF v_expire_days IS NULL THEN
    v_expire_days := 90;
  END IF;

  v_expires_at := now() + (v_expire_days || ' days')::interval;

  INSERT INTO public.saved_results (
    user_id, tool_id, product_name, inputs, fees_snapshot, results, expires_at
  ) VALUES (
    v_user_id, p_tool_id, NULLIF(trim(p_product_name), ''),
    p_inputs, p_fees_snapshot, p_results,
    v_expires_at
  )
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'success', true,
    'result_id', v_new_id,
    'expires_at', v_expires_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_result(text, text, jsonb, jsonb, jsonb) TO authenticated;

-- ─── RPC 2: list_my_results ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.list_my_results(
  p_search text DEFAULT NULL,
  p_offset int DEFAULT 0,
  p_limit int DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_total int;
  v_rows jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Phiên đăng nhập đã hết hạn' USING ERRCODE = 'P0001';
  END IF;

  IF p_limit > 100 THEN p_limit := 100; END IF;
  IF p_limit < 1 THEN p_limit := 20; END IF;

  SELECT count(*) INTO v_total
  FROM public.saved_results
  WHERE user_id = v_user_id
    AND expires_at > now()
    AND (p_search IS NULL OR product_name ILIKE '%' || p_search || '%');

  SELECT COALESCE(jsonb_agg(row_data ORDER BY created_at DESC), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'id', id,
      'tool_id', tool_id,
      'product_name', product_name,
      'inputs', inputs,
      'results', results,
      'created_at', created_at,
      'expires_at', expires_at
    ) AS row_data,
    created_at
    FROM public.saved_results
    WHERE user_id = v_user_id
      AND expires_at > now()
      AND (p_search IS NULL OR product_name ILIKE '%' || p_search || '%')
    ORDER BY created_at DESC
    OFFSET p_offset
    LIMIT p_limit
  ) sub;

  RETURN jsonb_build_object(
    'total', v_total,
    'rows', v_rows
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_my_results(text, int, int) TO authenticated;

-- ─── RPC 3: get_result_detail ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_result_detail(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_row jsonb;
  v_share_slug text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Phiên đăng nhập đã hết hạn' USING ERRCODE = 'P0001';
  END IF;

  SELECT jsonb_build_object(
    'id', id,
    'tool_id', tool_id,
    'product_name', product_name,
    'inputs', inputs,
    'fees_snapshot', fees_snapshot,
    'results', results,
    'created_at', created_at,
    'expires_at', expires_at
  ) INTO v_row
  FROM public.saved_results
  WHERE id = p_id
    AND user_id = v_user_id
    AND expires_at > now();

  IF v_row IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy kết quả hoặc đã hết hạn' USING ERRCODE = 'P0001';
  END IF;

  SELECT slug INTO v_share_slug
  FROM public.shared_links
  WHERE result_id = p_id
    AND user_id = v_user_id
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;

  RETURN v_row || jsonb_build_object('share_slug', v_share_slug);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_result_detail(uuid) TO authenticated;

-- ─── RPC 4: delete_result ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_result(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_deleted int;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Phiên đăng nhập đã hết hạn' USING ERRCODE = 'P0001';
  END IF;

  DELETE FROM public.saved_results
  WHERE id = p_id AND user_id = v_user_id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted = 0 THEN
    RAISE EXCEPTION 'Không tìm thấy kết quả' USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_result(uuid) TO authenticated;

-- ─── RPC 5: create_share_link ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_share_link(p_result_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_product_name text;
  v_base_slug text;
  v_full_slug text;
  v_expire_days int;
  v_expires_at timestamptz;
  v_attempts int := 0;
  v_max_attempts int := 5;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Phiên đăng nhập đã hết hạn' USING ERRCODE = 'P0001';
  END IF;

  SELECT product_name INTO v_product_name
  FROM public.saved_results
  WHERE id = p_result_id
    AND user_id = v_user_id
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy kết quả hoặc đã hết hạn' USING ERRCODE = 'P0001';
  END IF;

  v_base_slug := public.slugify_vietnamese(COALESCE(v_product_name, 'result'));

  SELECT (value::text)::int INTO v_expire_days
  FROM public.system_config
  WHERE key = 'saved_results_expire_days';

  IF v_expire_days IS NULL THEN
    v_expire_days := 90;
  END IF;

  v_expires_at := now() + (v_expire_days || ' days')::interval;

  DELETE FROM public.shared_links
  WHERE result_id = p_result_id;

  LOOP
    v_attempts := v_attempts + 1;
    v_full_slug := v_base_slug || '-' || public.generate_random_suffix();

    BEGIN
      INSERT INTO public.shared_links (slug, result_id, user_id, expires_at)
      VALUES (v_full_slug, p_result_id, v_user_id, v_expires_at);
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempts >= v_max_attempts THEN
        RAISE EXCEPTION 'Không thể tạo slug duy nhất sau % lần thử', v_max_attempts USING ERRCODE = 'P0001';
      END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'slug', v_full_slug,
    'expires_at', v_expires_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_share_link(uuid) TO authenticated;

-- ─── RPC 6: get_public_result (anon) ──────────────────────────────
CREATE OR REPLACE FUNCTION public.get_public_result(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link record;
  v_result jsonb;
BEGIN
  SELECT id, result_id, expires_at INTO v_link
  FROM public.shared_links
  WHERE slug = p_slug;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Link không tồn tại' USING ERRCODE = 'P0001';
  END IF;

  IF v_link.expires_at IS NOT NULL AND v_link.expires_at <= now() THEN
    RAISE EXCEPTION 'Link đã hết hạn' USING ERRCODE = 'P0001';
  END IF;

  SELECT jsonb_build_object(
    'product_name', product_name,
    'tool_id', tool_id,
    'inputs', inputs,
    'fees_snapshot', fees_snapshot,
    'results', results,
    'shared_at', v_link.expires_at
  ) INTO v_result
  FROM public.saved_results
  WHERE id = v_link.result_id;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Kết quả gốc đã bị xóa' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.shared_links
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = v_link.id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_result(text) TO anon, authenticated;
