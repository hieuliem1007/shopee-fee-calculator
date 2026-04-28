-- ═══════════════════════════════════════════════════════════════════
-- 017_phase4_save_results_setup.sql
--
-- Phase 4 Milestone 4.1: Setup save results + share links
-- 1. Helper function slugify_vietnamese: convert tên sản phẩm → ASCII slug
-- 2. Helper function generate_random_suffix: 4 chars base36
-- 3. Trigger BEFORE INSERT saved_results check limit per user
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.slugify_vietnamese(p_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_result text;
BEGIN
  IF p_text IS NULL OR length(trim(p_text)) = 0 THEN
    RETURN 'result';
  END IF;

  v_result := lower(p_text);

  v_result := translate(v_result,
    'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ',
    'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'
  );

  v_result := regexp_replace(v_result, '[^a-z0-9\s-]', '', 'g');
  v_result := regexp_replace(v_result, '[\s-]+', '-', 'g');
  v_result := trim(both '-' from v_result);

  v_result := substring(v_result from 1 for 40);
  v_result := trim(both '-' from v_result);

  IF length(v_result) = 0 THEN
    v_result := 'result';
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_random_suffix()
RETURNS text
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  v_chars text := '0123456789abcdefghijklmnopqrstuvwxyz';
  v_result text := '';
  v_i int;
BEGIN
  FOR v_i IN 1..4 LOOP
    v_result := v_result || substr(v_chars, (random() * 36)::int + 1, 1);
  END LOOP;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_saved_results_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max int;
  v_count int;
BEGIN
  SELECT (value::text)::int INTO v_max
  FROM public.system_config
  WHERE key = 'saved_results_max_per_user';

  IF v_max IS NULL THEN
    v_max := 50;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.saved_results
  WHERE user_id = NEW.user_id
    AND expires_at > now();

  IF v_count >= v_max THEN
    RAISE EXCEPTION 'Đã đạt giới hạn lưu kết quả (%). Vui lòng xóa bớt kết quả cũ.', v_max
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_saved_results_limit ON public.saved_results;
CREATE TRIGGER trg_check_saved_results_limit
  BEFORE INSERT ON public.saved_results
  FOR EACH ROW
  EXECUTE FUNCTION public.check_saved_results_limit();
