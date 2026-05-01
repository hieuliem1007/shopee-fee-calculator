# Phase 6 — COMPLETE

**STATUS**: STABLE — v1.0 Production Release
**Tag**: `v1.0`
**Date**: 2026-04-29 → 2026-05-01 (~3 ngày)

## Sẵn sàng Phase 7
Phase 7 — Email notification (Resend), 2FA, payment integration, advanced analytics, UI design system. Chưa có scope cụ thể.

## Scope đã giao
- 30 commits từ M6.0 (export wire) → M6.9 (Mall/Normal split + security audit).
- 7 migrations apply lên production (020, 021, 022, 023, 024, 025, 026).
- 4 RPC mới hoặc nâng cấp (`get_admin_overview` mới, `list_category_fees`/`create_category_fee`/`update_category_fee`/`bulk_import_categories` thêm `p_shop_type`).
- 6 page mới: `AdminOverviewPage`, `TermsPage`, `PrivacyPage`, `RecommendationCard` standalone, `ChangePasswordCard`, `ExportTemplate` off-screen.
- Smart alerts logic + Expert Engine recommendation 4 tầng.
- Tách phí ngành hàng Mall/Normal (M6.9.2).
- Security audit toàn diện (KHÔNG phát hiện lỗ hổng — 11/11 RLS, 18/18 admin RPC guard).
- 2 critical fix: M6.9 Calculator trắng trang regression + fee_audit_log FK violation.

## Functionality delivered theo milestone

### M6.0 — Export PNG/PDF + quick fixes (b939c69, d39a499, 68c59b8, 1660e24)
- Wire 2 nút "Tải ảnh" + "Xuất PDF" trong ResultCard với feature gate (`shopee_export_image`, `shopee_export_pdf`) + GA tracking.
- `lib/export-image.ts` (html2canvas) + `lib/export-pdf.ts` (jsPDF). 2 deps thêm vào package.json.
- Refactor sang off-screen `ExportTemplate` riêng — render đầy đủ cả những fee đang on (dynamic active), brand banner header, gauge pointer. Tách render export khỏi UI live tránh khác layout.
- Quick fixes: reverse mode → "coming soon", gate `shopee_compare_scenarios`, fix share button, sidebar cleanup.

### M6.2 — Layout polish (8 commits hotfix)
- 7 commit liên tiếp fix alignment regression: gauge segment 5 missing, hero pill baseline, FeeRow border-bottom, descender clip do `overflow:hidden` × html2canvas, 3 badges centering (`X/Y áp dụng` + pill %).
- Pattern lặp: layout fix CSS-only, 1 commit không xong, sửa lan dây chuyền 7 vòng. Lesson: layout polish cần Cowork test thực tế (không chỉ build pass).

### M6.3 — Smart Alerts (926322d, d2b7e63, 5082eda)
- `computeSmartAlerts` 8 cases test: profit < 0 skip (AlertBadges đảm trách), 0–5 → low-profit warning, var fee > 30% feeTotal → high-fee-{id} warning, feeTotal > 40% revenue → total-fee-high, 5–10 → mid-profit tip, 10–15 trung tính, > 15 → ok good-profit. Cap 3 warnings + 1 tip + 1 ok.
- Snapshot vào `saved_results.alerts` (jsonb) → SavedDetail + PublicShare render preset (không recompute).
- Merge `SmartAlerts` vào `ResultCard` + fix wording "phí cố định".
- Fix công thức hòa vốn theo cost-volume-profit: `P_hv = F / (1 - k)` với F = giá vốn + Σ flat fees, k = Σ pct rates. Thay vì `pctIncreaseNeeded = -profitPct` (sai vì khi tăng giá phí % scale theo doanh thu mới).

### M6.4 — Change password (968501c)
- `ChangePasswordCard` component validate client-side: 3 field bắt buộc, mới ≥ 8 ký tự, mới ≠ hiện tại, confirm khớp.
- Verify mật khẩu hiện tại bằng `signInWithPassword` (Supabase không có direct verify API). Nếu OK → `updateUser({password})`.
- Wire vào `UserProfilePage` giữa "Quyền của tôi" và "Trạng thái tài khoản".

### M6.5 — Static pages + Admin overview (9f3b781, 48182dc)
- `/terms` + `/privacy` static pages (no auth requirement, dùng PublicLayout).
- `AdminOverviewPage` với 5 KPI: total users, pending users, saved results, top category, share links + recent activity timeline.
- Migration 020 `get_admin_overview` RPC SECURITY DEFINER + `is_admin()` check, return single jsonb.
- Recent activity render VN action labels + relative time + feature_id pill + truncated email.

### M6.6.2 — Footer global (245c53b)
- Footer xuất hiện ở mọi app/admin page (sticky bottom). Branding + link Terms/Privacy.

### M6.7 — Saved + Share render đầy đủ (960e093)
- Tách `ResultHero` (live label + lợi nhuận lớn + gauge + 4 KPI) khỏi `ResultCard` để tái dùng cho SavedDetail + PublicShare.
- `FeePanel` thêm prop `readOnly` ẩn toggle/edit/add/trash, hiện badge "Áp dụng / Tắt".
- `splitFeesFromSnapshot` helper tách fixed vs var theo `group` field, fallback theo `VAR_KEYS` cho saved cũ pre-M6.7.
- SavedDetail + PublicShare redesign cùng layout: Thông tin sản phẩm + ResultHero + SmartAlerts + 2 FeePanel readOnly + CalcFlow + banner snapshot.

### M6.8 — Business type + Recommendation Engine (e71f0a2, fd95b43, 587ee7d, 555a25f)
- M6.8 task 1: Hình thức kinh doanh 2 option (HKD / Công ty) → auto tax mode → persist trong calculator state. Migration 021 thêm `business_type` enum.
- M6.8 task 2: `RecommendationCard` Expert Engine 4 tầng (chẩn đoán + mục tiêu 2 lộ trình + insights + actions + advanced metrics box).
  - `recommendation-engine.ts` pure logic: `computePTarget` (P=F/(1-(k+m))), `computeReturnBuffer`, `computeBreakEvenACOS`.
  - 7 insight rules với 1–2 wording variants chống lặp: acos-burning, high-fee-package, low-price-fixed-trap, high-affiliate, shop-mall-cost, voucher-shop-overlap, thin-margin-return-risk.
  - Variant pick deterministic theo hash seed (`productName+cost+sell`) → cùng sản phẩm = cùng wording, khác sản phẩm = khác wording.
  - 4 persona test PASS (Lính mới, Tay to ads, Shop Mall, Phá giá).
- Fix 1: RecommendationCard sửa màu xanh đồng nhất + dời vị trí (sau "Top khoản phí" trước "So sánh kịch bản").
- Fix 2: Math bug — `splitFixedFees` chỉ iterate `fixedFees`, miss flat fees thuộc `varFees` (vd Vận hành/đơn 4.000đ kind=flat category=shopee_variable). Fix: phân loại theo `kind` không phải `category`. Verify case 200k/500k.

### M6.9 — Mall/Normal split + Security audit (8e879b6, 596ee15, 68aedea, 3bc8aee, 2251885)
- M6.9.1: Migration 022 thêm feature `shopee_expert_insight` (KHÔNG default cho user cũ). RecommendationCard wrap gate, locked card CTA Zalo. SavedDetail + PublicShare luôn xem được snapshot (giống SmartAlerts).
- M6.9.2: Migration 023 thêm cột `shop_type` vào `category_fees`, drop unique cũ trên `lower(name)`, tạo unique compound `(shop_type, lower(name))`. Backfill: clone 9 ngành active sang `shop_type='mall'`. Migration 024 RPCs `list/create/update/bulk_import` nhận `p_shop_type`. Admin /admin/fees tab "Phí ngành hàng" với 2 sub-tab Mall/Normal. Calculator: `shopType` lift lên `CalculatorApp` level, `useDbFees(shopType)` refetch khi đổi loại shop.
- M6.9 regression hotfix:
  - Bug 1: `useDbFees` loading flag tính sai frame đầu tiên → CalculatorApp render với categories=[] → SelectField crash → trắng trang. Fix: `loading = !initialLoaded`.
  - Bug 2: Migration 024 `CREATE OR REPLACE` không thật sự replace vì signature mới (thêm `p_shop_type`) → 2 phiên bản cùng tồn tại → ambiguous overload → wrapper return [] → Admin Fees ngành hàng 0. Fix: Migration 025 DROP old overloads.
- Migration 026: drop FK `fee_audit_log_fee_id_fkey` (chỉ trỏ default_fees, không hỗ trợ category) — `fee_key` đã có prefix discriminate (`category:mall:...` vs default fee_key gốc).
- Security audit (commit 2251885 + `SECURITY-AUDIT-2026-05-01.md`): KHÔNG phát hiện lỗ hổng. 11/11 tables RLS enabled, 32 SECURITY DEFINER RPC (18 admin có guard, 6 user-scoped, 1 anon-public, 7 trigger/utility). Trigger `prevent_profile_escalation` BEFORE UPDATE chặn self-promotion.

## Test gating
- Build TypeScript: pass cho mọi commit.
- 4 persona test cho RecommendationCard: PASS.
- 8 case test cho computeSmartAlerts: PASS.
- Live test M6.9 sửa phí Mall + Normal + default: PASS sau migration 026.
- Security audit: 11/11 RLS, 18/18 admin RPC guard, 0 lỗ hổng.
- Cowork UI test: từng round per-milestone, đặc biệt M6.2 (7 vòng layout fix).

Xem chi tiết [LESSONS-LEARNED-PHASE-6.md](./LESSONS-LEARNED-PHASE-6.md).
Xem audit bảo mật [SECURITY-AUDIT-2026-05-01.md](./SECURITY-AUDIT-2026-05-01.md).
