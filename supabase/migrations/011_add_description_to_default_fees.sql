-- ═══════════════════════════════════════════════════════════════════
-- 011_add_description_to_default_fees.sql
-- Phase 3 Milestone 3.1: Thêm cột description giúp admin viết note giải thích phí
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.default_fees
  ADD COLUMN IF NOT EXISTS description text;

COMMENT ON COLUMN public.default_fees.description IS
  'Mô tả chi tiết phí, giải thích cho user xem trong calculator';

UPDATE public.default_fees SET description = 'Phí Voucher Xtra của Shopee, áp dụng khi shop tham gia chương trình Voucher Xtra' WHERE fee_key = 'shopee_voucher_xtra';
UPDATE public.default_fees SET description = 'Phí Content Xtra cho shop tham gia chương trình tăng trưởng nội dung' WHERE fee_key = 'shopee_content_xtra';
UPDATE public.default_fees SET description = 'Phí Freeship Xtra cho shop tham gia chương trình freeship mở rộng' WHERE fee_key = 'shopee_freeship_xtra';
UPDATE public.default_fees SET description = 'Cap tối đa cho phí Freeship Xtra mỗi đơn (đơn giá cao thì cap)' WHERE fee_key = 'shopee_freeship_xtra_cap';
UPDATE public.default_fees SET description = 'Phí thanh toán Shopee thu trên mỗi giao dịch thành công' WHERE fee_key = 'shopee_payment_fee';
UPDATE public.default_fees SET description = 'Thuế tính trên doanh thu' WHERE fee_key = 'shopee_tax';
UPDATE public.default_fees SET description = 'Phí pi-ship cố định trên mỗi đơn' WHERE fee_key = 'shopee_pi_ship';
UPDATE public.default_fees SET description = 'Phí hạ tầng cố định trên mỗi đơn' WHERE fee_key = 'shopee_infrastructure';
UPDATE public.default_fees SET description = 'Voucher do shop tự phát hành cho khách' WHERE fee_key = 'shopee_voucher_shop';
UPDATE public.default_fees SET description = 'Chi phí khác phát sinh ngoài các khoản trên' WHERE fee_key = 'shopee_other';
UPDATE public.default_fees SET description = 'Chi phí quảng cáo Shopee Ads (CPS, CPC...)' WHERE fee_key = 'shopee_ads';
UPDATE public.default_fees SET description = 'Chi phí vận hành tự ước tính trên mỗi đơn (đóng gói, nhân công...)' WHERE fee_key = 'shopee_operation';
UPDATE public.default_fees SET description = 'Hoa hồng affiliate cho người giới thiệu sản phẩm' WHERE fee_key = 'shopee_affiliate';
