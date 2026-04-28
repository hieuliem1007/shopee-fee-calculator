-- ═══════════════════════════════════════════════════════════════════
-- 012_create_category_fees.sql
-- Phase 3 Milestone 3.1: Bảng riêng quản lý phí cố định theo ngành hàng
--
-- Tách khỏi default_fees vì:
-- 1. Admin có thể bulk import qua Excel (UX khác)
-- 2. Calculator query JOIN sạch hơn
-- 3. Tương lai dễ mở rộng (đổi tên ngành, thêm ngành mới)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.category_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name text NOT NULL,
  fee_value numeric(10, 4) NOT NULL CHECK (fee_value >= 0),
  fee_unit text NOT NULL DEFAULT 'percent' CHECK (fee_unit IN ('percent', 'vnd')),
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_category_fees_name_lower
  ON public.category_fees (lower(category_name))
  WHERE is_active = true;

ALTER TABLE public.category_fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "category_fees_read_active" ON public.category_fees;
CREATE POLICY "category_fees_read_active" ON public.category_fees
  FOR SELECT TO authenticated
  USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "category_fees_admin_all" ON public.category_fees;
CREATE POLICY "category_fees_admin_all" ON public.category_fees
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.category_fees TO authenticated;
