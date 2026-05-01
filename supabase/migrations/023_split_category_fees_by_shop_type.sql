-- M6.9.2: Tách phí ngành hàng theo shop_type (Mall vs thường)

-- 1. Thêm cột shop_type, default 'normal' cho ngành hiện có
ALTER TABLE public.category_fees
  ADD COLUMN IF NOT EXISTS shop_type text NOT NULL DEFAULT 'normal'
  CHECK (shop_type IN ('mall', 'normal'));

-- 2. Drop unique index cũ (chỉ unique trên lower(category_name) where is_active)
--    Vì giờ cùng tên có thể tồn tại ở 2 shop_type khác nhau.
DROP INDEX IF EXISTS public.idx_category_fees_name_lower;

-- 3. Tạo unique index mới: (shop_type, lower(category_name)) where is_active
CREATE UNIQUE INDEX idx_category_fees_shop_type_name_lower
  ON public.category_fees (shop_type, lower(category_name))
  WHERE is_active = true;

-- 4. Clone tất cả ngành active hiện tại (đã default 'normal') sang shop_type='mall'
--    với cùng phí — admin sẽ tự điều chỉnh phí Mall sau.
INSERT INTO public.category_fees
  (category_name, fee_value, fee_unit, display_order, is_active, description, shop_type, created_at, updated_at)
SELECT
  category_name, fee_value, fee_unit, display_order, is_active, description,
  'mall' AS shop_type, NOW(), NOW()
FROM public.category_fees
WHERE shop_type = 'normal' AND is_active = true;
