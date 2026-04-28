-- ═══════════════════════════════════════════════════════════════════
-- 015_phase3_rpcs.sql
-- Phase 3 Milestone 3.1: 10 RPCs CRUD + Bulk Import + System Config
--
-- Patterns chung:
-- - LANGUAGE plpgsql, SECURITY DEFINER, search_path = public
-- - Validate is_admin() (no-arg, đọc auth.uid() bên trong)
-- - p_reason BẮT BUỘC khi update value
-- - fee_audit_log khi value IS DISTINCT FROM
-- - activity_log với action='fee.*' / 'category.*' / 'system_config.*'
-- - Vietnamese error messages, ERRCODE = P0001
-- ═══════════════════════════════════════════════════════════════════


-- ── RPC 1: list_default_fees ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.list_default_fees(
  p_include_inactive boolean DEFAULT false
)
RETURNS SETOF public.default_fees
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_include_inactive AND public.is_admin() THEN
    RETURN QUERY
      SELECT * FROM public.default_fees
      ORDER BY category, display_order, fee_label;
  ELSE
    RETURN QUERY
      SELECT * FROM public.default_fees
      WHERE is_active = true
      ORDER BY category, display_order, fee_label;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_default_fees(boolean) TO authenticated;


-- ── RPC 2: list_category_fees ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.list_category_fees(
  p_include_inactive boolean DEFAULT false
)
RETURNS SETOF public.category_fees
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_include_inactive AND public.is_admin() THEN
    RETURN QUERY
      SELECT * FROM public.category_fees
      ORDER BY display_order, category_name;
  ELSE
    RETURN QUERY
      SELECT * FROM public.category_fees
      WHERE is_active = true
      ORDER BY display_order, category_name;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_category_fees(boolean) TO authenticated;


-- ── RPC 3: create_default_fee ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_default_fee(
  p_fee_key text,
  p_fee_label text,
  p_fee_value numeric,
  p_fee_unit text,
  p_category text,
  p_description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_fee_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Chỉ admin mới có quyền tạo phí' USING ERRCODE = 'P0001';
  END IF;

  IF p_fee_key IS NULL OR length(trim(p_fee_key)) = 0 THEN
    RAISE EXCEPTION 'Mã phí không được rỗng' USING ERRCODE = 'P0001';
  END IF;

  IF NOT (p_fee_key ~ '^[a-z][a-z0-9_]*$') THEN
    RAISE EXCEPTION 'Mã phí không hợp lệ (chỉ chữ thường, số, dấu gạch dưới, bắt đầu bằng chữ)'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_fee_label IS NULL OR length(trim(p_fee_label)) = 0 THEN
    RAISE EXCEPTION 'Tên phí không được rỗng' USING ERRCODE = 'P0001';
  END IF;

  IF length(p_fee_label) > 100 THEN
    RAISE EXCEPTION 'Tên phí tối đa 100 ký tự' USING ERRCODE = 'P0001';
  END IF;

  IF p_fee_value IS NULL OR p_fee_value < 0 THEN
    RAISE EXCEPTION 'Giá trị phí phải >= 0' USING ERRCODE = 'P0001';
  END IF;

  IF p_fee_unit NOT IN ('percent', 'vnd') THEN
    RAISE EXCEPTION 'Đơn vị phí phải là percent hoặc vnd' USING ERRCODE = 'P0001';
  END IF;

  IF p_fee_unit = 'percent' AND p_fee_value > 100 THEN
    RAISE EXCEPTION 'Phí phần trăm không được vượt quá 100' USING ERRCODE = 'P0001';
  END IF;

  IF p_category IS NULL OR length(trim(p_category)) = 0 THEN
    RAISE EXCEPTION 'Danh mục không được rỗng' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (SELECT 1 FROM public.default_fees WHERE fee_key = p_fee_key) THEN
    RAISE EXCEPTION 'Mã phí đã tồn tại' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.default_fees
    (fee_key, fee_label, fee_value, fee_unit, category, description, updated_by)
  VALUES
    (p_fee_key, p_fee_label, p_fee_value, p_fee_unit, p_category, p_description, v_admin_id)
  RETURNING id INTO v_fee_id;

  INSERT INTO public.activity_log (user_id, action, metadata)
  VALUES (
    v_admin_id, 'fee.created',
    jsonb_build_object(
      'fee_id', v_fee_id, 'fee_key', p_fee_key, 'fee_label', p_fee_label,
      'fee_value', p_fee_value, 'fee_unit', p_fee_unit, 'category', p_category
    )
  );

  RETURN jsonb_build_object('success', true, 'fee_id', v_fee_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_default_fee(text, text, numeric, text, text, text) TO authenticated;


-- ── RPC 4: update_default_fee ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_default_fee(
  p_id uuid,
  p_fee_label text DEFAULT NULL,
  p_fee_value numeric DEFAULT NULL,
  p_fee_unit text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_display_order integer DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_old record;
  v_changed_fields text[] := ARRAY[]::text[];
  v_new_unit text;
  v_new_value numeric;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Chỉ admin mới có quyền cập nhật phí' USING ERRCODE = 'P0001';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Vui lòng nhập lý do cập nhật' USING ERRCODE = 'P0001';
  END IF;

  SELECT id, fee_key, fee_label, fee_value, fee_unit, description, display_order
    INTO v_old
  FROM public.default_fees WHERE id = p_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy phí' USING ERRCODE = 'P0001';
  END IF;

  IF p_fee_label IS NOT NULL THEN
    IF length(trim(p_fee_label)) = 0 THEN
      RAISE EXCEPTION 'Tên phí không được rỗng' USING ERRCODE = 'P0001';
    END IF;
    IF length(p_fee_label) > 100 THEN
      RAISE EXCEPTION 'Tên phí tối đa 100 ký tự' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF p_fee_unit IS NOT NULL AND p_fee_unit NOT IN ('percent', 'vnd') THEN
    RAISE EXCEPTION 'Đơn vị phí phải là percent hoặc vnd' USING ERRCODE = 'P0001';
  END IF;

  v_new_unit := COALESCE(p_fee_unit, v_old.fee_unit);
  v_new_value := COALESCE(p_fee_value, v_old.fee_value);

  IF p_fee_value IS NOT NULL AND p_fee_value < 0 THEN
    RAISE EXCEPTION 'Giá trị phí phải >= 0' USING ERRCODE = 'P0001';
  END IF;

  IF v_new_unit = 'percent' AND v_new_value > 100 THEN
    RAISE EXCEPTION 'Phí phần trăm không được vượt quá 100' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.default_fees
  SET
    fee_label = COALESCE(p_fee_label, fee_label),
    fee_value = COALESCE(p_fee_value, fee_value),
    fee_unit = COALESCE(p_fee_unit, fee_unit),
    description = CASE WHEN p_description IS DISTINCT FROM description AND p_description IS NOT NULL
                       THEN p_description ELSE description END,
    display_order = COALESCE(p_display_order, display_order),
    updated_at = now(),
    updated_by = v_admin_id
  WHERE id = p_id;

  IF p_fee_label IS NOT NULL AND p_fee_label IS DISTINCT FROM v_old.fee_label THEN
    v_changed_fields := array_append(v_changed_fields, 'fee_label');
  END IF;
  IF p_fee_value IS NOT NULL AND p_fee_value IS DISTINCT FROM v_old.fee_value THEN
    v_changed_fields := array_append(v_changed_fields, 'fee_value');
    INSERT INTO public.fee_audit_log (fee_id, fee_key, old_value, new_value, reason, changed_by)
    VALUES (v_old.id, v_old.fee_key, v_old.fee_value, p_fee_value, p_reason, v_admin_id);
  END IF;
  IF p_fee_unit IS NOT NULL AND p_fee_unit IS DISTINCT FROM v_old.fee_unit THEN
    v_changed_fields := array_append(v_changed_fields, 'fee_unit');
  END IF;
  IF p_description IS NOT NULL AND p_description IS DISTINCT FROM v_old.description THEN
    v_changed_fields := array_append(v_changed_fields, 'description');
  END IF;
  IF p_display_order IS NOT NULL AND p_display_order IS DISTINCT FROM v_old.display_order THEN
    v_changed_fields := array_append(v_changed_fields, 'display_order');
  END IF;

  INSERT INTO public.activity_log (user_id, action, metadata)
  VALUES (
    v_admin_id, 'fee.updated',
    jsonb_build_object(
      'fee_id', v_old.id,
      'fee_key', v_old.fee_key,
      'changed_fields', v_changed_fields,
      'reason', p_reason
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'changed_fields', v_changed_fields,
    'changed_count', COALESCE(array_length(v_changed_fields, 1), 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_default_fee(uuid, text, numeric, text, text, integer, text) TO authenticated;


-- ── RPC 5: soft_delete_default_fee ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.soft_delete_default_fee(
  p_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_old record;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Chỉ admin mới có quyền xóa phí' USING ERRCODE = 'P0001';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Vui lòng nhập lý do xóa' USING ERRCODE = 'P0001';
  END IF;

  SELECT id, fee_key, fee_label, is_active INTO v_old
  FROM public.default_fees WHERE id = p_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy phí' USING ERRCODE = 'P0001';
  END IF;

  IF v_old.is_active = false THEN
    RAISE EXCEPTION 'Phí này đã bị xóa rồi' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.default_fees
  SET is_active = false, updated_at = now(), updated_by = v_admin_id
  WHERE id = p_id;

  INSERT INTO public.activity_log (user_id, action, metadata)
  VALUES (
    v_admin_id, 'fee.soft_deleted',
    jsonb_build_object(
      'fee_id', v_old.id, 'fee_key', v_old.fee_key,
      'fee_label', v_old.fee_label, 'reason', p_reason
    )
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_default_fee(uuid, text) TO authenticated;


-- ── RPC 6: create_category_fee ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_category_fee(
  p_category_name text,
  p_fee_value numeric,
  p_fee_unit text DEFAULT 'percent',
  p_description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_id uuid;
  v_next_order integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Chỉ admin mới có quyền tạo ngành hàng' USING ERRCODE = 'P0001';
  END IF;

  IF p_category_name IS NULL OR length(trim(p_category_name)) = 0 THEN
    RAISE EXCEPTION 'Tên ngành không được rỗng' USING ERRCODE = 'P0001';
  END IF;

  IF length(p_category_name) > 100 THEN
    RAISE EXCEPTION 'Tên ngành tối đa 100 ký tự' USING ERRCODE = 'P0001';
  END IF;

  IF p_fee_value IS NULL OR p_fee_value < 0 THEN
    RAISE EXCEPTION 'Giá trị phí phải >= 0' USING ERRCODE = 'P0001';
  END IF;

  IF p_fee_unit NOT IN ('percent', 'vnd') THEN
    RAISE EXCEPTION 'Đơn vị phí phải là percent hoặc vnd' USING ERRCODE = 'P0001';
  END IF;

  IF p_fee_unit = 'percent' AND p_fee_value > 100 THEN
    RAISE EXCEPTION 'Phí phần trăm không được vượt quá 100' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.category_fees
    WHERE lower(category_name) = lower(p_category_name) AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Tên ngành đã tồn tại' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(MAX(display_order), 0) + 1 INTO v_next_order
  FROM public.category_fees WHERE is_active = true;

  INSERT INTO public.category_fees
    (category_name, fee_value, fee_unit, display_order, description, updated_by)
  VALUES
    (p_category_name, p_fee_value, p_fee_unit, v_next_order, p_description, v_admin_id)
  RETURNING id INTO v_id;

  INSERT INTO public.activity_log (user_id, action, metadata)
  VALUES (
    v_admin_id, 'category.created',
    jsonb_build_object(
      'category_id', v_id, 'category_name', p_category_name,
      'fee_value', p_fee_value, 'fee_unit', p_fee_unit
    )
  );

  RETURN jsonb_build_object('success', true, 'category_id', v_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_category_fee(text, numeric, text, text) TO authenticated;


-- ── RPC 7: update_category_fee ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_category_fee(
  p_id uuid,
  p_category_name text DEFAULT NULL,
  p_fee_value numeric DEFAULT NULL,
  p_fee_unit text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_display_order integer DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_old record;
  v_changed_fields text[] := ARRAY[]::text[];
  v_new_unit text;
  v_new_value numeric;
  v_audit_key text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Chỉ admin mới có quyền cập nhật ngành hàng' USING ERRCODE = 'P0001';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Vui lòng nhập lý do cập nhật' USING ERRCODE = 'P0001';
  END IF;

  SELECT id, category_name, fee_value, fee_unit, description, display_order, is_active
    INTO v_old
  FROM public.category_fees WHERE id = p_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy ngành hàng' USING ERRCODE = 'P0001';
  END IF;

  IF p_category_name IS NOT NULL THEN
    IF length(trim(p_category_name)) = 0 THEN
      RAISE EXCEPTION 'Tên ngành không được rỗng' USING ERRCODE = 'P0001';
    END IF;
    IF length(p_category_name) > 100 THEN
      RAISE EXCEPTION 'Tên ngành tối đa 100 ký tự' USING ERRCODE = 'P0001';
    END IF;
    -- Kiểm tra trùng (case-insensitive) nếu đổi tên
    IF lower(p_category_name) <> lower(v_old.category_name)
       AND EXISTS (
         SELECT 1 FROM public.category_fees
         WHERE lower(category_name) = lower(p_category_name)
           AND is_active = true AND id <> p_id
       ) THEN
      RAISE EXCEPTION 'Tên ngành đã tồn tại' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF p_fee_unit IS NOT NULL AND p_fee_unit NOT IN ('percent', 'vnd') THEN
    RAISE EXCEPTION 'Đơn vị phí phải là percent hoặc vnd' USING ERRCODE = 'P0001';
  END IF;

  v_new_unit := COALESCE(p_fee_unit, v_old.fee_unit);
  v_new_value := COALESCE(p_fee_value, v_old.fee_value);

  IF p_fee_value IS NOT NULL AND p_fee_value < 0 THEN
    RAISE EXCEPTION 'Giá trị phí phải >= 0' USING ERRCODE = 'P0001';
  END IF;

  IF v_new_unit = 'percent' AND v_new_value > 100 THEN
    RAISE EXCEPTION 'Phí phần trăm không được vượt quá 100' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.category_fees
  SET
    category_name = COALESCE(p_category_name, category_name),
    fee_value = COALESCE(p_fee_value, fee_value),
    fee_unit = COALESCE(p_fee_unit, fee_unit),
    description = CASE WHEN p_description IS DISTINCT FROM description AND p_description IS NOT NULL
                       THEN p_description ELSE description END,
    display_order = COALESCE(p_display_order, display_order),
    updated_at = now(),
    updated_by = v_admin_id
  WHERE id = p_id;

  IF p_category_name IS NOT NULL AND p_category_name IS DISTINCT FROM v_old.category_name THEN
    v_changed_fields := array_append(v_changed_fields, 'category_name');
  END IF;
  IF p_fee_value IS NOT NULL AND p_fee_value IS DISTINCT FROM v_old.fee_value THEN
    v_changed_fields := array_append(v_changed_fields, 'fee_value');
    v_audit_key := 'category:' || COALESCE(p_category_name, v_old.category_name);
    INSERT INTO public.fee_audit_log (fee_id, fee_key, old_value, new_value, reason, changed_by)
    VALUES (v_old.id, v_audit_key, v_old.fee_value, p_fee_value, p_reason, v_admin_id);
  END IF;
  IF p_fee_unit IS NOT NULL AND p_fee_unit IS DISTINCT FROM v_old.fee_unit THEN
    v_changed_fields := array_append(v_changed_fields, 'fee_unit');
  END IF;
  IF p_description IS NOT NULL AND p_description IS DISTINCT FROM v_old.description THEN
    v_changed_fields := array_append(v_changed_fields, 'description');
  END IF;
  IF p_display_order IS NOT NULL AND p_display_order IS DISTINCT FROM v_old.display_order THEN
    v_changed_fields := array_append(v_changed_fields, 'display_order');
  END IF;

  INSERT INTO public.activity_log (user_id, action, metadata)
  VALUES (
    v_admin_id, 'category.updated',
    jsonb_build_object(
      'category_id', v_old.id,
      'category_name', COALESCE(p_category_name, v_old.category_name),
      'changed_fields', v_changed_fields,
      'reason', p_reason
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'changed_fields', v_changed_fields,
    'changed_count', COALESCE(array_length(v_changed_fields, 1), 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_category_fee(uuid, text, numeric, text, text, integer, text) TO authenticated;


-- ── RPC 8: soft_delete_category_fee ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.soft_delete_category_fee(
  p_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_old record;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Chỉ admin mới có quyền xóa ngành hàng' USING ERRCODE = 'P0001';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Vui lòng nhập lý do xóa' USING ERRCODE = 'P0001';
  END IF;

  SELECT id, category_name, is_active INTO v_old
  FROM public.category_fees WHERE id = p_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy ngành hàng' USING ERRCODE = 'P0001';
  END IF;

  IF v_old.is_active = false THEN
    RAISE EXCEPTION 'Ngành hàng này đã bị xóa rồi' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.category_fees
  SET is_active = false, updated_at = now(), updated_by = v_admin_id
  WHERE id = p_id;

  INSERT INTO public.activity_log (user_id, action, metadata)
  VALUES (
    v_admin_id, 'category.soft_deleted',
    jsonb_build_object(
      'category_id', v_old.id, 'category_name', v_old.category_name,
      'reason', p_reason
    )
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_category_fee(uuid, text) TO authenticated;


-- ── RPC 9: bulk_import_categories ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.bulk_import_categories(
  p_categories jsonb,
  p_mode text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_count int;
  v_imported int := 0;
  v_updated int := 0;
  v_skipped int := 0;
  v_before_count int;
  v_after_count int;
  v_item jsonb;
  v_name text;
  v_fee_percent numeric;
  v_description text;
  v_existing_id uuid;
  v_idx int := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Chỉ admin mới có quyền bulk import' USING ERRCODE = 'P0001';
  END IF;

  IF p_mode NOT IN ('replace', 'merge') THEN
    RAISE EXCEPTION 'Mode phải là replace hoặc merge' USING ERRCODE = 'P0001';
  END IF;

  IF p_categories IS NULL OR jsonb_typeof(p_categories) <> 'array' THEN
    RAISE EXCEPTION 'Dữ liệu phải là JSON array' USING ERRCODE = 'P0001';
  END IF;

  v_count := jsonb_array_length(p_categories);
  IF v_count < 1 OR v_count > 200 THEN
    RAISE EXCEPTION 'Số lượng ngành phải từ 1 đến 200' USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*) INTO v_before_count
  FROM public.category_fees WHERE is_active = true;

  IF p_mode = 'replace' THEN
    UPDATE public.category_fees
    SET is_active = false, updated_at = now(), updated_by = v_admin_id
    WHERE is_active = true;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_categories)
    LOOP
      v_idx := v_idx + 1;
      v_name := v_item->>'name';
      v_fee_percent := (v_item->>'fee_percent')::numeric;
      v_description := v_item->>'description';

      IF v_name IS NULL OR length(trim(v_name)) = 0 THEN
        RAISE EXCEPTION 'Tên ngành ở vị trí % không được rỗng', v_idx
          USING ERRCODE = 'P0001';
      END IF;
      IF v_fee_percent IS NULL OR v_fee_percent < 0 OR v_fee_percent > 100 THEN
        RAISE EXCEPTION 'fee_percent của "%" phải từ 0 đến 100', v_name
          USING ERRCODE = 'P0001';
      END IF;

      INSERT INTO public.category_fees
        (category_name, fee_value, fee_unit, display_order, description, updated_by)
      VALUES
        (v_name, v_fee_percent, 'percent', v_idx, v_description, v_admin_id);

      v_imported := v_imported + 1;
    END LOOP;
  ELSE -- merge
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_categories)
    LOOP
      v_idx := v_idx + 1;
      v_name := v_item->>'name';
      v_fee_percent := (v_item->>'fee_percent')::numeric;
      v_description := v_item->>'description';

      IF v_name IS NULL OR length(trim(v_name)) = 0 THEN
        RAISE EXCEPTION 'Tên ngành ở vị trí % không được rỗng', v_idx
          USING ERRCODE = 'P0001';
      END IF;
      IF v_fee_percent IS NULL OR v_fee_percent < 0 OR v_fee_percent > 100 THEN
        RAISE EXCEPTION 'fee_percent của "%" phải từ 0 đến 100', v_name
          USING ERRCODE = 'P0001';
      END IF;

      SELECT id INTO v_existing_id
      FROM public.category_fees
      WHERE lower(category_name) = lower(v_name) AND is_active = true
      LIMIT 1;

      IF v_existing_id IS NOT NULL THEN
        UPDATE public.category_fees
        SET
          fee_value = v_fee_percent,
          description = COALESCE(v_description, description),
          updated_at = now(),
          updated_by = v_admin_id
        WHERE id = v_existing_id;
        v_updated := v_updated + 1;
      ELSE
        INSERT INTO public.category_fees
          (category_name, fee_value, fee_unit, description, updated_by)
        VALUES
          (v_name, v_fee_percent, 'percent', v_description, v_admin_id);
        v_imported := v_imported + 1;
      END IF;
    END LOOP;
  END IF;

  SELECT count(*) INTO v_after_count
  FROM public.category_fees WHERE is_active = true;

  INSERT INTO public.activity_log (user_id, action, metadata)
  VALUES (
    v_admin_id, 'category.bulk_imported',
    jsonb_build_object(
      'mode', p_mode,
      'count', v_count,
      'imported', v_imported,
      'updated', v_updated,
      'skipped', v_skipped,
      'before_count', v_before_count,
      'after_count', v_after_count
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'imported', v_imported,
    'updated', v_updated,
    'skipped', v_skipped,
    'mode', p_mode
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_import_categories(jsonb, text) TO authenticated;


-- ── RPC 10: update_system_config_value ──────────────────────────────
CREATE OR REPLACE FUNCTION public.update_system_config_value(
  p_key text,
  p_value text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_old_value jsonb;
  v_new_value jsonb;
  v_changed boolean := false;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Chỉ admin mới có quyền cập nhật system config' USING ERRCODE = 'P0001';
  END IF;

  IF p_key IS NULL OR length(trim(p_key)) = 0 THEN
    RAISE EXCEPTION 'Key không được rỗng' USING ERRCODE = 'P0001';
  END IF;

  SELECT value INTO v_old_value FROM public.system_config WHERE key = p_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Key "%" không tồn tại trong system_config', p_key
      USING ERRCODE = 'P0001';
  END IF;

  v_new_value := to_jsonb(p_value);

  IF v_old_value IS DISTINCT FROM v_new_value THEN
    UPDATE public.system_config
    SET value = v_new_value, updated_at = now(), updated_by = v_admin_id
    WHERE key = p_key;

    v_changed := true;

    INSERT INTO public.activity_log (user_id, action, metadata)
    VALUES (
      v_admin_id, 'system_config.updated',
      jsonb_build_object(
        'key', p_key,
        'old_value', v_old_value,
        'new_value', v_new_value
      )
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'changed', v_changed);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_system_config_value(text, text) TO authenticated;
