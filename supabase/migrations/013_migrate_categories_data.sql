-- ═══════════════════════════════════════════════════════════════════
-- 013_migrate_categories_data.sql
-- Phase 3 Milestone 3.1: Move 6 rows shopee_fixed_fee_* sang category_fees
-- Soft delete 6 rows cũ trong default_fees để giữ lịch sử
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO public.category_fees (category_name, fee_value, fee_unit, display_order, description)
SELECT
  REPLACE(REPLACE(fee_label, 'Phí cố định ngành ', ''), ' ', '') AS category_name,
  fee_value,
  fee_unit,
  CASE fee_key
    WHEN 'shopee_fixed_fee_thucpham' THEN 1
    WHEN 'shopee_fixed_fee_thoitrang' THEN 2
    WHEN 'shopee_fixed_fee_oto' THEN 3
    WHEN 'shopee_fixed_fee_mypham' THEN 4
    WHEN 'shopee_fixed_fee_dientu' THEN 5
    WHEN 'shopee_fixed_fee_giadung' THEN 6
  END AS display_order,
  'Phí cố định Shopee áp dụng cho ngành hàng này' AS description
FROM public.default_fees
WHERE fee_key LIKE 'shopee_fixed_fee_%'
  AND is_active = true
ON CONFLICT DO NOTHING;

UPDATE public.category_fees SET category_name = 'Thực phẩm' WHERE category_name = 'Thựcphẩm';
UPDATE public.category_fees SET category_name = 'Thời trang' WHERE category_name = 'Thờitrang';
UPDATE public.category_fees SET category_name = 'Ô tô' WHERE category_name = 'Ôtô';
UPDATE public.category_fees SET category_name = 'Mỹ phẩm' WHERE category_name = 'Mỹphẩm';
UPDATE public.category_fees SET category_name = 'Điện tử' WHERE category_name = 'Điệntử';
UPDATE public.category_fees SET category_name = 'Gia dụng' WHERE category_name = 'Giadụng';

UPDATE public.default_fees
SET is_active = false,
    updated_at = now(),
    description = COALESCE(description, '') || ' [DEPRECATED: migrated to category_fees in Phase 3]'
WHERE fee_key LIKE 'shopee_fixed_fee_%';
