# LESSONS LEARNED — PHASE 2: User Management

## Tổng quan

- **Thời gian**: 27–28/04/2026 (~3 ngày làm việc)
- **Milestones**: 5
  - 2.1 — 6 RPCs admin (suspend / unsuspend / soft_delete / update_user_profile_admin / grant_user_features / revoke_user_features)
  - 2.2 — `/admin/users` (list + search + filter + pagination)
  - 2.3 — `/admin/users/:id` (detail + edit + status actions + activity log)
  - 2.4 — `/admin/users/:id/permissions` (feature tree 2-level + atomic `set_user_features`)
  - 2.5 — `/app/profile` (user tự edit) + Phase 2 audit + tag stable
- **Tag**: `phase-2-stable`
- **Files thay đổi**: 5 migrations (006–010), 4 page components mới, `lib/auth.ts` (+10 functions), `App.tsx` (+4 routes), 1 bugfix migration (007).

## Bugs phát hiện và lessons

### Lesson 1 — 3-layer enum extension (từ Milestone 2.3)

**Bug**: Khi click "Xóa user" trong UI, RPC `soft_delete_user` raise lỗi `profiles_status_check` constraint violation. Root cause: `001_initial_schema.sql` tạo CHECK chỉ có 4 status (`pending/active/rejected/suspended`); Phase 2 thêm `'deleted'` vào TS type + RPC nhưng quên update DB constraint.

**Cost**: ~30 phút discovery + fix + verify. Phát hiện ở UI layer, sau khi đã build + ship UI 2.3.

**Pattern phòng ngừa cho Phase 3+**: khi extend enum (status / role / category / type), thay đổi đồng thời 3 layer:
1. **DB constraint** (`CHECK`, `enum`, `domain`)
2. **Server-side function** (validate/raise/use mới value)
3. **TypeScript type** (`type X = 'a' | 'b' | ...`)

Đặt 1 file checklist `enum-extension.md` và mỗi lần đụng enum phải tick đủ 3 ô. Hoặc viết test SQL ngay sau khi thêm value vào TS type: `INSERT ... VALUES ('new_value')` để force constraint check fail trước khi merge.

### Lesson 2 — Đoán schema thay vì inspect

**Tình huống**: 2 query đầu tiên Phase 2 fail vì đoán column name (`parent_id` thay vì `parent_feature_id`, `is_default` thay vì `is_default_for_new_user`).

**Lesson**: Trước query 1 bảng lạ, **luôn chạy `information_schema.columns`** để confirm tên + type + nullable. 30 giây xác minh tiết kiệm 5 phút sửa query.

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = '<table>'
ORDER BY ordinal_position;
```

### Lesson 3 — Test mutation RPC ở DB layer trước UI layer

**Phép so sánh**:
- Milestone 2.1 test RPC qua `set_config('request.jwt.claims', ...)` ngay sau viết → bug nào lộ luôn (cost: ~5 phút).
- Milestone 2.3 không test DB layer cho `soft_delete_user`, chỉ wire UI rồi click → bug constraint lộ ở user-action time (cost: ~30 phút + UI restart + verify chain).

**Quy tắc**: mỗi RPC mới có mutation, **bắt buộc** chạy:
1. Happy path (giả lập admin JWT, gọi RPC, verify return shape).
2. 1 guard bất kỳ (vd: self-action, target không tồn tại).

Trước khi commit migration. Catch bug ở layer rẻ nhất.

### Lesson 4 — Workflow Claude.ai + Claude Code CLI + Cowork

3 vai trò trong session Phase 2:
- **Planner (Claude.ai web chat)**: viết brief mỗi milestone, define scope, gửi qua copy-paste vào `/tmp/milestone-X.Y-brief.md`.
- **Executor (Claude Code CLI)**: đọc brief, thực thi (apply migration, write code, run build, commit). Có MCP supabase-edream truy cập DB trực tiếp + git/bash.
- **Tester (Cowork — anh)**: test UI thật trên browser, feedback bug.

**Cầu nối**: file `/tmp/*.md` cho prompts, screenshots cho bug reports, MCP cho DB verify.

**Bài học**: brief tốt = explicit về files cần touch + acceptance criteria + KHÔNG làm gì. Brief mơ hồ → Executor đoán → drift khỏi intent.

### Lesson 5 — Atomic RPC > Sequential RPC calls

**Quyết định**: Milestone 2.4 viết `set_user_features(uuid, text[])` thay vì để UI gọi `grant_user_features` rồi `revoke_user_features` tuần tự.

**Lý do**:
- Race condition: nếu grant pass nhưng revoke network fail, state ≠ user intent.
- Audit log: 1 entry `user.features_replaced` với diff đầy đủ thay vì 2 entries phân mảnh.
- Rollback: 1 transaction → UI chỉ cần handle 1 success/error path.

**Pattern**: bất kỳ mutation đụng ≥2 row hoặc ≥2 bảng → wrap thành 1 RPC SECURITY DEFINER. UI chỉ gọi 1 lần.

### Lesson 6 — Action naming consistency (DB ↔ UI)

**Phát hiện ở Phase C audit**: `activity_log.action` có `admin.approve_user` (Phase 1 RPC) nhưng `UserDetailPage.activityIcon()` map theo `user.approved`. Mismatch → UI hiển thị icon fallback `Activity` cho approve event.

**Pattern**: định nghĩa **enum action codes** trong 1 file SQL/TS share, không hard-code string ở 2 nơi. Phase 3 nên consolidate naming (`user.{verb}` hoặc `admin.{verb}_user` — chọn 1).

## Mandatory patterns Phase 3–5

1. **Multi-table mutation → Atomic RPC**. UI gọi 1 lần, DB lo transaction.
2. **Enum extension → Verify 3 layers** (TS / RPC / DB constraint). Có checklist trước khi commit.
3. **Inspect schema before query** (`information_schema.columns`). 30s tiết kiệm 5 phút.
4. **Test RPC ở DB layer ngay sau viết** (happy + 1 guard) qua MCP `set_config` JWT trick.
5. **UI delta save**: chỉ gửi field thay đổi (tránh clear ngầm field `IS DISTINCT FROM`-sensitive).
6. **Self-* guards** (self-suspend / self-delete / self-grant-admin) test ở DB, không trông vào UI ẩn nút.
7. **Activity log mọi mutation admin** với metadata snapshot đầy đủ (target_id, before/after).
8. **Vietnamese error messages** từ PG error codes — map ở `lib/auth.ts:mapErrorMessage`.
9. **Action codes consistent** giữa DB action string và UI display map.
10. **Idempotent migration**: `DROP CONSTRAINT IF EXISTS` + `ADD CONSTRAINT`, `ON CONFLICT DO NOTHING` cho seed.

## Statistics

- **RPCs viết mới**: 8 (suspend, unsuspend, soft_delete, update_user_profile_admin, grant_user_features, revoke_user_features, set_user_features, update_my_profile)
- **Migrations applied**: 5 (006 RPCs, 007 constraint fix, 008 features hierarchy, 009 set_user_features, 010 update_my_profile)
- **Pages tạo mới**: 4 (UserListPage, UserDetailPage, UserPermissionsPage, UserProfilePage)
- **Bugs phát hiện và fix**: 1 (constraint missing 'deleted', migration 007)
- **Activity log action types đang dùng**: 9 (`admin.approve_user`, `profile.self_updated`, `user.features_granted/revoked/replaced`, `user.profile_updated_by_admin`, `user.soft_deleted`, `user.suspended`, `user.unsuspended`)

## Audit kết quả (28/04/2026)

| # | Test | Status |
|---|---|---|
| 1 | Toàn vẹn data | ✅ |
| 2 | 10 RPCs tồn tại | ✅ |
| 3 | Constraint 5 status values | ✅ |
| 4 | Features hierarchy 4+8 | ✅ |
| 5 | RLS policies present | ✅ |
| 6 | Activity log action types | ⚠️ (1 mismatch naming, không phải bug functional) |
| 7 | Atomic rollback | ✅ |
| 8 | Self-suspend guard | ✅ |
| 9 | Trigger prevent unauthorized | ✅ |
| 10 | TypeScript build | ✅ |

**Phase 2 STATUS: STABLE**, sẵn sàng vào Phase 3 (Default fees configuration + audit + wire calculator).
