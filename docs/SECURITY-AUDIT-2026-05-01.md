# Security Audit — 2026-05-01

Audit toàn diện sau M6.9. Phương pháp: read-only inspect qua MCP supabase-edream.

## Kết luận

**Không phát hiện lỗ hổng bảo mật.** App được phòng thủ nhiều lớp: RLS + SECURITY DEFINER `is_admin()` guard + trigger ngăn self-escalation.

## RLS coverage — 11/11 tables

| Table | RLS | Policies | Đánh giá |
|---|---|---|---|
| activity_log | ✅ | 3 | INSERT own/admin, SELECT own + admin |
| category_fees | ✅ | 2 | Admin ALL, authenticated SELECT active |
| default_fees | ✅ | 2 | Admin ALL, anon+authenticated SELECT (phí công khai) |
| email_templates | ✅ | 1 | Admin only |
| features | ✅ | 2 | Admin ALL, anon+authenticated SELECT (danh sách quyền công khai) |
| fee_audit_log | ✅ | 2 | Admin INSERT (changed_by=auth.uid()), Admin SELECT |
| profiles | ✅ | 4 | Own SELECT/UPDATE, Admin SELECT/UPDATE + trigger ngăn escalation |
| saved_results | ✅ | 5 | Own CRUD, Admin SELECT |
| shared_links | ✅ | 6 | Own CRUD, Admin SELECT, anon SELECT non-expired (public share) |
| system_config | ✅ | 2 | Admin ALL, authenticated SELECT (config non-sensitive) |
| user_features | ✅ | 2 | Admin ALL, own SELECT (KHÔNG cho user tự sửa quyền) |

## SECURITY DEFINER RPCs — 32 functions, all guards present

**Admin-only (18)** — tất cả có `IF NOT public.is_admin() THEN RAISE`:
approve_user, reject_user, suspend_user, unsuspend_user, soft_delete_user,
create_default_fee, update_default_fee, soft_delete_default_fee,
create_category_fee, update_category_fee, soft_delete_category_fee, bulk_import_categories,
get_admin_overview,
grant_user_features, revoke_user_features, set_user_features,
update_system_config_value, update_user_profile_admin

**User-scoped (6)** — tất cả dùng `auth.uid()` để giới hạn ownership:
save_result, delete_result, list_my_results, create_share_link,
update_my_profile, get_result_detail

**Anon-public (1)**: `get_public_result(slug)` — đúng design (public share viewer), check expires_at trước khi trả data.

**Triggers + utility (7)**: is_admin, handle_new_user, prevent_unauthorized_profile_updates,
check_saved_results_limit, rls_auto_enable, list_default_fees, list_category_fees

## Tầng phòng thủ chính

1. **`is_admin()` function**: `SELECT is_admin FROM profiles WHERE id = auth.uid()` — clean, COALESCE FALSE. Không hardcode UUID.

2. **Trigger `prevent_profile_escalation` BEFORE UPDATE on profiles**: chặn user tự sửa các field nhạy cảm (id, email, status, **is_admin**, package_label/note, approved_at/by, rejected/suspended_reason, feature_usage_count, created_at). Admin bypass via `is_admin()`. → Không thể self-promote dù RLS UPDATE policy chỉ check `auth.uid()=id`.

3. **`fee_audit_log` INSERT policy**: `is_admin() AND changed_by=auth.uid()` — vừa chặn user thường, vừa ép trace người thật.

4. **`activity_log` coverage** — 18 action types log đủ thao tác quan trọng:
   admin.{approve,reject}_user, category.{created,updated,soft_deleted,bulk_imported},
   fee.{created,updated,soft_deleted}, profile.self_updated, user.{features_granted,replaced,revoked}, user.{profile_updated_by_admin,soft_deleted,suspended,unsuspended}, system_config.updated.

## Quan sát nhỏ (không phải lỗ hổng)

- `system_config.admin_notification_email` (`hieuliem1007@gmail.com`) authenticated user đọc được — minor info disclosure. Không sensitive (email admin thường công khai).
- `default_fees`, `features` cho `anon` SELECT — by design (UI public landing có thể cần preview).
- `update_my_profile` chỉ update `full_name, phone` — đúng scope.

## Limitation

- **Chưa test với token user thật**: cần test thủ công 2 user (1 admin + 1 thường) để verify end-to-end RLS chặn cross-user access. MCP context không simulate được auth.uid() khác admin.
- **Chưa fuzz test SQL injection trên RPC params**: tất cả RPC dùng plpgsql parameterized, ít rủi ro nhưng nếu cần thêm assurance có thể test.
