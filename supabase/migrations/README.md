# Supabase Migrations — E-Dream Tools

Folder này chứa các migration script SQL để dựng database từ đầu nếu cần (ví dụ: reset Supabase project, tạo môi trường staging, onboard developer mới).

## Trạng thái hiện tại

Migrations này được tạo SAU KHI Phase 1 đã hoàn thành. Schema hiện tại trong production Supabase **đã được apply** trước khi có folder này. Các file SQL ở đây là **reference** để tái dựng nếu cần — KHÔNG cần chạy lại trên production.

## Thứ tự apply (BẮT BUỘC)

Apply theo đúng thứ tự, vì có dependency giữa các bước:

```
001_initial_schema.sql       ← CREATE 10 bảng + indexes + ENABLE RLS
002_functions.sql             ← Functions, triggers, RPC procedures
003_grants.sql                ← GRANT permissions cho 3 roles
004_rls_policies.sql          ← 29 RLS policies + trigger prevent escalation
005_seed_data.sql             ← Seed 8 features, 19 fees, configs, templates
```

**Tại sao thứ tự quan trọng?**

- 002 dùng `is_admin()` function trong RLS policies → phải có functions trước policies
- 003 GRANT permissions → phải có sau khi tạo bảng
- 004 RLS policies dùng `is_admin()` từ 002 → phải sau 002
- 005 seed data INSERT vào bảng → phải có RLS policies cho admin INSERT

## Cách apply

### Trên Supabase Dashboard (UI)

1. Mở SQL Editor
2. Chạy lần lượt từ 001 đến 005
3. **LƯU Ý:** File 002 có nhiều functions với dollar-quoted strings (`$$ ... $$`). Supabase SQL Editor có thể fail nếu chạy nhiều function cùng lúc — chia nhỏ thành 4 query riêng (1 function/query) nếu gặp lỗi `42601: syntax error at end of input`.

### Trên psql CLI

```bash
psql $DATABASE_URL -f 001_initial_schema.sql
psql $DATABASE_URL -f 002_functions.sql
psql $DATABASE_URL -f 003_grants.sql
psql $DATABASE_URL -f 004_rls_policies.sql
psql $DATABASE_URL -f 005_seed_data.sql
```

### Verify sau khi apply

Chạy SQL sau để verify:

```sql
-- Đếm policies (kỳ vọng: 29)
SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';

-- Đếm functions (kỳ vọng: ít nhất 5: is_admin, handle_new_user, prevent_unauthorized_profile_updates, approve_user, reject_user)
SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace ORDER BY proname;

-- Đếm features (kỳ vọng: 8)
SELECT COUNT(*) FROM features;

-- Đếm default_fees (kỳ vọng: 19)
SELECT COUNT(*) FROM default_fees;

-- Verify shopee_calculator_access là default
SELECT id, is_default_for_new_user FROM features WHERE id = 'shopee_calculator_access';
```

## Setup admin user

Migration scripts KHÔNG seed admin user (vì nhạy cảm). Tạo thủ công:

1. Supabase Dashboard → Authentication → Users → Add User
2. Nhập email + password admin
3. SQL Editor:

```sql
UPDATE public.profiles 
SET is_admin = true, status = 'active' 
WHERE email = 'your-admin@email.com';
```

## Setup môi trường (Vercel)

Sau khi apply migrations, set 2 env vars trên Vercel cho cả 3 môi trường (Production / Preview / Development):

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Lấy giá trị tại: Supabase Dashboard → Project Settings → API.

## Troubleshooting

### Lỗi `42601: syntax error at end of input` khi apply 002

**Nguyên nhân:** Supabase SQL Editor không xử lý tốt batch nhiều function dollar-quoted (`$$ ... $$`).

**Giải pháp:** Chia file 002 thành 4-5 query riêng, mỗi function 1 query. Chạy lần lượt.

### Lỗi `permission denied for table xxx` sau khi apply

**Nguyên nhân:** GRANT chưa apply hoặc sai role.

**Giải pháp:** Chạy lại 003_grants.sql. File này idempotent (REVOKE + GRANT pattern).

### Lỗi `infinite recursion detected in policy for relation profiles`

**Nguyên nhân:** Policy dùng pattern `EXISTS (SELECT FROM profiles)` thay vì `is_admin()` function.

**Giải pháp:** DROP policy lỗi, dùng `is_admin()` function (SECURITY DEFINER + STABLE) thay vì query trực tiếp.

### User đăng ký bị lỗi `Phone number is required`

**Nguyên nhân:** Frontend không pass `phone` trong `raw_user_meta_data` khi gọi `supabase.auth.signUp()`.

**Giải pháp:** Frontend phải gửi đúng format:

```typescript
await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      full_name: 'Tên đầy đủ',
      phone: '0901234567'
    }
  }
})
```

## Pattern quan trọng

### 1. Mọi mutation đa-bảng PHẢI là RPC

Không bao giờ làm 2-3 query rời rạc từ frontend cho cùng 1 action. Wrap vào Postgres function với `SECURITY DEFINER` để đảm bảo atomic transaction.

**Ví dụ đúng:** `approve_user(uuid)` — gói UPDATE profile + INSERT user_features + INSERT activity_log trong 1 function.

**Ví dụ sai:** Frontend gọi `update profiles` rồi `insert user_features` riêng → có thể inconsistent state nếu fail giữa chừng.

### 2. Single Source of Truth

Mỗi business rule chỉ lưu ở 1 nơi. Ví dụ: "feature nào là mặc định cho user mới?" chỉ check ở `features.is_default_for_new_user`, không lưu thêm ở `system_config`.

### 3. Audit log immutable

`activity_log` và `fee_audit_log` chỉ có policy SELECT + INSERT. KHÔNG có UPDATE/DELETE từ frontend. Đảm bảo trail không bị tampering.

### 4. Trigger > WITH CHECK phức tạp

Khi cần chặn user đổi nhiều field cùng lúc, dùng `BEFORE UPDATE` trigger với `IS DISTINCT FROM` thay vì viết WITH CHECK với 10+ subquery. Trigger rõ ràng, dễ maintain hơn.

## Liên hệ

Dự án: E-Dream Tools (Shopee Fee Calculator)  
Owner: hieuliem1007@gmail.com  
Repo: github.com/hieuliem1007/shopee-fee-calculator