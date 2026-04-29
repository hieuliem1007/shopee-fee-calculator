-- M6.8 Task 1: Persist business_type per user (Hộ kinh doanh / Công ty).
-- Drives Shopee Calculator dropdown "Hình thức kinh doanh" và auto-set
-- shopee_tax rate (HKD = 1.5%, Công ty = tự khai → mặc định 0%).
--
-- Note: dùng giá trị 'hokd' (không phải 'hkd') để khớp với TaxMode enum
-- frontend (TaxMode hiện có 'hokd' | 'company' | 'personal'). Bỏ 'personal'
-- ở UI; DB chỉ chấp nhận 2 giá trị cho user thông qua CHECK constraint.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_type text DEFAULT 'hokd';

-- Backfill rows hiện có (NULL → 'hokd')
UPDATE public.profiles
SET business_type = 'hokd'
WHERE business_type IS NULL;

-- CHECK constraint: chỉ chấp nhận 2 giá trị hợp lệ.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_business_type_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_business_type_check
      CHECK (business_type IN ('hokd', 'company'));
  END IF;
END $$;
