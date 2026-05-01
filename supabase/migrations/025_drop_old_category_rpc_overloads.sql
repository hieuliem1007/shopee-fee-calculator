-- M6.9 fix: M6.9.2 (migration 024) dùng CREATE OR REPLACE nhưng vì
-- thêm param mới (p_shop_type), Postgres tạo function MỚI thay vì replace.
-- Hệ quả: tồn tại 2 phiên bản với signature khác nhau, supabase.rpc()
-- với arg cũ → ambiguous overload error → frontend nhận [] → Admin Fees
-- ngành hàng hiển thị 0.
--
-- Drop các function cũ (signature ngắn hơn, không có shop_type) để chỉ
-- giữ 1 phiên bản mới với p_shop_type DEFAULT.

DROP FUNCTION IF EXISTS public.list_category_fees(boolean);
DROP FUNCTION IF EXISTS public.create_category_fee(text, numeric, text, text);
DROP FUNCTION IF EXISTS public.bulk_import_categories(jsonb, text);
