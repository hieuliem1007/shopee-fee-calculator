-- M6.9.1: Thêm feature shopee_expert_insight cho RecommendationCard
-- KHÔNG default cho user cũ (admin tự gán thủ công để monetize).
-- Đặt display_order = 3 trong nhóm 'calculation' (giữa smart_alerts=2 và compare_scenarios=3).

INSERT INTO public.features
  (id, name, description, category, parent_feature_id, level, display_order, is_default_for_new_user)
VALUES
  ('shopee_expert_insight',
   'Phân tích chuyên sâu',
   'Gợi ý chiến lược 4 tầng từ E-Dream (Chẩn đoán + Mục tiêu + Insight + Action)',
   'calculation',
   'calculation',
   2,
   3,
   false)
ON CONFLICT (id) DO NOTHING;
