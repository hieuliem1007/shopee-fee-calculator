# LESSONS LEARNED — PHASE 4: Saved Results, Dashboard & Sharing

## Tổng quan
- **Thời gian:** 28/04/2026 (~1 ngày làm)
- **Milestones:** 5
  - 4.1 DB setup (migrations 017+018: helpers, trigger, 6 RPCs)
  - 4.2 Wire Calculator + SaveResultDialog + useHasFeature hook
  - 4.3 DashboardPage (list + search + delete + pagination)
  - 4.4 SavedResultDetailPage + ShareLinkDialog
  - 4.5 PublicSharePage (anon) + Audit + Bugfix migration 019
- **Tag git:** `phase-4-stable`
- **Files thay đổi:** 3 migrations, 5 page/component mới, 2 lib mới (`saved-results.ts`, `format.ts`)
- **Cowork test:** 13/14 PASS + 1 partial (automation limitation, không phải bug)

## Bugs phát hiện và lessons

### Lesson 1: jsonb parsing trong trigger
Phát hiện ở M4.5 audit Test 6: trigger `check_saved_results_limit` dùng `(value::text)::int` → fail nếu admin sửa qua RPC `update_system_config_value` vì kết quả jsonb là **string** (`'"25"'` kèm dấu nháy), không phải number. PostgreSQL ERROR `22P02 invalid input syntax for type integer: ""25""`. Fix migration 019: đổi sang `(value#>>'{}')::int` — extract jsonb path → strip quotes → cast int. Pattern này hoạt động cho cả jsonb number và jsonb string.
**Lesson:** Khi đọc jsonb cần normalize, đừng dùng `::text` trực tiếp vì giữ quotes cho jsonb strings. Pattern an toàn: `(value#>>'{}')::int`. Wrap trong `EXCEPTION WHEN OTHERS` block để fallback giá trị mặc định nếu cast vẫn fail (vd: value là object/array bất ngờ).

### Lesson 2: Snapshot vs Reference cho data preservation
Decision Phase 4: lưu `fees_snapshot` full vào `saved_results.fees_snapshot` jsonb thay vì FK reference đến `default_fees(id)`. Lý do: admin xóa/sửa fee không ảnh hưởng kết quả đã lưu — user xem lại 90 ngày sau vẫn thấy giống lúc tính. Trade-off: storage tăng nhẹ (~5 KB/row × 50 rows × 100 user = 25 MB ceiling), nhưng decoupling giúp data resilient.
**Lesson:** Cho data có lifecycle dài (saved results, invoices, snapshots, audit), prefer **snapshot pattern** over FK reference. FK reference phù hợp cho data live (user_features, current state). Tự hỏi: "khi data nguồn bị xóa/sửa, user expect snapshot vẫn giữ giá trị cũ không?"

### Lesson 3: Public route phải nằm NGOÀI ProtectedRoute
Route `/share/:slug` được anon access, không có auth context. Phải đặt ngoài `<ProtectedRoute>` block trong `App.tsx`. Pattern này tương tự `/locked` đã học từ Phase 3 Lesson 4. Same goes for `PublicSharePage` không được import `useAuth` — page hoàn toàn standalone.
**Lesson:** Vẽ flow auth state trước khi setup routing. Public/anon routes phải tách riêng khỏi protected block. Nếu cần check session optionally (vd: hiện "Đăng nhập" header), import nhưng wrap try/catch hoặc render conditional dựa trên `user === null`.

### Lesson 4: Share link 1-result-1-link đơn giản hóa logic
Quyết định: 1 `saved_result` chỉ có 1 active `share_link`. Recreate = `DELETE WHERE result_id = ?` rồi `INSERT`. Atomic trong cùng RPC `create_share_link`. Đơn giản hơn nhiều so với multi-links (vd: tracking analytics per-link, grant access per-link).
**Lesson:** Hỏi business decisions sớm để chọn architecture đơn giản nhất. Multi-links là nice-to-have nhưng chưa cần thiết cho scale 10–50 user. Khi user feedback cần multi-links sau, schema đã ready (table riêng `shared_links` không lock vào 1-1 cardinality).

### Lesson 5: Trigger BEFORE INSERT cho business limit
Trigger `check_saved_results_limit` chạy `BEFORE INSERT`, đọc `system_config.saved_results_max_per_user` dynamic, atomic guarantee. Đảm bảo race-free khi 2 tab cùng save từ 1 user (kịch bản hiếm nhưng possible).
**Lesson:** Business limit (max per user, rate limit, quota) nên ở trigger DB, không phải client-side check. Client check race-prone (2 tab cùng save trước khi state sync). DB trigger có atomicity guarantee từ PG.

### Lesson 6: Slug vietnamese ở PG function thay vì JS
Function `slugify_vietnamese` viết bằng PL/pgSQL trong migration 017 thay vì TypeScript `slugifyVi` ở `src/lib/fees.ts`. Lý do: tạo slug ở RPC `create_share_link` đảm bảo consistent nếu sau này có CLI tool, batch import, edge function. Cũng tránh Unicode normalization khác nhau giữa Node/Browser.
**Lesson:** Data transformations dùng nhiều lần (slug, format, hash, normalize) nên ở DB layer (PG functions). Client-side helpers OK cho display-only (vd: `formatVND`, `relativeTime`). Một số transform cần ở cả 2 layers cho UX (vd: client preview slug trước khi submit) — duplicate có ý thức.

### Lesson 7: CASCADE delete cho relations
- `saved_results.user_id` FK `ON DELETE CASCADE` → user xóa account → saved_results tự xóa
- `shared_links.result_id` FK `ON DELETE CASCADE` → result xóa → link tự xóa
- `shared_links.user_id` FK `ON DELETE CASCADE` → bonus safety net

Không cần manual cleanup trong RPC `delete_result` — chỉ DELETE từ saved_results, shared_links theo CASCADE.
**Lesson:** Setup CASCADE properly ở schema design giảm nhiều code defensive trong RPC. Quy tắc: child table luôn CASCADE follow parent. Audit/log table thường KHÔNG cascade (giữ history).

### Lesson 8: Clipboard API requires user gesture
Cowork phát hiện "Copy link" button không hoạt động trong automation/script context. Root cause: `navigator.clipboard.writeText` yêu cầu user gesture (real click event), programmatic click không count. App đã có graceful fallback: input readonly + `onFocus={e => e.currentTarget.select()}` → user Ctrl+C nếu nút Copy fail. Cũng catch error trong handleCopy và set fallback message.
**Lesson:** Clipboard API có security restriction (HTTPS only, user gesture only). Always provide fallback: visible readonly input với auto-select onFocus, hoặc fallback document.execCommand('copy') (deprecated nhưng vẫn work). Đừng giả định clipboard API luôn available.

## Mandatory patterns Phase 5

1. **Snapshot pattern** cho data có lifecycle dài (saved_results model)
2. **Trigger BEFORE INSERT/UPDATE** cho business limits (tránh race condition giữa client tabs)
3. **PG functions cho data transformation** chung dùng cross-platform (slugify, formatting, normalization)
4. **Public routes** đặt ngoài ProtectedRoute, không import `useAuth`
5. **CASCADE delete** properly setup ở schema design (giảm code defensive)
6. **Clipboard API fallback** (input readonly + select onFocus + try/catch)
7. **jsonb parsing** bằng `#>>'{}'` thay vì `::text` (handles both number và string)
8. **Per-session feature cache** (Map<user_id, Promise<features[]>>) cho admin bypass + dedupe fetches

## Statistics
- **Migrations apply:** 3 (017, 018, 019)
- **RPCs viết mới:** 6 (`save_result`, `list_my_results`, `get_result_detail`, `delete_result`, `create_share_link`, `get_public_result`)
- **Helper functions:** 3 (`slugify_vietnamese`, `generate_random_suffix`, `check_saved_results_limit`)
- **Pages tạo mới:** 3 (`DashboardPage` refactor, `SavedResultDetailPage`, `PublicSharePage`)
- **Components reusable:** 2 (`SaveResultDialog`, `ShareLinkDialog`)
- **Hooks reusable:** 1 (`useHasFeature`)
- **Libs:** 2 (`saved-results.ts`, `format.ts`)
- **Bug fixes:** 1 (Migration 019 jsonb parsing)
- **Cowork test:** 13/14 + 1 partial (automation limitation), DB audit 8/8

## Decisions không sửa, defer Phase 5

1. **Toast duration 2s** (Cowork suggest 3–4s) — cosmetic, có thể tunable qua `system_config` sau.
2. **Buttons "Tải ảnh" + "Xuất PDF"** trong ResultCard giữ UI mock — đợi Phase 5 (download/export feature).
3. **Smart Alerts feature** — chưa có wiring (mock UI ở `AlertBadges`), đợi Phase 5.
4. **Email notification** khi share link sắp expire — defer Phase 5 (Resend integration).
5. **Multi-links per result** — schema ready, business chưa cần, defer khi có user feedback.
6. **`shopee_freeship_xtra_cap` cap logic** trong `computeFee` — defer (đã note Phase 3).
7. **Restore feature cho deleted fees** — defer (đã note Phase 3).
