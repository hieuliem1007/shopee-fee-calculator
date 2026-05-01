-- M6.9 fix: Drop FK fee_audit_log_fee_id_fkey
-- Lý do: bảng fee_audit_log dùng cho cả default_fees và category_fees,
-- nhưng FK chỉ trỏ tới default_fees(id) → update_category_fee insert audit
-- với fee_id từ category_fees vi phạm FK → chặn admin sửa phí ngành hàng.
-- fee_key đã có prefix discriminate (vd 'category:mall:Đồ chơi' vs default
-- fee_key gốc) nên đủ phân biệt nguồn audit. Audit log append-only, không
-- có UI JOIN với fees → drop FK an toàn.

ALTER TABLE public.fee_audit_log
  DROP CONSTRAINT IF EXISTS fee_audit_log_fee_id_fkey;
