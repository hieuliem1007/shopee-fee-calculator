-- ═══════════════════════════════════════════════════════════════════
-- 019_fix_jsonb_parsing_trigger.sql
--
-- Fix: trigger check_saved_results_limit fail khi system_config.value
-- là jsonb string (vd '"25"' thay vì 25).
--
-- Root cause: RPC update_system_config_value luôn cast text → jsonb
-- → result là jsonb string with quotes. (value::text)::int fail với
-- "22P02: invalid input syntax for type integer".
--
-- Fix: dùng (value#>>'{}')::int — strip jsonb quotes trước khi cast.
-- Pattern này work cho cả jsonb number và jsonb string.
-- Defensive EXCEPTION block fallback v_max=50 nếu cast vẫn fail.
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.check_saved_results_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max int;
  v_count int;
  v_value jsonb;
BEGIN
  SELECT value INTO v_value
  FROM public.system_config
  WHERE key = 'saved_results_max_per_user';

  IF v_value IS NULL THEN
    v_max := 50;
  ELSE
    BEGIN
      v_max := (v_value#>>'{}')::int;
    EXCEPTION WHEN OTHERS THEN
      v_max := 50;
    END;
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
