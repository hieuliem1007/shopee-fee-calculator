# LESSONS LEARNED — MASTER (Phase 1 → 6, v1.0)

**Phạm vi:** Tổng hợp lessons xuyên suốt 6 phase (~3 tuần làm), từ Auth & Approval Flow (Phase 1) đến Production Release v1.0 (Phase 6).
**Mục đích:** Mỗi lesson MASTER có evidence cụ thể từ Phase nào, giúp Phase 7+ tránh lặp lại sai lầm + giữ pattern đã verify.

> **Quy tắc CẤM BỊA:** Mỗi lesson dưới đây cite Phase + commit/file gốc. Nếu có pattern không tìm được evidence, KHÔNG đưa vào MASTER.

---

## 1. Database & Schema

### M1.1 Mọi mutation đa-bảng PHẢI là RPC SECURITY DEFINER atomic
**Evidence:** Phase 1 (mandatory pattern #1, 16 errors initial), Phase 2 Lesson 5 (atomic vs sequential RPC), Phase 4 Lesson 5 (trigger BEFORE INSERT cho business limit).

Sequential client-side mutations dễ vỡ giữa chừng → orphan rows hoặc state inconsistent. Pattern: gói mọi multi-table write vào 1 RPC `LANGUAGE plpgsql SECURITY DEFINER` để PG transactional rollback toàn bộ nếu fail.

**Áp dụng khi:** approve_user (Phase 1: insert profile + grant features + log activity), bulk_import_categories (Phase 3), save_result (Phase 4: insert saved_results + check limit trigger).

### M1.2 Single Source of Truth: hardcode constants ≠ DB seed
**Evidence:** Phase 1 Lỗi #A8 (default features hardcode TS vs DB seed lệch), Phase 3 Lesson 1 (hardcode `FEE_KEYS` array vs DB `default_fees` seed).

Khi business config có ở 2 nơi (TS constants + DB seed), chúng sẽ drift theo thời gian. Quy tắc: chọn 1 nơi làm SSoT (thường là DB), nơi kia chỉ derive runtime hoặc generate từ DB schema.

**Áp dụng khi:** features list, fee keys, config defaults, role enum.

### M1.3 Schema constraints phải sync 3 layer: TS / RPC / DB CHECK
**Evidence:** Phase 2 Lesson 1 (3-layer enum extension cho `profiles.status`: thêm `'deleted'` vào TS type + RPC validation + DB CHECK constraint), Phase 6 M6.9 Bug 2 (CREATE OR REPLACE function không replace nếu signature đổi → DROP rồi CREATE).

Đổi enum/signature ở 1 layer là half-fix. TypeScript type cần update để compile, RPC validation cần update để chấp nhận giá trị mới, DB CHECK constraint cần update để insert không reject. Thiếu layer nào → bug runtime.

**Checklist khi đổi enum/schema:** 
- [ ] TS type union
- [ ] RPC parameter validation (RAISE EXCEPTION nếu invalid)
- [ ] DB CHECK constraint
- [ ] DROP old function trước CREATE nếu signature đổi (Phase 6 M6.9 Bug 2)

### M1.4 Snapshot vs FK reference cho data có lifecycle dài
**Evidence:** Phase 4 Lesson 2 (`saved_results.fees_snapshot` jsonb full thay vì FK), Phase 6 Lesson 6 (snapshot `alerts` + `recommendation` vào saved data), Phase 6 Lesson 5 (audit log drop FK, dùng discriminator).

Data live (user_features, current state) → FK reference. Data có lifecycle dài (saved_results, audit_log, invoice, share_link) → **snapshot pattern**. Tự hỏi: "5 năm sau xem lại, user expect số có giống lúc save không?"

**Audit log multi-table** đặc biệt: drop FK + dùng discriminator field (text key, table_name) thay FK ràng buộc. Phase 6 M6.9 fee_audit_log dùng cho cả default_fees + category_fees → drop FK, dùng prefix `category:mall:...` vs default fee_key gốc làm discriminator.

### M1.5 jsonb parsing dùng `#>>'{}'`, không dùng `::text`
**Evidence:** Phase 4 Lesson 1 + migration 019 (trigger `check_saved_results_limit` fail vì `(value::text)::int` giữ quotes cho jsonb string).

`(value::text)::int` fail nếu jsonb là string (`'"25"'` kèm dấu nháy). Pattern an toàn cho cả jsonb number lẫn string: `(value#>>'{}')::int` — extract path → strip quotes → cast.

Wrap trong `EXCEPTION WHEN OTHERS` để fallback default nếu cast vẫn fail (vd value là object/array bất ngờ).

### M1.6 Trigger BEFORE INSERT/UPDATE cho business limit + escalation prevention
**Evidence:** Phase 1 mandatory pattern 4 (`prevent_unauthorized_profile_updates` BEFORE UPDATE), Phase 4 Lesson 5 (`check_saved_results_limit` BEFORE INSERT race-free), Phase 6 Security Audit (trigger là layer cuối phòng self-escalation).

Client-side check race-prone (2 tab cùng save trước khi state sync). Trigger DB có atomicity guarantee từ PG. Áp dụng cho: max-per-user limit, rate limit, quota, field-level escalation prevention.

Trigger BEFORE UPDATE > complex WITH CHECK clause: dễ đọc, tách logic khỏi RLS policy, áp dụng cả khi RLS bypass (admin SECURITY DEFINER).

### M1.7 CASCADE delete properly setup ở schema
**Evidence:** Phase 4 Lesson 7 (`saved_results.user_id` CASCADE → user xóa → results tự xóa; `shared_links.result_id` CASCADE → result xóa → link tự xóa).

Quy tắc: child table luôn CASCADE follow parent. Audit/log table thường KHÔNG cascade (giữ history). Setup đúng giảm code defensive trong RPC delete.

### M1.8 PG functions cho data transformation cross-platform
**Evidence:** Phase 4 Lesson 6 (`slugify_vietnamese` PL/pgSQL trong migration 017 thay TS `slugifyVi`).

Data transform dùng nhiều lần (slug, format, hash, normalize) → PG functions. Client-side helpers OK cho display-only. Một số transform có ở cả 2 layer cho UX (vd client preview slug trước submit) — duplicate có ý thức.

---

## 2. Security (defense in depth)

### M2.1 Phòng thủ 3 lớp: RLS + RPC SECURITY DEFINER guard + trigger BEFORE UPDATE
**Evidence:** Phase 1 (16 errors initial dẫn đến pattern này), Phase 6 Security Audit (`SECURITY-AUDIT-2026-05-01.md`: 11/11 RLS + 18/18 admin RPC `is_admin()` + trigger `prevent_profile_escalation`).

3 lớp độc lập:
1. **RLS policy** chặn cross-user query thẳng (`auth.uid() = user_id`)
2. **RPC SECURITY DEFINER** bypass RLS để admin thao tác → có guard riêng `IF NOT public.is_admin() THEN RAISE EXCEPTION`
3. **Trigger BEFORE UPDATE** ngăn user tự sửa field nhạy cảm (id, email, status, **is_admin**, package_label, approved_at...) dù RLS UPDATE policy chỉ check `auth.uid()=id`

Không depend 1 lớp duy nhất. Phase 1 ban đầu chỉ có RLS → user có thể self-promote qua RPC bypass. Phase 1 add `is_admin()` guard. Phase 6 audit confirm cả 3 lớp đều present.

### M2.2 `is_admin()` SECURITY DEFINER giải RLS recursion
**Evidence:** Phase 1 Lỗi #5 (RLS profiles policy check is_admin = true gây recursion vô tận khi query profiles).

`SELECT is_admin FROM profiles WHERE id = auth.uid()` qua RLS sẽ trigger lại RLS check → infinite loop. Fix: function `is_admin()` SECURITY DEFINER bypass RLS để đọc trực tiếp + COALESCE FALSE cho NULL.

### M2.3 Privilege escalation: user có thể tự promote qua bất kỳ lỗ hổng nào
**Evidence:** Phase 1 Lỗi #14-15 (user UPDATE profiles set is_admin=true qua RLS UPDATE policy chỉ check `auth.uid()=id`).

Lý thuyết RLS UPDATE policy chỉ verify ownership, không verify field nào được UPDATE. User UPDATE profile của mình + sửa is_admin field. Fix: trigger BEFORE UPDATE chặn explicit field list (id, email, status, is_admin, package_label, approved_at/by, rejected/suspended_reason, feature_usage_count, created_at).

### M2.4 Security audit toàn diện cuối phase phát hành
**Evidence:** Phase 1 (16 errors initial), Phase 6 (`SECURITY-AUDIT-2026-05-01.md` audit toàn bộ trước v1.0).

Audit checklist:
- RLS coverage cho mọi table (rls_enabled = true + policy_count ≥ 1)
- SECURITY DEFINER RPC có `is_admin()` guard
- Anon-public RPC có rate limit + minimal data exposure
- Trigger BEFORE UPDATE cho field nhạy cảm
- activity_log coverage cho action quan trọng
- Inspect bằng MCP read-only, KHÔNG fix unilateral, STOP báo user nếu phát hiện lỗ hổng

---

## 3. Auth & Routing

### M3.1 Public/anon routes đặt NGOÀI ProtectedRoute block
**Evidence:** Phase 3 Lesson 4 (`/locked` redirect loop nếu trong ProtectedRoute), Phase 4 Lesson 3 (`/share/:slug` public route ngoài), Phase 5 Lesson 2 (`/forgot-password`, `/reset-password` ngoài + KHÔNG wrap GuestRoute).

Vẽ flow auth state TRƯỚC khi setup routing. Auth state có ≥3 trạng thái: anon / authenticated / **recovery** (Phase 5 Lesson 2). Recovery session ngắn hạn nhưng có `auth.uid()` → wrap GuestRoute sẽ bounce sai.

### M3.2 Auth event listener: subscribe + getSession race + timeout fallback
**Evidence:** Phase 5 Lesson 1 (`PASSWORD_RECOVERY` event không fire nếu user direct-visit, cần 3 path).

3 path bắt buộc:
1. Subscribe `onAuthStateChange` cho event fire bình thường
2. `getSession()` ngay lúc mount (session có thể đã set trước listener mount — race)
3. `setTimeout` 1500ms fallback render invalid-link view

Áp dụng cho: PASSWORD_RECOVERY, magic link, OAuth callback, MFA challenge.

---

## 4. Frontend Patterns

### M4.1 Snapshot computed output (alerts, recommendations, scores)
**Evidence:** Phase 6 Lesson 6 (M6.3 SmartAlerts + M6.8 RecommendationCard snapshot vào `saved_results.alerts/recommendation` jsonb, render preset KHÔNG recompute).

Computed values có wording/threshold biến động (alerts, recommendations, badges, scores) phải snapshot. KHÔNG recompute lúc render saved/share. Pattern y hệt `fees_snapshot` Phase 4 nhưng cho computed values. Đảm bảo idempotent: save → load → render → giống lúc save.

### M4.2 Math classification theo `kind` (computation), không theo `category` (UI)
**Evidence:** Phase 6 Lesson 8 (M6.8 fix 555a25f: `computePTarget` dùng category gây bỏ sót Vận hành/đơn 4k flat fee thuộc category=shopee_variable).

Schema có 2 axis (category × kind). Code logic phải pick axis đúng:
- **Category** = UI grouping (nhóm hiển thị panel)
- **Kind** = computation grouping (cách tính)

Math: `F = giá vốn + tất cả phí kind=flat` (bất kể category). `k = tất cả phí kind=pct`. Verify case bằng tay với 2-3 sản phẩm khác category.

### M4.3 Variant wording deterministic theo seed, không Math.random
**Evidence:** Phase 6 Lesson 7 (M6.8 RecommendationCard: hash `productName+cost+sell` → variant pick deterministic).

UI có variant chống nhàm phải pick deterministic theo input, không random. Cùng input = cùng output. Test reproducible. Áp dụng: A/B copy, error message variants, empty state messages.

### M4.4 Reusable component khi 3+ chỗ lặp
**Evidence:** Phase 5 Lesson 6 (Toast bóc khỏi inline state 9 file), Phase 6 M6.7 (ResultHero tách khỏi ResultCard cho SavedDetail + PublicShare reuse).

Test rule of 3: lặp 3 lần là dấu hiệu cần extract. Cost upfront ~2x nhưng next change chỉ chạm 1 file. Bóc muộn còn hơn không.

### M4.5 Defensive 3rd-party SDK wrapper
**Evidence:** Phase 5 Lesson 3 (`lib/analytics.ts` `isGAEnabled` defensive check, no-op nếu env missing).

Mọi 3rd-party SDK (analytics, monitoring, payment, mail) phải fail-safe: env missing → no-op không throw. Pattern: wrapper module hide complexity, mọi public method bắt đầu `if (!enabled) return;`.

### M4.6 Throttle/debounce tracking events
**Evidence:** Phase 5 Lesson 4 (`trackCalculatorUsed` throttle 5s tránh fire mỗi keystroke).

Pattern: throttle 5–10s cho continuous input (calculator), debounce 500ms cho search (single intent).

### M4.7 SPA manual page_view + custom router hook
**Evidence:** Phase 5 Lesson 5 (`AnalyticsProvider` listen `useLocation` → manual `trackPageView`, disable gtag auto).

`gtag.js` auto page_view không đủ trigger SPA route changes (param đổi không reload). Pattern: vô hiệu auto của SDK + manage qua React Router hook.

### M4.8 Visible-but-disabled UI (locked card pattern)
**Evidence:** Phase 1 mandatory pattern 5, Phase 3 (`ScenariosLockCard` cho `shopee_compare_scenarios`), Phase 4 (FeatureGate `shopee_save_result`/`shopee_share_link`), Phase 6 M6.9.1 (`shopee_expert_insight` locked card cho RecommendationCard).

Feature missing → render locked card với CTA upgrade (Zalo link), không hide button. User biết tính năng tồn tại → có động lực upgrade.

### M4.9 Clipboard API fallback
**Evidence:** Phase 4 Lesson 8 (`navigator.clipboard.writeText` cần user gesture, programmatic click fail).

Pattern: visible readonly input với `onFocus={e => e.currentTarget.select()}` + try/catch handleCopy. User Ctrl+C nếu clipboard API fail. Áp dụng share link, copy code, copy email.

### M4.10 html2canvas tránh overflow:hidden trên text container
**Evidence:** Phase 6 Lesson 1 (M6.2 commit 196fe72: descender clip `g/y/p/q` do `overflow:hidden` × html2canvas).

Pattern an toàn: line-height ≥ 1.4, padding-bottom ≥ 4px. Test bằng từ chứa descender (`gypsy`, `puppy`).

### M4.11 Tách render UI live vs render export
**Evidence:** Phase 6 Lesson 2 (M6.2 7 vòng layout fix → M6.0 refactor `ExportTemplate` off-screen).

Live tối ưu interaction (click, hover, responsive). Export tối ưu pixel-perfect cố định size. Cùng 1 component → luôn có 1 cái phải compromise.

---

## 5. Process & Workflow

### M5.1 Inspect TRƯỚC, KHÔNG đoán
**Evidence:** Phase 2 Lesson 2 (inspect schema before query), Phase 6 multiple regression fixes (M6.9 Calculator white screen, fee_audit_log FK).

User feedback `"INSPECT trước, KHÔNG đoán"` lặp ≥4 lần Phase 6. Workflow:
1. Đọc schema/RPC/code TRƯỚC khi thay đổi
2. STOP báo user nếu phát hiện schema phức tạp (multi-table audit, FK rộng)
3. Báo cáo root cause TRƯỚC, fix SAU

### M5.2 Live test BẮT BUỘC trước commit (không chỉ build pass)
**Evidence:** Phase 3 Lesson 7 (Cowork UI test catches what build doesn't), Phase 6 Lesson 3 (M6.9.2 build pass → trắng trang vì runtime undefined).

Build pass chỉ verify type signature. Mọi PR đụng UI quan trọng (Calculator, AdminFees, Auth) phải mở browser thật + click qua flow chính. Test rule:
- Auth flow → real Supabase session
- Calculator → real DB fees + multiple categories
- Admin mutation → verify DB state + UI re-render

### M5.3 Test mutation RPC at DB layer TRƯỚC UI
**Evidence:** Phase 2 Lesson 3 (verify RPC qua MCP supabase-edream rồi mới wire UI).

Pattern: gọi RPC qua MCP với test param → verify return → kiểm tra DB state → mới integrate UI. Tách 2 bug surface (RPC logic vs UI wiring) thay vì debug cả 2 cùng lúc.

### M5.4 3-role workflow: Planner / Executor / Tester
**Evidence:** Phase 2 Lesson 4 (Claude.ai planner → Claude Code executor → Cowork tester).

3 vai trò khác nhau với context window khác nhau:
- **Planner** (Claude.ai): rộng + hợp business, ra brief
- **Executor** (Claude Code): focus + có repo + apply migration, code theo brief
- **Tester** (Cowork): browser thật, click flow, catch UI bug

Executor không tự planning lớn, không tự test (trừ smoke). Tester catch UI bug build không thấy.

### M5.5 Master plan có thể collapse milestones
**Evidence:** Phase 5 Lesson 7 (5.1, 5.3, 5.5 không có commit, rolled vào Phase 6 hoặc defer Phase 7).

Master plan là kim chỉ nam, không phải hợp đồng. Khi scope shift, ghi vào PHASE-COMPLETE thay vì cố ép milestone. Phần defer phải có lý do rõ.

### M5.6 Layout fix > 3 vòng → STOP audit design system
**Evidence:** Phase 6 Lesson 9 (M6.2 7 vòng hotfix layout dây chuyền).

Khi layout fix lan dây chuyền 3+ vòng → ngồi xuống check design system gốc. Dùng box-sizing border-box nhất quán, vertical-center bằng flex thay vì line-height tricks, define spacing scale (4/8/12/16/24/32). Phase 7 nên có design tokens + Storybook.

### M5.7 Action naming consistency
**Evidence:** Phase 2 Lesson 6 (action names trong `activity_log` thống nhất `<entity>.<verb>`: `admin.approve_user`, `category.created`, `user.features_granted`).

Pattern `<scope>.<action>_<target>` hoặc `<entity>.<verb>` giúp filter/grep dễ. Reserved scopes: `admin`, `user`, `category`, `fee`, `profile`, `system_config`.

### M5.8 Git commit message phải có root cause + verification
**Evidence:** Toàn Phase (commit messages nhất quán Vietnamese + mô tả root cause + test verification).

Pattern good commit:
```
fix(M6.9): regression Calculator trắng trang + Admin Fees ngành hàng 0

- Bug 1: <root cause + line>
  Fix: <change>
- Bug 2: <root cause + line>
  Fix: <change>

- Verified: <DB query / UI flow>
```

---

## 6. Anti-patterns (đã commit fix, KHÔNG lặp lại)

| Anti-pattern | Evidence | Fix pattern |
|---|---|---|
| Sequential client mutation cho multi-table write | Phase 1 Lỗi #1-3 | Atomic RPC SECURITY DEFINER (M1.1) |
| Hardcode constants song song với DB seed | Phase 1 Lỗi #A8, Phase 3 Lesson 1 | SSoT, derive runtime (M1.2) |
| RLS UPDATE policy chỉ check ownership | Phase 1 Lỗi #14-15 | Trigger BEFORE UPDATE chặn field nhạy cảm (M2.3) |
| `is_admin()` query qua RLS gây recursion | Phase 1 Lỗi #5 | SECURITY DEFINER bypass RLS (M2.2) |
| Public route trong ProtectedRoute | Phase 3 Lesson 4 | Đặt ngoài (M3.1) |
| Recovery session wrap GuestRoute | Phase 5 Lesson 2 | KHÔNG wrap GuestRoute (M3.1) |
| `(value::text)::int` cho jsonb | Phase 4 Lesson 1 | `(value#>>'{}')::int` (M1.5) |
| `CREATE OR REPLACE FUNCTION` đổi signature | Phase 6 M6.9 Bug 2 | DROP old overload trước (M1.3) |
| FK `fee_audit_log` cho 1 bảng nguồn duy nhất | Phase 6 Lesson 5 | Drop FK + discriminator (M1.4) |
| Math classification theo category | Phase 6 Lesson 8 | Theo `kind` (M4.2) |
| `Math.random()` cho variant wording | Phase 6 Lesson 7 | Hash seed deterministic (M4.3) |
| `overflow:hidden` text container × html2canvas | Phase 6 Lesson 1 | Padding-bottom (M4.10) |
| Cùng component cho live + export | Phase 6 Lesson 2 | Tách ExportTemplate off-screen (M4.11) |
| Build pass = feature pass | Phase 6 Lesson 3 | Live test bắt buộc (M5.2) |
| `Math.clipboard.writeText` raw | Phase 4 Lesson 8 | Input readonly fallback (M4.9) |
| Inline toast state 9 file copy-paste | Phase 5 Lesson 6 | Reusable component (M4.4) |
| `gtag.js` auto page_view cho SPA | Phase 5 Lesson 5 | Manual qua useLocation (M4.7) |
| `trackEvent` fire mỗi keystroke | Phase 5 Lesson 4 | Throttle 5s (M4.6) |
| Layout hotfix dây chuyền 3+ vòng | Phase 6 Lesson 9 | Audit design system (M5.6) |

---

## 7. Mandatory patterns cho Phase 7

Tổng hợp từ patterns đã verify qua 6 phase. Phase 7 phải apply cả:

### Database
1. **Atomic RPC SECURITY DEFINER** cho mọi multi-table mutation (M1.1)
2. **SSoT** cho config, không hardcode song song với DB seed (M1.2)
3. **Schema sync 3 layer** TS / RPC / DB CHECK + DROP function trước CREATE đổi signature (M1.3)
4. **Snapshot pattern** cho data lifecycle dài + audit log multi-table drop FK + discriminator (M1.4)
5. **jsonb parsing** dùng `#>>'{}'` (M1.5)
6. **Trigger BEFORE INSERT/UPDATE** cho business limit + escalation prevention (M1.6)
7. **CASCADE delete** cho child tables (M1.7)
8. **PG functions** cho transformation cross-platform (M1.8)

### Security
9. **3-lớp phòng thủ**: RLS + RPC SECURITY DEFINER guard + trigger (M2.1)
10. **`is_admin()` SECURITY DEFINER** giải RLS recursion + COALESCE FALSE (M2.2)
11. **Trigger BEFORE UPDATE** ngăn self-escalation explicit field list (M2.3)
12. **Security audit cuối phase phát hành** (M2.4)

### Auth & Routing
13. **Public routes ngoài ProtectedRoute** (M3.1)
14. **Auth event listener 3 path**: subscribe + getSession race + timeout fallback (M3.2)

### Frontend
15. **Snapshot computed output** (alerts, recommendations) vào saved data (M4.1)
16. **Math classification theo `kind`** không theo `category` (M4.2)
17. **Variant deterministic** theo hash seed (M4.3)
18. **Reusable component** khi 3+ chỗ lặp (M4.4)
19. **Defensive 3rd-party SDK wrapper** (M4.5)
20. **Throttle/debounce tracking** (M4.6)
21. **SPA manual page_view** (M4.7)
22. **Visible-but-disabled UI** cho feature gate (M4.8)
23. **Clipboard API fallback** (M4.9)
24. **html2canvas-safe** text styling (M4.10)
25. **Tách render live vs export** (M4.11)

### Process
26. **Inspect trước, không đoán** (M5.1)
27. **Live test BẮT BUỘC** trước commit (M5.2)
28. **Test RPC at DB layer trước UI** (M5.3)
29. **3-role workflow** Planner / Executor / Tester (M5.4)
30. **Master plan flexible** — milestones có thể collapse có lý do (M5.5)
31. **Layout > 3 vòng** → audit design system (M5.6)
32. **Action naming consistency** `<entity>.<verb>` (M5.7)
33. **Commit message** root cause + verification (M5.8)

---

## 8. Statistics tổng cộng (Phase 1 → 6)

| Metric | Total | Note |
|---|---|---|
| Phases | 6 | Auth → Users → Fees → Saved/Share → UX → Feature/Polish |
| Migrations apply | 26 | 001-026 |
| RPC SECURITY DEFINER | 32 | 18 admin + 6 user + 1 anon + 7 trigger/utility |
| Pages production | 18+ | 4 admin + 3 user app + 4 calculator + 3 public + 4 auth |
| RLS tables | 11/11 | 100% coverage |
| Critical bugs caught & fixed | 16+ | Phase 1 (8 build + 8 audit), Phase 6 (2 regression) |
| Security findings v1.0 | 0 | Audit clean |
| Cowork test | 5 round | Phase 2, 3, 4, 6 |

---

## 9. Đề xuất Phase 7 trở đi

### Nên làm ngay
1. **Design system tokens + Storybook** — chấm dứt layout hotfix dây chuyền (Phase 6 Lesson 9).
2. **E2E test (Playwright)** — automate Cowork flow, catch UI regression sớm hơn (Phase 6 Lesson 3).
3. **Email notification (Resend)** — defer từ Phase 5, link expire/profile activity (Phase 5 defer #1).
4. **Reverse mode** + **Compare scenarios** — placeholder coming soon đã có (Phase 6 defer #1, #2).

### Nên cân nhắc
5. **2FA/MFA** — defer Phase 7.
6. **Multi-shop type** beyond Mall/Normal (Premium, OSP) — schema ready, UI 2 sub-tab (Phase 6 defer #6).
7. **Restore deleted fees** — defer từ Phase 3.

### Nên tránh
8. **Tự ý xoá hoặc rename feature đã PASS** — Phase 6 M6.9 brief "DANH SÁCH TÍNH NĂNG ĐÃ PASS — phải đọc kỹ và bảo vệ".
9. **Refactor lớn không có Cowork test round** — risk regression cao.
10. **Skip security audit sau migration đụng RLS/RPC admin** — Phase 6 audit là prerequisite cho v1.0.

---

**Last updated:** 2026-05-01 (v1.0 release)
**Owner:** hieuliem1007
**Co-author:** Claude Opus 4.7 (1M context)
