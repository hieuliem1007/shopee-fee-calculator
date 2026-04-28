-- ═══════════════════════════════════════════════════════════════════
-- 014_insert_zalo_link_config.sql
-- Phase 3 Milestone 3.1: Add zalo_link config cho /locked page CTA
--
-- Note: system_config.value là jsonb, phải cast string → jsonb
-- (dùng to_jsonb() hoặc '"..."'::jsonb).
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO public.system_config (key, value, description)
VALUES (
  'zalo_link',
  to_jsonb('https://zalo.me/0000000000'::text),
  'Link Zalo của admin để user click khi cần liên hệ mở khóa tính năng'
)
ON CONFLICT (key) DO NOTHING;
