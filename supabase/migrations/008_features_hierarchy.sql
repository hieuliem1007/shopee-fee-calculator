-- ═══════════════════════════════════════════════════════════════════
-- 008_features_hierarchy.sql
--
-- Phase 2 Milestone 2.4: Tổ chức 8 features thành tree 2-level
--
-- Trước: tất cả 8 features flat, parent_feature_id=NULL, level mixed
-- Sau: 4 parent categories (level=1) + 8 children (level=2)
-- ═══════════════════════════════════════════════════════════════════

-- Step 1: Insert 4 parent features (categories)
INSERT INTO public.features (id, name, description, category, parent_feature_id, level, display_order, is_default_for_new_user)
VALUES
  ('access', 'Truy cập cơ bản', 'Quyền truy cập tools cơ bản', 'category', NULL, 1, 1, false),
  ('calculation', 'Tính toán nâng cao', 'Các tính năng tính toán phức tạp', 'category', NULL, 1, 2, false),
  ('storage_export', 'Lưu trữ & Xuất file', 'Lưu kết quả và xuất ra nhiều định dạng', 'category', NULL, 1, 3, false),
  ('sharing', 'Chia sẻ', 'Chia sẻ kết quả với người khác', 'category', NULL, 1, 4, false)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Update 8 existing children với parent + level=2 + display_order trong group
UPDATE public.features SET parent_feature_id = 'access', level = 2, display_order = 1
  WHERE id = 'shopee_calculator_access';

UPDATE public.features SET parent_feature_id = 'calculation', level = 2, display_order = 1
  WHERE id = 'shopee_reverse_mode';
UPDATE public.features SET parent_feature_id = 'calculation', level = 2, display_order = 2
  WHERE id = 'shopee_smart_alerts';
UPDATE public.features SET parent_feature_id = 'calculation', level = 2, display_order = 3
  WHERE id = 'shopee_compare_scenarios';

UPDATE public.features SET parent_feature_id = 'storage_export', level = 2, display_order = 1
  WHERE id = 'shopee_save_result';
UPDATE public.features SET parent_feature_id = 'storage_export', level = 2, display_order = 2
  WHERE id = 'shopee_export_pdf';
UPDATE public.features SET parent_feature_id = 'storage_export', level = 2, display_order = 3
  WHERE id = 'shopee_export_image';

UPDATE public.features SET parent_feature_id = 'sharing', level = 2, display_order = 1
  WHERE id = 'shopee_share_link';

-- VERIFY:
-- SELECT id, name, parent_feature_id, level, display_order
-- FROM public.features ORDER BY level, display_order, parent_feature_id;
-- Kỳ vọng: 12 rows total, 4 parents level=1, 8 children level=2
