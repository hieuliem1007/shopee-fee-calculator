-- ═══════════════════════════════════════════════════════════════════
-- 001_initial_schema.sql
-- 
-- Tạo 10 bảng cốt lõi của E-Dream Tools Phase 1
-- 
-- Lưu ý: File này là REFERENCE để tái dựng DB từ đầu nếu cần.
-- Schema thực tế đã được Claude Code tạo trong Supabase Dashboard
-- trước khi có folder migrations này.
-- 
-- THỨ TỰ APPLY: 001 → 002 → 003 → 004 → 005
-- ═══════════════════════════════════════════════════════════════════


-- ── BẢNG 1: profiles (user profiles + admin info) ────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'rejected', 'suspended', 'deleted')),
  rejected_reason text,
  suspended_reason text,
  package_label text,
  package_note text,
  last_login_at timestamptz,
  feature_usage_count integer DEFAULT 0,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);


-- ── BẢNG 2: features (catalog 8 tính năng) ────────────────────────
CREATE TABLE IF NOT EXISTS public.features (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  parent_feature_id text REFERENCES public.features(id),
  level integer NOT NULL DEFAULT 1 CHECK (level IN (1, 2)),
  display_order integer DEFAULT 0,
  is_default_for_new_user boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);


-- ── BẢNG 3: user_features (junction: user có quyền feature nào) ──
CREATE TABLE IF NOT EXISTS public.user_features (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature_id text NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
  granted_at timestamptz DEFAULT now(),
  granted_by uuid REFERENCES public.profiles(id),
  PRIMARY KEY (user_id, feature_id)
);

CREATE INDEX IF NOT EXISTS idx_user_features_user ON public.user_features(user_id);


-- ── BẢNG 4: default_fees (cấu hình phí mặc định cho calculator) ──
CREATE TABLE IF NOT EXISTS public.default_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_key text NOT NULL UNIQUE,
  fee_label text NOT NULL,
  fee_value numeric NOT NULL,
  fee_unit text NOT NULL CHECK (fee_unit IN ('percent', 'vnd')),
  category text NOT NULL,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id)
);


-- ── BẢNG 5: fee_audit_log (log mọi thay đổi default_fees) ────────
CREATE TABLE IF NOT EXISTS public.fee_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_id uuid NOT NULL REFERENCES public.default_fees(id),
  fee_key text NOT NULL,
  old_value numeric,
  new_value numeric NOT NULL,
  reason text NOT NULL,
  changed_at timestamptz DEFAULT now(),
  changed_by uuid NOT NULL REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_fee_audit_changed_at ON public.fee_audit_log(changed_at DESC);


-- ── BẢNG 6: saved_results (Phase 4: user lưu kết quả tính phí) ───
CREATE TABLE IF NOT EXISTS public.saved_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tool_id text NOT NULL,
  product_name text,
  inputs jsonb NOT NULL,
  fees_snapshot jsonb NOT NULL,
  results jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_saved_results_user ON public.saved_results(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_results_expires ON public.saved_results(expires_at);


-- ── BẢNG 7: shared_links (Phase 4: chia sẻ kết quả public) ───────
CREATE TABLE IF NOT EXISTS public.shared_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  result_id uuid NOT NULL REFERENCES public.saved_results(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  view_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_shared_links_slug ON public.shared_links(slug);


-- ── BẢNG 8: email_templates (Phase 5: templates cho Resend) ──────
CREATE TABLE IF NOT EXISTS public.email_templates (
  id text PRIMARY KEY,
  name text NOT NULL,
  subject text NOT NULL,
  body_main text NOT NULL,
  signature text NOT NULL,
  variables text[],
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id)
);


-- ── BẢNG 9: system_config (key-value cấu hình hệ thống) ──────────
CREATE TABLE IF NOT EXISTS public.system_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id)
);


-- ── BẢNG 10: activity_log (audit trail user actions) ─────────────
CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  feature_id text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_action 
  ON public.activity_log(user_id, action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_action_date 
  ON public.activity_log(action, created_at DESC);


-- ── ENABLE RLS trên tất cả 10 bảng ───────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.default_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;