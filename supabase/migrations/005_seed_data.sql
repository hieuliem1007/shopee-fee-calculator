-- ═══════════════════════════════════════════════════════════════════
-- 005_seed_data.sql
-- 
-- Seed dữ liệu ban đầu:
-- - 8 features (Shopee Calculator)
-- - 19 default_fees (cấu hình phí Shopee)
-- - 5 system_config (cấu hình hệ thống)
-- - 3 email_templates (cho Phase 5)
-- 
-- Lưu ý: 
-- - Dùng INSERT ... ON CONFLICT DO NOTHING → idempotent (chạy nhiều lần OK)
-- - Chỉ shopee_calculator_access có is_default_for_new_user = true
-- - Admin user phải tạo riêng qua Supabase Dashboard → set is_admin=true thủ công
-- 
-- THỨ TỰ APPLY: 001 → 002 → 003 → 004 → 005
-- ═══════════════════════════════════════════════════════════════════


-- ── 8 FEATURES ────────────────────────────────────────────────────
-- shopee_calculator_access là feature default cho user mới
-- Các feature khác cần admin gán thủ công khi user trả phí (Phase 2)

INSERT INTO public.features (id, name, description, category, level, display_order, is_default_for_new_user) VALUES
  ('shopee_calculator_access', 'Truy cập Shopee Calculator', 'Sử dụng công cụ tính phí Shopee cơ bản', 'calculation', 1, 1, true),
  ('shopee_reverse_mode', 'Mode tính ngược', 'Tính giá bán dựa trên lợi nhuận mong muốn', 'calculation', 2, 2, false),
  ('shopee_save_result', 'Lưu kết quả vào dashboard', 'Lưu kết quả tính phí để xem lại', 'calculation', 2, 3, false),
  ('shopee_export_pdf', 'Xuất PDF', 'Xuất kết quả tính phí ra file PDF', 'calculation', 2, 4, false),
  ('shopee_export_image', 'Tải ảnh kết quả', 'Tải ảnh kết quả tính phí', 'calculation', 2, 5, false),
  ('shopee_share_link', 'Chia sẻ link public', 'Tạo link chia sẻ kết quả cho người khác xem', 'calculation', 2, 6, false),
  ('shopee_compare_scenarios', 'So sánh kịch bản', 'So sánh nhiều kịch bản giá bán cùng lúc', 'calculation', 2, 7, false),
  ('shopee_smart_alerts', 'Cảnh báo tự động', 'Cảnh báo khi lợi nhuận thấp/lỗ', 'calculation', 2, 8, false)
ON CONFLICT (id) DO NOTHING;


-- ── 19 DEFAULT FEES ───────────────────────────────────────────────
-- Cấu hình phí Shopee mặc định (admin có thể chỉnh trong Phase 3)

INSERT INTO public.default_fees (fee_key, fee_label, fee_value, fee_unit, category, display_order, is_active) VALUES
  -- Phí cố định
  ('shopee_fixed_fee', 'Phí cố định Shopee', 3, 'percent', 'fixed', 1, true),
  
  -- Phí thanh toán theo hình thức kinh doanh
  ('payment_personal', 'Phí thanh toán (Cá nhân)', 4, 'percent', 'payment', 10, true),
  ('payment_household', 'Phí thanh toán (Hộ kinh doanh)', 1.5, 'percent', 'payment', 11, true),
  ('payment_company', 'Phí thanh toán (Công ty)', 4.5, 'percent', 'payment', 12, true),
  
  -- Phí ngành hàng (commission)
  ('commission_electronics', 'Hoa hồng ngành Điện tử', 3, 'percent', 'commission', 20, true),
  ('commission_fashion', 'Hoa hồng ngành Thời trang', 5, 'percent', 'commission', 21, true),
  ('commission_beauty', 'Hoa hồng ngành Mỹ phẩm', 5, 'percent', 'commission', 22, true),
  ('commission_food', 'Hoa hồng ngành Thực phẩm', 4, 'percent', 'commission', 23, true),
  ('commission_home', 'Hoa hồng ngành Gia dụng', 4, 'percent', 'commission', 24, true),
  ('commission_baby', 'Hoa hồng ngành Mẹ & Bé', 4, 'percent', 'commission', 25, true),
  ('commission_sports', 'Hoa hồng ngành Thể thao', 4, 'percent', 'commission', 26, true),
  ('commission_books', 'Hoa hồng ngành Sách', 3, 'percent', 'commission', 27, true),
  ('commission_other', 'Hoa hồng ngành khác', 4, 'percent', 'commission', 28, true),
  
  -- Phí biến đổi
  ('shipping_fee_avg', 'Phí vận chuyển trung bình', 30000, 'vnd', 'variable', 30, true),
  ('voucher_avg', 'Voucher trung bình', 5, 'percent', 'variable', 31, true),
  ('ad_fee_avg', 'Phí quảng cáo trung bình', 5, 'percent', 'variable', 32, true),
  ('return_rate', 'Tỷ lệ hoàn trả', 2, 'percent', 'variable', 33, true),
  ('packaging_cost', 'Chi phí đóng gói', 3000, 'vnd', 'variable', 34, true),
  ('operations_cost', 'Chi phí vận hành', 2, 'percent', 'variable', 35, true)
ON CONFLICT (fee_key) DO NOTHING;


-- ── 5 SYSTEM CONFIG ───────────────────────────────────────────────

INSERT INTO public.system_config (key, value, description) VALUES
  -- DEPRECATED key — giữ lại để tham khảo lịch sử, KHÔNG dùng cho logic
  -- Logic gán features đã chuyển sang bảng features (cột is_default_for_new_user)
  ('default_features_for_new_user', 
    '["shopee_calculator_access"]'::jsonb,
    '[DEPRECATED 2026-04-27] Logic gán features đã chuyển sang bảng features (cột is_default_for_new_user) làm single source of truth.'),
  
  -- Zalo support
  ('zalo_support_phone', 
    '"0901234567"'::jsonb,
    'Số Zalo hỗ trợ hiển thị trên trang locked và footer'),
  
  ('zalo_support_url', 
    '"https://zalo.me/0901234567"'::jsonb,
    'Link Zalo deep-link hỗ trợ trực tiếp'),
  
  -- Saved results retention
  ('saved_results_retention_days', 
    '90'::jsonb,
    'Số ngày giữ saved_results trước khi xóa (Phase 4)'),
  
  -- Brand info
  ('brand_info', 
    '{"name": "E-Dream", "domain": "edream.vn", "tagline": "Shopee partner education institute"}'::jsonb,
    'Thông tin thương hiệu hiển thị toàn site')
ON CONFLICT (key) DO NOTHING;


-- ── 3 EMAIL TEMPLATES (Phase 5 dùng với Resend) ──────────────────

INSERT INTO public.email_templates (id, name, subject, body_main, signature, variables) VALUES
  (
    'user_approved',
    'Email duyệt user',
    'Chào mừng đến với E-Dream Tools!',
    'Xin chào {{full_name}},

Tài khoản của bạn đã được duyệt thành công. Bạn có thể đăng nhập và bắt đầu sử dụng các công cụ tại {{app_url}}.

Nếu cần hỗ trợ, vui lòng liên hệ Zalo: {{zalo_phone}}',
    '— Đội ngũ E-Dream',
    ARRAY['full_name', 'app_url', 'zalo_phone']
  ),
  (
    'user_rejected',
    'Email từ chối user',
    'Cập nhật trạng thái đăng ký E-Dream Tools',
    'Xin chào {{full_name}},

Rất tiếc, yêu cầu đăng ký của bạn không được chấp thuận với lý do: {{rejection_reason}}

Nếu bạn cho rằng đây là sự nhầm lẫn, vui lòng liên hệ Zalo: {{zalo_phone}}',
    '— Đội ngũ E-Dream',
    ARRAY['full_name', 'rejection_reason', 'zalo_phone']
  ),
  (
    'password_reset',
    'Email đặt lại mật khẩu',
    'Đặt lại mật khẩu E-Dream Tools',
    'Xin chào {{full_name}},

Bạn vừa yêu cầu đặt lại mật khẩu. Click vào link sau để tạo mật khẩu mới (link có hiệu lực trong 1 giờ):

{{reset_url}}

Nếu bạn không yêu cầu việc này, vui lòng bỏ qua email này.',
    '— Đội ngũ E-Dream',
    ARRAY['full_name', 'reset_url']
  )
ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════
-- ADMIN USER SETUP (THỦ CÔNG):
-- 
-- Tạo admin user qua Supabase Dashboard:
-- 1. Authentication → Users → Add User → email + password
-- 2. SQL Editor: UPDATE public.profiles SET is_admin = true WHERE email = 'your-admin@email.com';
-- 
-- Lý do: Admin user là dữ liệu nhạy cảm, không nên seed trong file SQL public.
-- ═══════════════════════════════════════════════════════════════════