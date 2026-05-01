# LESSONS LEARNED — PHASE 6: Feature Completion + Polish + Security Audit

## Tổng quan
- **Thời gian:** 29/04/2026 → 01/05/2026 (~3 ngày — phase dài nhất)
- **Milestones:** M6.0 → M6.9 + Security audit + v1.0 release
- **Tag git:** `v1.0`
- **Files thay đổi:** 7 migrations (020–026), 6 page mới, 4 RPC nâng cấp, 1 lib lớn (`recommendation-engine.ts` 550 dòng)
- **Critical fix:** 2 (M6.9 regression Calculator trắng + fee_audit_log FK violation)
- **Security audit:** 0 lỗ hổng phát hiện

## Bugs phát hiện và lessons

### Lesson 1: html2canvas + overflow:hidden cắt descender chữ
M6.2 round 4 (commit 196fe72): khi export PNG, các ký tự có descender (`g`, `y`, `p`, `q`) bị cắt phần đuôi. Root cause: parent có `overflow:hidden` + line-height vừa đúng glyph height → html2canvas serialize đoạn cắt thay vì để overflow chảy. Fix: bỏ `overflow:hidden`, dùng `padding-bottom` đệm space cho descender.
**Lesson:** Khi screenshot DOM (html2canvas, dom-to-image), tránh `overflow:hidden` trên text container vì serializer có thể clip. Pattern an toàn: line-height ≥ 1.4, padding-bottom ≥ 4px, không clip ngoài cùng. Test bằng từ chứa descender (`gypsy`, `puppy`).

### Lesson 2: Off-screen render template tốt hơn live ResultCard cho export
M6.2 chia 7 commit hotfix vì cố screenshot ResultCard live → mỗi lần fix layout cho live thì export hỏng (gauge segment 5 missing, hero pill baseline lệch, FeeRow border-bottom). Lesson rút từ M6.2 → refactor M6.0 (commit 1660e24): tạo `ExportTemplate` standalone render off-screen với layout cố định cho export. Live ResultCard tự do polish theo UX, export template không bị ảnh hưởng.
**Lesson:** Tách render UI live và render export. Live tối ưu interaction (click, hover, responsive). Export tối ưu pixel-perfect cố định size (vd 800px × dynamic). Tránh dùng cùng 1 component cho 2 mục đích — luôn có 1 cái phải compromise.

### Lesson 3: Build pass ≠ feature pass — live test BẮT BUỘC
M6.9.2 commit 596ee15: TypeScript build pass, deploy production, user click Calculator → trắng trang. Bug 1 root cause: `loading = !initialLoaded && refetching` evaluated false ở frame đầu (refetching mặc định false, initialLoaded false) → CalculatorBody render với categories=[] → SelectField line 80 đọc `current.label` trên undefined → crash. TypeScript không catch vì `current` typed nhưng có thể undefined runtime.
**Lesson:** Build pass chỉ verify type signature, không verify runtime. Mọi PR đụng Calculator (UI quan trọng) phải mở browser thật, click qua flow chính (không phải localhost autoload). User feedback `"Live test BẮT BUỘC, không chỉ build pass"` lặp lại 3 lần Phase 6 → áp dụng từ Phase 7 trở đi.

### Lesson 4: CREATE OR REPLACE FUNCTION KHÔNG replace nếu signature đổi
M6.9.2 Bug 2: Migration 024 `CREATE OR REPLACE FUNCTION list_category_fees(p_shop_type text DEFAULT null, p_include_inactive boolean DEFAULT false)` — Postgres KHÔNG replace function cũ `list_category_fees(p_include_inactive boolean)` mà tạo function mới (overload). 2 phiên bản cùng tồn tại → `supabase.rpc('list_category_fees', {p_include_inactive: true})` ambiguous → wrapper return []. Fix: Migration 025 DROP old overloads explicitly.
**Lesson:** `CREATE OR REPLACE FUNCTION` chỉ replace khi signature **identical** (cùng arg types theo thứ tự). Thêm/xoá/đổi arg = function mới. Migration đổi signature **PHẢI** có DROP statement trước. Verify bằng `\df function_name` xem có đúng 1 dòng không.

### Lesson 5: Audit log multi-table — drop FK thay vì FK split
fee_audit_log thiết kế ban đầu chỉ cho `default_fees` (FK trỏ tới `default_fees(id)`). Phase 6 M6.9.2 thêm RPC `update_category_fee` insert audit cùng bảng nhưng `fee_id` từ `category_fees.id` → vi phạm FK. 4 approach cân nhắc: (A) tách 2 bảng audit, (B) đổi FK polymorphic, (C) drop FK, (D) thêm cột `fee_table` discriminator. Chọn C vì `fee_key` đã có prefix discriminate (`category:mall:...` vs default fee_key gốc) đủ phân biệt nguồn. Audit log append-only, không có UI JOIN với fees → không break gì.
**Lesson:** Audit log dùng cho nhiều bảng nguồn → drop FK thay vì split bảng. Discriminator field (text key, table_name, action_type) đủ phân biệt mà không cần FK ràng buộc. Pattern này áp dụng cho: activity_log, audit_log, event_log, message_log. FK chỉ thực sự cần khi data nguồn xoá phải cascade — audit thường KHÔNG cascade (giữ history).

### Lesson 6: Snapshot recommendation/alerts vào saved_results để chống drift
M6.3 SmartAlerts + M6.8 RecommendationCard đều snapshot kết quả vào `saved_results.alerts` (jsonb) + `saved_results.recommendation` (jsonb). SavedDetail + PublicShare render preset từ snapshot, KHÔNG recompute. Lý do: nếu admin sửa rule logic (vd ngưỡng 30% → 35%), saved cũ vẫn render đúng wording lúc save. Tương tự nếu fee rate thay đổi, recommendation P_target không nhảy theo data mới.
**Lesson:** Mọi computed output có wording/threshold biến động (alerts, recommendations, badges, scores) phải snapshot vào saved data. KHÔNG recompute lúc render saved. Pattern y hệt `fees_snapshot` Phase 4 nhưng cho computed values. Hỏi: "5 năm sau xem lại link share, user expect số có giống lúc save không?"

### Lesson 7: Variant wording deterministic theo seed thay vì random
M6.8 task 2 RecommendationCard: 7 insight rules có 2 wording variants để chống lặp khi user tính 5 sản phẩm cùng case. Nếu pick `Math.random()` → cùng sản phẩm refresh trang ra wording khác → user confused. Fix: hash seed từ `productName + cost + sell` → variant pick deterministic. Cùng input = cùng output mọi lúc.
**Lesson:** UI có variant chống nhàm phải pick deterministic theo input, không random. Pattern: hash inputs → modulo số variant → pick. Đảm bảo idempotent + reproducible (test verify dễ hơn). Áp dụng cho: A/B copy, error message variants, empty state messages.

### Lesson 8: Math bug — phân loại theo kind không phải category
M6.8 fix 2 (commit 555a25f): `computePTarget` phân loại fee theo `category` (`shopee_fixed` vs `shopee_variable`) → bỏ sót phí flat thuộc nhóm variable (vd Vận hành/đơn 4.000đ kind=flat category=shopee_variable). Result: F thiếu 4k → P_target thấp 25k → user mất margin. Fix: phân loại theo `kind` (flat vs pct), không theo `category` (nhóm UI).
**Lesson:** Schema có 2 axis (category × kind) thì code logic phải pick đúng axis. Category là UI grouping (nhóm hiển thị panel), kind là computation grouping (cách tính). Đừng dùng category cho math. Test rule of thumb: cộng F = giá vốn + tất cả phí kind=flat (bất kể category). k = tất cả phí kind=pct. Verify case bằng tay với 2–3 sản phẩm khác category.

### Lesson 9: Layout polish dễ regress lan dây chuyền
M6.2: 7 commit liên tiếp hotfix layout (`cc434e6`, `dd2e85a`, `342ed7d`, `196fe72`, `63248a1`, `e5bb3cd`, `744fc10`). Mỗi commit fix 1 chỗ → break chỗ khác. Pattern lặp: badge centering, gauge bar ratio, FeeRow border, descender clip, hero pill baseline, tabular-nums spacing. Root cause sâu: dùng nhiều tricks CSS chồng chéo (line-height + padding + flex-center + box-sizing) chưa có design system thống nhất.
**Lesson:** Khi layout fix lan dây chuyền 3+ vòng → STOP, ngồi xuống check design system gốc. Dùng box-sizing border-box nhất quán, chuẩn hoá vertical-center bằng `display: flex; align-items: center` thay vì line-height tricks, define spacing scale (4/8/12/16/24/32). Phase 7 nên có design tokens + Storybook component library trước khi UI polish lớn.

### Lesson 10: Security audit cuối phase — phòng thủ nhiều lớp
Phase 6 chốt bằng security audit toàn diện: 11/11 tables RLS + 18/18 admin RPC `is_admin()` guard + trigger `prevent_profile_escalation` ngăn self-escalation. Phòng thủ 3 lớp: (1) RLS policy chặn cross-user, (2) RPC SECURITY DEFINER với `is_admin()` guard, (3) trigger BEFORE UPDATE ngăn user tự sửa field nhạy cảm dù RLS UPDATE policy chỉ check `auth.uid()=id`.
**Lesson:** Security audit toàn diện cuối phase phát hành (v1.0, v2.0). Không depend vào 1 lớp duy nhất — RLS đủ cho query thẳng nhưng RPC SECURITY DEFINER bypass RLS, nên RPC phải có guard riêng. Trigger BEFORE UPDATE là lớp cuối cùng phòng escalation. Mẫu sẵn `is_admin()` SECURITY DEFINER + COALESCE FALSE từ Phase 1 áp dụng nhất quán.

## Mandatory patterns Phase 7

1. **Tách render live vs export** — không dùng cùng 1 component cho 2 mục đích
2. **Live test BẮT BUỘC** trước commit (mở browser thật, không chỉ build pass)
3. **`CREATE OR REPLACE` đổi signature** — bắt buộc DROP old overload trước
4. **Drop FK cho audit log multi-table** — discriminator field thay FK
5. **Snapshot computed values** vào saved data (alerts, recommendations, scores)
6. **Variant pick deterministic theo seed**, không Math.random
7. **Math logic phân loại theo `kind`** (computation), không theo `category` (UI)
8. **Layout fix > 3 vòng** → STOP, audit design system gốc
9. **Security audit cuối phase phát hành** — RLS + RPC guard + trigger BEFORE UPDATE
10. **html2canvas tránh overflow:hidden** trên text container

## Statistics
- **Migrations apply:** 7 (020–026)
- **RPCs viết mới hoặc nâng cấp:** 5 (`get_admin_overview`, `list_category_fees`, `create_category_fee`, `update_category_fee`, `bulk_import_categories`)
- **Pages tạo mới:** 6 (`AdminOverviewPage`, `TermsPage`, `PrivacyPage`, `RecommendationCard` standalone, `ChangePasswordCard`, `ExportTemplate` off-screen)
- **Components tách reusable:** 2 (`ResultHero` từ ResultCard, `Toast` từ inline state)
- **Libs lớn:** 2 (`recommendation-engine.ts` 550 dòng, `export-image.ts` + `export-pdf.ts`)
- **Critical bug fixes:** 2 (M6.9 regression Calculator + fee_audit_log FK)
- **Security findings:** 0 (audit clean)

## Decisions không sửa, defer Phase 7

1. **Reverse mode** (tính ngược từ profit target → giá bán) — placeholder "coming soon".
2. **Compare scenarios** — gate `shopee_compare_scenarios` ready, UI chưa làm.
3. **Email notification** (Resend) — defer Phase 7.
4. **2FA/MFA** — defer Phase 7.
5. **Design system tokens + Storybook** — Phase 6 polish ad-hoc, Phase 7 nên chuẩn hoá.
6. **Multi-shop type beyond Mall/Normal** (Premium, OSP) — schema ready (`shop_type` enum), UI chỉ 2 sub-tab.
7. **Restore feature cho deleted fees** — defer (đã note Phase 3, 4).
8. **`shopee_freeship_xtra_cap` cap logic** trong `computeFee` — defer (đã note Phase 3).
