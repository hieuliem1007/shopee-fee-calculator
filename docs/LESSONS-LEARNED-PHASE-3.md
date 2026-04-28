# LESSONS LEARNED — PHASE 3: Fees Management & Calculator Integration

## Tổng quan
- **Thời gian:** 28/04/2026 (1 ngày làm)
- **Milestones:** 7
  - 3.1 DB schema + 10 RPCs (default_fees, category_fees, fee_audit_log, system_config)
  - 3.2 Admin /fees Tab 1 (default_fees CRUD + audit)
  - 3.3 Admin /fees Tab 2 (category_fees + Excel import bulk)
  - 3.4 Admin /settings (system_config)
  - 3.5 Permission Gate (`<FeatureGate>`) + Locked Page
  - 3.6 Wire Calculator with DB fees (refactor `useFeeCalculator`)
  - 3.7 Audit + Cleanup (Migration 016 race fix + tag stable)
- **Tag git:** `phase-3-stable`
- **Files thay đổi chính:** 6 migrations (011–016), 2 page admin (AdminFeesPage, AdminSettingsPage), 2 lib (`fees-admin.ts`, `system-config.ts`, `use-db-fees.ts`), 1 hook (`useFeeCalculator`), 2 components reusable (FeatureGate, CategoryImportDialog)
- **Cowork test:** PASS (M3.7 Phase B)

## Bugs phát hiện trong phase và lessons

### Lesson 1: Hardcode constants ≠ DB seed (pre-planning Phase 3)
Lib `fees.ts` hardcode 13 fees (key ngắn `ads`/`tax`, decimal `0.05`). DB seed có 19+ rows (key dài `shopee_ads`/`shopee_tax`, percent `5.00`). 5 discrepancy values: `pi_ship 2500↔1650`, `infra 1500↔3000`, thêm `shopee_voucher_xtra` & `shopee_freeship_xtra_cap`. Quyết định: DB là source of truth → wire calculator → output thay đổi (expected behavior).
**Lesson:** Khi setup project, đảm bảo single source of truth từ đầu. Không để 2 nguồn data drift song song. Nếu phải có cả hai (vd: hardcode fallback), thì phải có CI test compare hoặc migration script đồng bộ định kỳ.

### Lesson 2: Schema design cho linh động (anh feedback "phí Shopee thay đổi liên tục")
Em ban đầu plan gộp tất cả vào 1 bảng `default_fees`. Anh feedback architecture phải linh động → tách 2 bảng (`default_fees` + `category_fees`) → admin upload Excel cho ngành hàng. Tách cho phép scale: admin update giá theo ngành mà không động vào core fees.
**Lesson:** Business context quan trọng hơn convenience kỹ thuật. Khi spec phức tạp hoặc đụng tới quy trình admin lặp lại, hỏi user trước khi quyết schema. Một bảng "đẹp" về mặt code có thể tệ về mặt operations.

### Lesson 3: Race condition không có UNIQUE constraint
`default_fees.fee_key` chỉ check `EXISTS` trong RPC trước khi `INSERT`, không có UNIQUE ở DB. Race condition lý thuyết: 2 admin tạo cùng `fee_key` đồng thời → cả 2 pass EXISTS → cả 2 INSERT. Phát hiện ở M3.2, fix ở Migration 016 (cuối Phase 3) bằng partial unique index `WHERE is_active = true`.
**Lesson:** Mỗi field có business uniqueness PHẢI có DB-level UNIQUE constraint. RPC check một mình không đủ. Partial unique index `WHERE is_active=true` là pattern chuẩn để cùng tồn tại với soft-delete (cho phép re-INSERT key cũ sau khi soft-delete).

### Lesson 4: ProtectedRoute redirect loop với /locked
Brief M3.5 đề xuất wrap `/locked` trong `ProtectedRoute`. Nhưng `ProtectedRoute` redirect `pending/rejected/suspended` → `/locked`. Nếu `/locked` cũng trong `ProtectedRoute` → loop redirect vô tận. Claude Code phát hiện và quyết định sai brief → để `/locked` ngoài `ProtectedRoute`, vẫn bảo đảm bảo mật (page check session manually qua `useAuth`).
**Lesson:** Redirect logic phải vẽ flow rõ trước khi code. Đặc biệt với "guard pages" như `/locked`, `/forbidden`, `/login` — nguyên tắc: guard không được wrap chính nó. Test sớm bằng cách giả lập từng trạng thái user (pending/active/admin/anon) và xem có loop không.

### Lesson 5: Per-session loading vs Real-time
Em đề xuất 3 options khi wire calculator: real-time subscribe, per-session load, manual refresh. Anh chọn per-session (đơn giản nhất). Implementation: `useDbFees()` load 1 lần khi mount component, không re-fetch khi admin sửa. User reload page hoặc bấm "Tải lại" để cập nhật.
**Lesson:** Đừng over-engineer. Real-time subscription tốn cost (Supabase realtime quota) + complexity (race điều kiện local state vs server). Cho scale 10–50 user nội bộ, per-session là đủ. Nguyên tắc: chọn solution đơn giản nhất đáp ứng requirement, scale up khi có nhu cầu thật.

### Lesson 6: Synthetic 'fixed' fee để giữ UX backwards compat
DB không có row "Phí cố định ngành" trong `default_fees` (đã migrate sang `category_fees` — mỗi ngành có rate riêng). Hardcode cũ có 1 fee `id='fixed'` trong fixed panel với rate auto-update theo category. Claude Code tạo `buildSyntheticFixedFee(adj)` ở client để insert virtual fee vào fixed panel, giữ UX y hệt cũ.
**Lesson:** Khi refactor data layer, có thể giữ UI behavior bằng cách tạo "virtual" data ở client (synthetic row, computed field). Không bắt buộc data layer phải 1-1 với UI layer. Trade-off: thêm coupling client-side, nhưng tránh break behavior người dùng đã quen.

### Lesson 7: Cowork bug detection vs Claude Code self-test
Cowork (user thật) phát hiện 5 lỗi UX nhỏ qua Phase 2 + 3: toast duration, click coordinate, title casing, phone validation inline UI, form Enter-to-submit. Claude Code build pass nhưng không phát hiện vì không thể browser-test thật.
**Lesson:** Build pass + unit test không đủ cho UX. Phải có manual UI test (user thật hoặc playwright/cypress) cho mỗi milestone có UI thay đổi. Đặc biệt: focus management, form submission, keyboard navigation, toast/banner UX — những thứ unit test không catch được.

## Mandatory patterns Phase 4–5

1. **Single source of truth** — data nào ở DB là DB, không hardcode song song. Nếu cần fallback, viết migration sync script.
2. **Multi-table mutation → Atomic RPC** (continued from Phase 2) — bulk import, multi-table updates phải gói trong 1 RPC với transaction.
3. **Soft delete với `is_active` flag** — giữ audit trail. Không bao giờ hard DELETE.
4. **Partial UNIQUE index** trên `(column) WHERE is_active=true` — race condition + soft-delete coexistence.
5. **Per-session loading** cho data ít thay đổi (config, fees, master data). Real-time chỉ khi truly cần thiết.
6. **UI: loading + error + empty states** đầy đủ TRƯỚC khi nghĩ tới happy path. Mỗi data fetch component phải xử lý 4 trạng thái.
7. **Excel import: 3-step wizard** (chọn file → mode (replace/merge) → preview → confirm). Không bao giờ silent import.
8. **Permission gate**: `<FeatureGate>` reusable, tách check status (deleted/suspended) khỏi check feature. KHÔNG wrap `/locked` page (avoid loop).
9. **Validate cả 3 layers** (TypeScript / RPC raise / DB CHECK constraint) khi extend enum/status. Nếu không thì layer thiếu sẽ là điểm thoát.
10. **Test compare logic khi refactor calculation** — pure function (`computeFee`, `derive`) easy to test với 5 cases (rẻ/trung/cao cấp/cap/partial). Verify decimal/percent conversion (`fee_value/100` cho percent).

## Statistics
- **Migrations apply:** 6 (011 → 016)
- **RPCs viết mới:** 10 (Phase 3 RPCs: 8 CRUD + 1 bulk_import + 1 update_system_config)
- **Pages tạo mới:** 2 (`AdminFeesPage`, `AdminSettingsPage`)
- **Components reusable:** 2 (`FeatureGate`, `CategoryImportDialog`)
- **Bundle increase:** ~470 KB raw / ~160 KB gzip (chủ yếu do thư viện `xlsx 0.18.5`)
- **Bug fixes:** 1 (Migration 016 race condition)
- **Test pass:** Cowork UI test PASS + 10/10 audit MCP PASS

## Decisions không sửa, defer Phase 4

1. **Saved results với fee X cũ** → admin xóa fee → snapshot trong saved_results vẫn giữ fee cũ. Phase 4 issue (note trong saved_results docs khi build).
2. **xlsx 0.18.x prototype-pollution CVE** — admin-only tool, low risk. Không upgrade trong Phase 3 (chưa có version sạch trên npm).
3. **Ngành "Sách báo"** Cowork tạo trong test — giữ làm data thật trong DB (7 categories thay vì 6 seed gốc). Anh tự xóa nếu muốn về 6.
4. **Restore feature cho deleted fees** — chưa build RPC `restore_default_fee`. Inactive rows hiện read-only. Defer cho khi có nhu cầu thật.
5. **`shopee_freeship_xtra_cap` cap logic** — hiện default OFF, chưa implement min(rate*revenue, cap) trong `computeFee`. Defer Phase 4 nếu Cowork yêu cầu.
