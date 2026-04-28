# E-DREAM TOOLS — KẾ HOẠCH MASTER

**Tên project:** E-Dream Tools (Bộ công cụ TMĐT cho người bán Shopee)
**Owner:** Nguyễn Hiếu Liêm (edream.vn)
**Ngày lập kế hoạch:** 2026-04-25
**Phiên bản:** 1.0

---

## MỤC LỤC

1. [Tổng quan sản phẩm](#1-tổng-quan-sản-phẩm)
2. [Quyết định kiến trúc](#2-quyết-định-kiến-trúc)
3. [Database Schema](#3-database-schema)
4. [Sitemap đầy đủ](#4-sitemap-đầy-đủ)
5. [Phân chia phase và timeline](#5-phân-chia-phase-và-timeline)
6. [Hệ thống phân quyền chi tiết](#6-hệ-thống-phân-quyền-chi-tiết)
7. [Email transactional](#7-email-transactional)
8. [Quy trình monetize thủ công](#8-quy-trình-monetize-thủ-công)
9. [Checklist trước khi launch](#9-checklist-trước-khi-launch)
10. [Phụ lục: Prompt template](#10-phụ-lục-prompt-template)

---

## 1. TỔNG QUAN SẢN PHẨM

### 1.1 Vision

Một web app tập trung tất cả công cụ hỗ trợ người bán Shopee/TMĐT, dùng E-Dream làm thương hiệu. Giai đoạn đầu phục vụ học viên E-Dream (~10-50 user), sau mở rộng dần.

### 1.2 Tools dự kiến trong tương lai

- Shopee Fee Calculator (đã có UI) — tính phí 1 sản phẩm
- TikTok Shop Fee Calculator
- Lazada Fee Calculator
- Multi-product Calculator (tính nhiều sản phẩm cùng lúc)
- Image Generator (tạo ảnh sản phẩm)
- Banner Maker
- Order Reports (báo cáo phân tích đơn hàng Shopee)
- Ads Reports (báo cáo phân tích quảng cáo)
- Có thể mở rộng thêm

### 1.3 Đối tượng người dùng

- **Admin:** Chỉ Hieu Liem (super admin duy nhất)
- **Member:** Người bán Shopee, đa số là học viên hoặc khách của E-Dream
- **Khách (chưa đăng nhập):** Không truy cập được tool, chỉ thấy landing page

### 1.4 Mô hình monetize

- Thủ công 100% qua Zalo
- User liên hệ → chuyển khoản → admin kích hoạt thủ công
- Không có hệ thống "gói/package" trong DB
- Không có trial, không có lifetime tự động
- Tên gói (VIP/Pro...) chỉ là field text tự do trong profile user, không liên kết logic

---

## 2. QUYẾT ĐỊNH KIẾN TRÚC

### 2.1 Tech stack đã chọn

| Layer | Công nghệ | Lý do |
|---|---|---|
| Frontend | Vite + React + TypeScript | Đã setup, build sẵn |
| Styling | Tailwind CSS + shadcn/ui | Đã setup |
| Routing | React Router | Multi-page app |
| Backend/DB | Supabase | Auth + Postgres + Storage all-in-one |
| Auth | Supabase Auth (email + password) | Built-in, không OAuth |
| Email | Resend với domain edream.vn | 3000 email free/tháng |
| Hosting | Vercel | Đã deploy, auto từ GitHub |
| Analytics phase 1 | Google Analytics 4 | Free, plug & play |
| Analytics phase 2 | Custom dashboard trong admin | Build sau khi có data |

### 2.2 Domain

- **Hiện tại:** shopee-fee-calculator-eight.vercel.app
- **Sau khi setup domain:** tinhphi.edream.vn (hoặc tools.edream.vn)
- **Email:** noreply@edream.vn (qua Resend)

### 2.3 Quyết định về kiến trúc app

- Hub-and-spoke: 1 web app, sidebar bên trái có menu các tools
- 1 lần đăng ký = dùng được tất cả tools (theo phân quyền)
- Mỗi tool là 1 route riêng (`/shopee-calc`, `/tiktok-calc`, `/banner`...)

### 2.4 Quyết định về data

- Kết quả lưu **tự xóa sau X ngày** (X do admin cấu hình, mặc định 90 ngày)
- Số lượng kết quả lưu **giới hạn theo cấu hình admin** (mặc định 50/user)
- User snapshot phí lúc lưu — không bị ảnh hưởng khi admin sửa phí mặc định sau này
- Backup DB: export định kỳ ra file (Supabase tự backup hàng ngày + thêm script export tháng/tuần)

---

## 3. DATABASE SCHEMA

### 3.1 Bảng users (Supabase Auth tự tạo)

Supabase Auth tự sinh `auth.users`. Mình mở rộng bằng bảng `profiles`:

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,

  -- Trạng thái tài khoản
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'rejected', 'suspended')),
  rejected_reason TEXT,
  suspended_reason TEXT,

  -- Thông tin gói (text tự do, không có logic)
  package_label TEXT, -- VD: "Gói VIP - 999k - lifetime"
  package_note TEXT,  -- Ghi chú nội bộ của admin

  -- Thống kê
  last_login_at TIMESTAMPTZ,
  feature_usage_count INT DEFAULT 0,

  -- Phân quyền
  is_admin BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_profiles_created_at ON profiles(created_at DESC);
```

### 3.2 Bảng features (định nghĩa các tính năng)

```sql
CREATE TABLE features (
  id TEXT PRIMARY KEY, -- VD: "shopee_calculator_access"
  name TEXT NOT NULL, -- VD: "Truy cập Shopee Calculator"
  description TEXT,
  category TEXT NOT NULL, -- VD: "calculation", "creative", "analytics"
  parent_feature_id TEXT REFERENCES features(id), -- Cấp 2 thuộc cấp 1
  level INT NOT NULL DEFAULT 1 CHECK (level IN (1, 2)),
  display_order INT DEFAULT 0,
  is_default_for_new_user BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data ban đầu
INSERT INTO features (id, name, category, level, display_order) VALUES
  -- Module CALCULATION
  ('shopee_calculator_access', 'Truy cập Shopee Calculator', 'calculation', 1, 10),
  ('shopee_reverse_mode',      'Mode tính ngược',           'calculation', 2, 11),
  ('shopee_save_result',       'Lưu kết quả vào dashboard', 'calculation', 2, 12),
  ('shopee_export_pdf',        'Xuất PDF',                  'calculation', 2, 13),
  ('shopee_export_image',      'Tải ảnh kết quả',           'calculation', 2, 14),
  ('shopee_share_link',        'Chia sẻ link public',       'calculation', 2, 15),
  ('shopee_compare_scenarios', 'So sánh kịch bản',          'calculation', 2, 16),
  ('shopee_smart_alerts',      'Cảnh báo tự động',          'calculation', 2, 17);

-- Sau này thêm:
-- ('tiktok_calculator_access', ...)
-- ('banner_maker_access', ...)
-- ('order_reports_access', ...)
```

### 3.3 Bảng user_features (gán quyền)

```sql
CREATE TABLE user_features (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID REFERENCES profiles(id),
  PRIMARY KEY (user_id, feature_id)
);

CREATE INDEX idx_user_features_user ON user_features(user_id);
```

### 3.4 Bảng default_fees (cấu hình phí mặc định)

```sql
CREATE TABLE default_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_key TEXT NOT NULL UNIQUE, -- VD: "shopee_fixed_fee_oto"
  fee_label TEXT NOT NULL,      -- VD: "Phí cố định ngành Ô tô"
  fee_value NUMERIC NOT NULL,   -- VD: 7.00
  fee_unit TEXT NOT NULL CHECK (fee_unit IN ('percent', 'vnd')),
  category TEXT NOT NULL,        -- VD: "shopee_fixed", "shopee_variable"
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- Seed data mặc định
INSERT INTO default_fees (fee_key, fee_label, fee_value, fee_unit, category) VALUES
  ('shopee_fixed_fee_oto',       'Phí cố định ngành Ô tô',       7.00,  'percent', 'shopee_fixed'),
  ('shopee_fixed_fee_thoitrang', 'Phí cố định ngành Thời trang', 4.00,  'percent', 'shopee_fixed'),
  ('shopee_fixed_fee_dientu',    'Phí cố định ngành Điện tử',    3.00,  'percent', 'shopee_fixed'),
  ('shopee_fixed_fee_mypham',    'Phí cố định ngành Mỹ phẩm',    4.00,  'percent', 'shopee_fixed'),
  ('shopee_fixed_fee_giadung',   'Phí cố định ngành Gia dụng',   4.50,  'percent', 'shopee_fixed'),
  ('shopee_fixed_fee_thucpham',  'Phí cố định ngành Thực phẩm',  3.50,  'percent', 'shopee_fixed'),
  ('shopee_payment_fee',         'Phí thanh toán',               5.00,  'percent', 'shopee_fixed'),
  ('shopee_freeship_xtra',       'Freeship Xtra',                6.00,  'percent', 'shopee_fixed'),
  ('shopee_freeship_xtra_cap',   'Freeship Xtra (cap tối đa)',   50000, 'vnd',     'shopee_fixed'),
  ('shopee_content_xtra',        'Content Xtra',                 2.95,  'percent', 'shopee_fixed'),
  ('shopee_voucher_xtra',        'Voucher Xtra',                 3.00,  'percent', 'shopee_fixed'),
  ('shopee_pi_ship',             'Pi Ship',                      1650,  'vnd',     'shopee_fixed'),
  ('shopee_infrastructure',      'Hạ tầng',                      3000,  'vnd',     'shopee_fixed'),
  ('shopee_tax',                 'Thuế',                         1.50,  'percent', 'shopee_fixed'),
  ('shopee_ads',                 'Quảng cáo',                    5.00,  'percent', 'shopee_variable'),
  ('shopee_voucher_shop',        'Voucher shop',                 3.00,  'percent', 'shopee_variable'),
  ('shopee_operation',           'Vận hành / đơn',               4000,  'vnd',     'shopee_variable'),
  ('shopee_affiliate',           'Affiliate',                    5.00,  'percent', 'shopee_variable'),
  ('shopee_other',               'Chi phí khác',                 3.00,  'percent', 'shopee_variable');
```

### 3.5 Bảng fee_audit_log (lịch sử sửa phí)

```sql
CREATE TABLE fee_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_id UUID NOT NULL REFERENCES default_fees(id),
  fee_key TEXT NOT NULL,
  old_value NUMERIC,
  new_value NUMERIC NOT NULL,
  reason TEXT NOT NULL, -- BẮT BUỘC nhập lý do
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by UUID NOT NULL REFERENCES profiles(id)
);

CREATE INDEX idx_fee_audit_changed_at ON fee_audit_log(changed_at DESC);
```

### 3.6 Bảng saved_results (kết quả user đã lưu)

```sql
CREATE TABLE saved_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tool_id TEXT NOT NULL, -- VD: "shopee_calculator"
  product_name TEXT,

  -- Snapshot input lúc tính
  inputs JSONB NOT NULL,
  -- VD: { "cost_price": 200000, "sell_price": 400000, "shop_type": "mall", "category": "oto" }

  -- Snapshot phí lúc tính (để không bị ảnh hưởng khi admin sửa phí sau này)
  fees_snapshot JSONB NOT NULL,

  -- Kết quả
  results JSONB NOT NULL,
  -- VD: { "revenue": 400000, "total_cost": 162000, "profit": 38000, "profit_pct": 9.5 }

  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL -- = created_at + (X days từ system_config)
);

CREATE INDEX idx_saved_results_user ON saved_results(user_id, created_at DESC);
CREATE INDEX idx_saved_results_expires ON saved_results(expires_at);
```

### 3.7 Bảng shared_links (chia sẻ kết quả public)

```sql
CREATE TABLE shared_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE, -- VD: "abc123xyz"
  result_id UUID NOT NULL REFERENCES saved_results(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  view_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_shared_links_slug ON shared_links(slug);
```

### 3.8 Bảng email_templates (template email admin sửa được)

```sql
CREATE TABLE email_templates (
  id TEXT PRIMARY KEY, -- VD: "user_registration_pending"
  name TEXT NOT NULL,  -- VD: "Email khi user đăng ký xong"
  subject TEXT NOT NULL,
  body_main TEXT NOT NULL, -- HTML/Markdown
  signature TEXT NOT NULL,
  variables TEXT[], -- VD: ['{{user_name}}', '{{rejected_reason}}']
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- Seed templates
INSERT INTO email_templates (id, name, subject, body_main, signature) VALUES
  ('registration_pending', 'Đăng ký thành công - chờ duyệt',
   'Yêu cầu đăng ký E-Dream Tools đã được tiếp nhận',
   'Xin chào {{user_name}}, ...',
   'Trân trọng, Đội ngũ E-Dream'),
  ('registration_approved', 'Tài khoản đã được duyệt',
   'Tài khoản E-Dream Tools đã được kích hoạt',
   'Chúc mừng {{user_name}}, ...',
   'Trân trọng, Đội ngũ E-Dream'),
  ('registration_rejected', 'Tài khoản bị từ chối',
   'Yêu cầu đăng ký E-Dream Tools',
   'Xin chào {{user_name}}, ... Lý do: {{rejected_reason}}',
   'Trân trọng, Đội ngũ E-Dream');
```

### 3.9 Bảng system_config (cấu hình hệ thống)

```sql
CREATE TABLE system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

INSERT INTO system_config (key, value, description) VALUES
  ('saved_results_max_per_user', '50', 'Số kết quả tối đa user được lưu'),
  ('saved_results_expire_days',  '90', 'Số ngày sau khi tạo, kết quả tự xóa'),
  ('default_features_for_new_user', '["shopee_calculator_access"]', 'Feature mặc định khi duyệt user mới (admin có thể tick thêm)'),
  ('admin_notification_email', '"hieuliem1007@gmail.com"', 'Email nhận thông báo có user đăng ký mới');
```

### 3.10 Bảng activity_log (log hành động — phục vụ analytics)

```sql
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,    -- VD: "use_feature", "login", "save_result"
  feature_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_log_user_action ON activity_log(user_id, action, created_at DESC);
CREATE INDEX idx_activity_log_action_date ON activity_log(action, created_at DESC);
```

### 3.11 Row Level Security (RLS)

Áp dụng RLS cho TẤT CẢ bảng trên Supabase. Một số rule chính:

```sql
-- profiles: user xem được profile của mình; admin xem tất cả
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admin can view all profiles" ON profiles
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- saved_results: user chỉ xem được của mình; admin xem tất cả
CREATE POLICY "Users can manage own results" ON saved_results
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admin can view all results" ON saved_results
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- default_fees, features: ai cũng read được (cần để app hoạt động); chỉ admin write
CREATE POLICY "Anyone can read default_fees" ON default_fees
  FOR SELECT USING (TRUE);
CREATE POLICY "Only admin can modify default_fees" ON default_fees
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));
```

---

## 4. SITEMAP ĐẦY ĐỦ

### 4.1 Public routes (không cần đăng nhập)

```
/                       → Landing page (giới thiệu E-Dream Tools)
/login                  → Đăng nhập
/register               → Đăng ký
/forgot-password        → Quên mật khẩu (chưa làm phase 1)
/reset-password         → Reset password (chưa làm phase 1)
/terms                  → Terms of Service
/privacy                → Privacy Policy
/shared/:slug           → Trang xem kết quả được chia sẻ public (read-only)
```

### 4.2 User routes (cần đăng nhập)

```
/app                    → Trang chủ sau khi login (welcome + quick stats)
/app/shopee-calculator  → Tool tính phí Shopee (đã có UI)
/app/dashboard          → Dashboard cá nhân (list kết quả đã lưu)
/app/profile            → Profile cá nhân
/app/profile/security   → Đổi mật khẩu
/app/results/:id        → Chi tiết 1 kết quả đã lưu
/app/locked             → Trang hiển thị khi user bị suspended/pending
```

### 4.3 Admin routes (cần đăng nhập + is_admin = TRUE)

```
/admin                       → Dashboard tổng quan (stats, charts)
/admin/users                 → Quản lý user (table, search, filter)
/admin/users/pending         → User chờ duyệt (badge số đỏ)
/admin/users/:id             → Chi tiết 1 user (xem + sửa)
/admin/users/:id/permissions → Phân quyền user (tick features)
/admin/fees                  → Cấu hình phí mặc định
/admin/fees/audit            → Lịch sử sửa phí
/admin/email-templates       → Quản lý template email
/admin/email-templates/:id   → Sửa 1 template
/admin/system                → Cấu hình hệ thống (X ngày expire, max results...)
/admin/analytics             → Dashboard analytics chi tiết (phase 2)
/admin/export                → Export DB, export user list
```

### 4.4 Layout breakdown

**Layout 1 — Public layout** (`/`, `/login`, `/register`, `/terms`, `/privacy`)
- Header đơn giản: logo E-Dream + nút "Đăng nhập"
- Footer: links Terms, Privacy, About

**Layout 2 — Shared link layout** (`/shared/:slug`)
- Không có header, không footer
- Chỉ có content kết quả + 1 watermark "Tạo bằng E-Dream Tools" + CTA "Tạo tool của riêng bạn"

**Layout 3 — User app layout** (`/app/*`)
- Sidebar bên trái với menu các tools (Shopee Calc, TikTok Calc...)
- Top bar: search + notification + avatar dropdown
- Tools nào user không có quyền → vẫn hiển thị trong sidebar nhưng có icon khóa, hover hiện tooltip "Liên hệ Zalo để mở quyền"

**Layout 4 — Admin layout** (`/admin/*`)
- Sidebar bên trái với menu admin (Dashboard, Users, Fees, Email Templates, System, Analytics, Export)
- Top bar: badge "Admin", avatar
- Có nút "Switch to User View" để xem app như user thường

---

## 5. PHÂN CHIA PHASE VÀ TIMELINE

Tổng thời gian: **~1 tháng** (4 tuần × 5-7 buổi/tuần × 1-3 tiếng/buổi)

### Phase 1 — Auth + Approval Flow (Tuần 1)

**Mục tiêu:** User đăng ký được, admin duyệt được, login vào thấy app (kể cả khi chưa có quyền tools nào).

**Việc làm:**

1. Setup Supabase project (1 buổi)
   - Tạo project Supabase
   - Setup Resend cho email
   - Setup DNS edream.vn cho noreply email
   - Lấy SUPABASE_URL và SUPABASE_ANON_KEY

2. Build database schema (1 buổi)
   - Tạo tất cả bảng ở mục 3
   - Setup RLS policies
   - Seed data: features, default_fees, email_templates, system_config

3. Build trang Login (1 buổi)
   - Form email + password
   - Liên kết Supabase Auth signIn
   - Handle các trạng thái: pending → redirect /locked, suspended → redirect /locked, active → /app
   - Forgot password link (placeholder, làm sau)

4. Build trang Register (1 buổi)
   - Form: email, password, full_name, phone
   - Checkbox accept terms
   - Sau submit: tạo auth user + tạo profile với status = 'pending'
   - Hiện thông báo "Đã gửi yêu cầu, vui lòng liên hệ Zalo... để được kích hoạt"
   - Trigger gửi email "registration_pending" cho user
   - Trigger gửi email cho admin "Có user mới đăng ký"

5. Build trang /locked (0.5 buổi)
   - Hiển thị tùy theo status: pending / rejected / suspended
   - Nút logout

6. Setup React Router + Layout cơ bản (0.5 buổi)
   - 4 layouts như mô tả
   - ProtectedRoute component (check auth + status + role)

7. Build admin gateway tối thiểu (1 buổi)
   - Trang `/admin/users/pending`
   - List user có status = pending
   - Nút "Duyệt" / "Từ chối + nhập lý do"
   - Khi duyệt: gán default features (từ system_config) + đổi status → active + gửi email
   - Khi từ chối: đổi status → rejected + gửi email

**Output Phase 1:** User có thể đăng ký, admin có thể duyệt, user được duyệt thì login vào thấy `/app` (lúc này chưa có gì), user chưa duyệt thấy `/locked`.

**Tự test:**
- Đăng ký 1 tài khoản test → thấy email
- Login admin → thấy badge "1 yêu cầu chờ duyệt" → duyệt
- User test → login lại → vào được /app

---

### Phase 2 — Quản lý user + phân quyền (Tuần 2) — **STABLE** (28/04/2026, tag `phase-2-stable`)

**Mục tiêu:** Admin có thể quản lý toàn diện user.

> Đã hoàn thành 5 milestones (2.1 RPCs → 2.5 Profile + Audit). Xem [docs/PHASE-2-COMPLETE.md](./docs/PHASE-2-COMPLETE.md) và [docs/LESSONS-LEARNED-PHASE-2.md](./docs/LESSONS-LEARNED-PHASE-2.md).

**Việc làm:**

1. Trang `/admin/users` (1.5 buổi)
   - Table với columns: avatar, tên, email, phone, status, package_label, created_at, last_login
   - Search theo email/tên/phone
   - Filter theo: status, ngày đăng ký range, lần login gần nhất
   - Pagination (50 user/page)
   - Bulk actions: Suspend / Send email

2. Trang `/admin/users/:id` (1 buổi)
   - Section thông tin: full_name, phone, email, package_label (sửa được)
   - Section trạng thái: status, các nút action (Approve/Reject/Suspend/Unsuspend/Delete/Reset Password)
   - Section lịch sử: list saved_results của user, list activity_log
   - Section phân quyền: link tới /admin/users/:id/permissions

3. Trang `/admin/users/:id/permissions` (1 buổi)
   - List tất cả features
   - Nhóm theo category (calculation / creative / analytics / ...)
   - Cấp 1 (truy cập module) → hiển thị checkbox lớn
   - Cấp 2 (tính năng nhỏ) → checkbox nhỏ, indent vào dưới cấp 1
   - Khi tick cấp 1 → tự động enable các cấp 2; khi bỏ tick cấp 1 → disable cấp 2
   - Nút Save → upsert vào user_features
   - Hiện toast "Đã cập nhật quyền"

4. Action APIs (0.5 buổi)
   - approveUser(id) — đổi status, gán default features, gửi email
   - rejectUser(id, reason) — đổi status, gửi email kèm reason
   - suspendUser(id, reason) — đổi status
   - unsuspendUser(id)
   - deleteUser(id) — xóa hoàn toàn (cẩn thận)
   - resetPassword(id) — gửi email reset link
   - updateProfile(id, data) — admin sửa thông tin user

5. Gửi email custom (0.5 buổi)
   - Form trong /admin/users/:id: textarea + nút send
   - Hoặc bulk: chọn nhiều user → nhập subject + body → gửi hàng loạt

6. Export user list ra CSV (0.5 buổi)
   - Nút "Export CSV" trên trang /admin/users
   - Tải về file gồm: email, tên, phone, status, package, created_at, last_login

**Output Phase 2:** Admin quản lý user toàn diện, gán/sửa quyền cho từng user.

---

### Phase 3 — Cấu hình phí mặc định + tính phí Shopee thật (Tuần 3)

**Mục tiêu:** Admin sửa phí mặc định (có audit), user dùng tính phí với phí thật từ DB.

**Việc làm:**

1. Trang `/admin/fees` (1.5 buổi)
   - List tất cả default_fees, group theo category
   - Mỗi row: fee_label, input số, unit (%/VND), nút "Sửa"
   - Click "Sửa" → modal yêu cầu nhập giá trị mới + lý do (bắt buộc) → confirm
   - Save → update default_fees + insert vào fee_audit_log

2. Trang `/admin/fees/audit` (0.5 buổi)
   - Table lịch sử thay đổi: fee_label, old_value → new_value, reason, changed_at, changed_by
   - Filter theo fee_key, theo ngày
   - Chỉ xem, không rollback

3. Refactor Shopee Calculator để fetch fees từ DB (1 buổi)
   - Tạo hook `useDefaultFees()` fetch từ Supabase
   - Cache trong React Query (stale 5 phút)
   - Loading state khi fetch lần đầu
   - User có thể override sau khi load (giữ chức năng hiện tại)

4. Implement notification "Phí đã cập nhật" (0.5 buổi)
   - Dùng Supabase Realtime subscribe vào bảng default_fees
   - Khi có thay đổi và user đang ở trang Calculator → hiện banner: "Phí mặc định đã được admin cập nhật. [Dùng phí mới] [Giữ phí hiện tại]"

5. Wire phân quyền vào Calculator (0.5 buổi)
   - Khi user mở /app/shopee-calculator → check feature `shopee_calculator_access`
   - Không có quyền → redirect /locked hoặc thấy "Liên hệ Zalo"
   - Trong trang: kiểm tra từng feature con để enable/disable nút (Lưu, Xuất PDF, So sánh...)
   - Nút disable kèm tooltip "Tính năng này chưa được mở. Liên hệ Zalo để mở quyền"

6. Verify logic tính phí (1 buổi — quan trọng)
   - Test các case: cap freeship 50k, toggle on/off, mode reverse
   - So sánh kết quả với Google Sheets gốc
   - Fix nếu sai

**Output Phase 3:** Calculator dùng phí từ DB, admin sửa được, user dùng có phân quyền đúng.

---

### Phase 4 — Lưu kết quả + Dashboard + Share link (Tuần 4 đầu)

**Mục tiêu:** User lưu được kết quả, xem lại trong dashboard, chia sẻ public.

**Việc làm:**

1. Implement save result thật (0.5 buổi)
   - Nút "Lưu kết quả" trong calculator → insert vào saved_results
   - Snapshot fees lúc lưu
   - Set expires_at = created_at + X days từ system_config
   - Check max_per_user; nếu vượt → cảnh báo "Bạn đã lưu tối đa X kết quả, vui lòng xóa bớt"

2. Trang `/app/dashboard` (1 buổi)
   - Stats: số kết quả đã lưu, % lợi nhuận TB, sản phẩm lãi nhất
   - Bar chart so sánh % lợi nhuận
   - List kết quả: table với search, sort
   - Click row → /app/results/:id

3. Trang `/app/results/:id` (1 buổi)
   - Hiển thị kết quả tương tự calculator nhưng read-only
   - Có nút "Tải lại vào calculator" → load inputs vào form
   - Có nút "Tạo link chia sẻ" → tạo entry trong shared_links → copy link
   - Có nút "Xóa"

4. Trang `/shared/:slug` (1 buổi)
   - Public, không cần login
   - Hiển thị result đẹp, có watermark E-Dream
   - CTA: "Tạo tool của riêng bạn → đăng ký E-Dream Tools"
   - Tăng view_count mỗi lần load

5. Implement Tải ảnh + Xuất PDF (1 buổi)
   - Dùng html2canvas cho tải ảnh
   - Dùng react-to-pdf hoặc print CSS cho PDF
   - Style ảnh PDF đẹp riêng (không phải screenshot UI)

6. Cron job xóa expired results (0.5 buổi)
   - Supabase Edge Function chạy hàng ngày
   - DELETE FROM saved_results WHERE expires_at < NOW()

**Output Phase 4:** User flow hoàn chỉnh. Có thể demo cho khách trả phí.

---

### Phase 5 — Email templates + Profile + Polishing (Tuần 4 cuối)

**Mục tiêu:** Hoàn thiện các phần còn lại để launch.

**Việc làm:**

1. Trang `/admin/email-templates` (0.5 buổi)
   - List 3 template chính
   - Sửa được subject + body_main + signature
   - Preview email trước khi save

2. Trang `/app/profile` (0.5 buổi)
   - Form: full_name, phone, email (chỉ xem), package_label (chỉ xem)
   - Section "Đổi mật khẩu" link sang /app/profile/security

3. Trang `/app/profile/security` (0.5 buổi)
   - Form đổi mật khẩu: cũ + mới + confirm

4. Trang `/admin` dashboard (1 buổi)
   - 4 stat cards: tổng user, user pending, user active, kết quả lưu hôm nay
   - Chart user signup theo ngày (7 ngày gần nhất)
   - Chart feature usage (top 5 feature dùng nhiều nhất)
   - Quick actions: link tới các trang admin khác

5. Trang `/admin/system` (0.5 buổi)
   - Form cấu hình các giá trị trong system_config
   - Save → update DB

6. Trang `/admin/export` (0.5 buổi)
   - Export user list CSV
   - Export saved_results theo range ngày
   - Export DB backup full (JSON dump)

7. Setup Google Analytics 4 (0.5 buổi)
   - Tạo property GA4
   - Add tracking script vào app
   - Track các event: signup, login, use_feature, save_result

8. Trang `/terms` và `/privacy` (1 buổi)
   - Viết nội dung (có thể nhờ AI)
   - Format đẹp

9. Test toàn diện + fix bugs (1-2 buổi)
   - Test trên Chrome, Safari, mobile
   - Test các edge case: token expired, concurrent edit, slow network

**Output Phase 5:** Sản phẩm sẵn sàng launch cho 10-50 user đầu tiên.

---

### Tổng kết timeline

| Phase | Nội dung | Thời gian |
|---|---|---|
| 1 | Auth + Approval Flow | 5-7 ngày |
| 2 | Quản lý user + Phân quyền | 5-7 ngày |
| 3 | Cấu hình phí + Wire calculator | 5-7 ngày |
| 4 | Save result + Dashboard + Share | 4-6 ngày |
| 5 | Email + Profile + Admin Dashboard | 4-5 ngày |
| **Tổng** | | **~1 tháng** |

---

## 6. HỆ THỐNG PHÂN QUYỀN CHI TIẾT

### 6.1 Cấu trúc 2 cấp

**Cấp 1 — Module access:**
- Quyết định user có vào được trang hay không
- Ví dụ: `shopee_calculator_access`, `tiktok_calculator_access`
- Nếu user không có → sidebar vẫn hiển thị nhưng có icon khóa

**Cấp 2 — Feature trong module:**
- Quyết định trong trang đó user dùng được tính năng nào
- Ví dụ: `shopee_export_pdf`, `shopee_compare_scenarios`
- Nếu user không có → nút trong trang bị disable kèm tooltip

### 6.2 Default features khi user mới được duyệt

Theo system_config `default_features_for_new_user`:
```json
["shopee_calculator_access"]
```

Tức là user mới được duyệt mặc định chỉ thấy được trang Shopee Calculator nhưng KHÔNG có tính năng phụ nào (Lưu, Xuất, So sánh...). Admin tick thêm sau.

### 6.3 Logic check quyền (frontend)

```typescript
// hook useFeature.ts
export function useFeature(featureId: string): boolean {
  const { user } = useAuth();
  const { data: features } = useUserFeatures(user?.id);
  return features?.includes(featureId) ?? false;
}

// Trong component
function CalculatorPage() {
  const canAccess = useFeature('shopee_calculator_access');
  const canSave = useFeature('shopee_save_result');
  const canExportPdf = useFeature('shopee_export_pdf');

  if (!canAccess) return <LockedView feature="Shopee Calculator" />;

  return (
    <>
      {/* ... calculator UI ... */}
      <button disabled={!canSave} title={canSave ? '' : 'Liên hệ Zalo để mở quyền'}>
        Lưu kết quả
      </button>
    </>
  );
}
```

### 6.4 Logic check quyền (backend - RLS)

Mọi action "viết" phải check quyền ở RLS:

```sql
CREATE POLICY "User must have feature to save result" ON saved_results
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM user_features
      WHERE user_id = auth.uid()
      AND feature_id = 'shopee_save_result'
    )
  );
```

---

## 7. EMAIL TRANSACTIONAL

### 7.1 Setup Resend

1. Đăng ký tại resend.com
2. Add domain edream.vn
3. Resend cho 4 record DNS (SPF, DKIM, DMARC, MX) → bạn add vào DNS edream.vn
4. Wait verification (5-30 phút)
5. Lấy API key

### 7.2 Các email cần gửi

| Trigger | Template | To | Variables |
|---|---|---|---|
| User đăng ký xong | registration_pending | User | user_name |
| User đăng ký xong | admin_new_signup | Admin | user_name, user_email, user_phone |
| Admin duyệt user | registration_approved | User | user_name |
| Admin từ chối user | registration_rejected | User | user_name, rejected_reason |
| Admin reset password | password_reset | User | user_name, reset_link |
| Admin gửi custom | custom | User | (do admin nhập) |

### 7.3 Template sửa được

Phase đầu cho admin sửa được 3 fields cho mỗi template:
- `subject`
- `body_main`
- `signature`

Layout email (header có logo, footer có copyright) hardcode.

---

## 8. QUY TRÌNH MONETIZE THỦ CÔNG

### 8.1 Flow đăng ký → trả phí → kích hoạt

```
1. User vào landing page → bấm "Đăng ký"
2. Điền form → submit
3. Hiện thông báo: "Đã gửi yêu cầu, vui lòng liên hệ Zalo {{zalo_link}}
   để được tư vấn gói + kích hoạt"
4. Admin nhận notification trong dashboard + email
5. Admin tư vấn qua Zalo, chốt gói
6. User chuyển khoản
7. Admin vào /admin/users/pending → tìm user → bấm Duyệt
8. Admin vào /admin/users/:id → sửa package_label = "Gói VIP - 999k - lifetime"
9. Admin vào /admin/users/:id/permissions → tick các features tương ứng
10. User nhận email "Đã được duyệt" → login vào dùng
```

### 8.2 Flow upgrade gói

```
1. User đang dùng → muốn nâng cấp → nhắn Zalo admin
2. Chuyển khoản
3. Admin vào /admin/users/:id → sửa package_label
4. Admin vào /admin/users/:id/permissions → tick thêm features
5. User refresh app → thấy quyền mới (Supabase Realtime hoặc manual reload)
```

### 8.3 Flow gia hạn / hết hạn

Vì là lifetime, không có khái niệm hết hạn tự động. Nếu sau này muốn:
- Admin update package_label thêm "expires: 2026-12-31"
- Manual revoke khi đến hạn (chưa có automation)

---

## 9. CHECKLIST TRƯỚC KHI LAUNCH

### 9.1 Tech checklist

- [ ] Supabase project setup, RLS enabled cho mọi bảng
- [ ] Backup tự động hằng ngày bật
- [ ] Resend domain verified, gửi email test thành công
- [ ] Vercel deploy thành công, custom domain trỏ đúng
- [ ] HTTPS hoạt động
- [ ] Google Analytics 4 nhận event
- [ ] Cron job xóa expired results chạy ổn

### 9.2 Functional checklist

- [ ] Đăng ký user mới → nhận email pending
- [ ] Admin nhận notification user mới
- [ ] Admin duyệt → user nhận email approved → login được
- [ ] Admin từ chối → user nhận email rejected → không login được
- [ ] Admin suspend user → user thấy /locked khi login
- [ ] Admin sửa phí → có audit log đầy đủ
- [ ] User dùng calculator → kết quả tính đúng (so với Google Sheets)
- [ ] User lưu kết quả → thấy trong dashboard
- [ ] User chia sẻ link → người khác xem được không cần login
- [ ] User export PDF, tải ảnh → file ra đẹp
- [ ] Tất cả nút disable đúng theo quyền
- [ ] Mobile responsive trên tất cả các trang chính

### 9.3 Content checklist

- [ ] Trang Terms of Service hoàn chỉnh
- [ ] Trang Privacy Policy hoàn chỉnh
- [ ] Email templates văn phong chuyên nghiệp
- [ ] Landing page có đủ thông tin: lợi ích, hướng dẫn đăng ký, link Zalo

### 9.4 Soft launch (trước khi mở rộng)

- [ ] Gửi link cho 3-5 học viên thân thiết test 1 tuần
- [ ] Thu thập feedback
- [ ] Fix các bug phát hiện
- [ ] Mở rộng sang 20-30 user đầu tiên

---

## 10. PHỤ LỤC: PROMPT TEMPLATE

### 10.1 Prompt template cho Claude Design (build trang mới)

```
Build trang [TÊN TRANG] cho E-Dream Tools.

BRAND CONTEXT:
- E-Dream là Viện đào tạo TMĐT Việt Nam
- Tone: chuyên nghiệp, premium, trustworthy (kiểu fintech)

DESIGN SYSTEM (giữ nguyên):
- Primary: #F5B81C (vàng E-Dream)
- Background: #FAFAF7 (warm off-white)
- Surface: #FFFFFF
- Border: #EFEAE0
- Success: #1D9E75
- Danger: #E24B4A
- Text primary: #1A1A1A
- Text secondary: #6B6B66
- Font: Inter
- Border radius: 12px cards, 8px inputs/buttons
- Shadow nhẹ: 0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04)

LAYOUT:
[Mô tả layout từng section]

NỘI DUNG:
[Mô tả nội dung từng section]

INTERACTION:
[Mô tả hover, click, animation]

RESPONSIVE:
[Yêu cầu mobile]

TIẾNG VIỆT:
Tất cả text phải bằng tiếng Việt, văn phong tự nhiên với người bán Shopee.
```

### 10.2 Prompt template cho Claude Code (tích hợp design vào project)

```
Đây là design [TÊN TRANG] vừa export từ Claude Design.
Hãy tích hợp vào project hiện tại.

YÊU CẦU:
1. KHÔNG SỬA bất kỳ file nào không liên quan
2. Tạo route mới: /[path] trong React Router
3. Component đặt ở src/pages/[TenTrang]/
4. Dùng cùng design system (Tailwind classes, shadcn components) như các trang đã có
5. Wire data từ Supabase nếu cần (mô tả: ...)
6. Comment code bằng tiếng Anh, UI text bằng tiếng Việt
7. Sau khi build xong, chạy npm run dev và confirm app vẫn chạy không lỗi

LOGIC CẦN IMPLEMENT:
[Mô tả chi tiết logic cần làm]

DEPENDENCIES MỚI (nếu cần):
[Liệt kê package mới cần install]

TEST CASE:
[Mô tả các case cần test sau khi build]
```

### 10.3 Prompt khi gặp lỗi và cần fix

```
Trang [TÊN] đang bị lỗi:

MÔ TẢ LỖI:
[Mô tả chi tiết, kèm screenshot nếu có]

ERROR LOG:
[Paste error từ console hoặc terminal]

ĐIỀU MÌNH ĐÃ THỬ:
[Liệt kê những gì đã thử]

YÊU CẦU:
1. Tìm root cause, không chỉ fix triệu chứng
2. Giải thích lỗi do đâu
3. Fix và confirm đã chạy lại OK
4. Nếu cần test, hướng dẫn mình cách test
```

---

## KẾT THÚC

**Document này được thiết kế để dùng làm spec chính trong suốt 1 tháng build.**

Bất cứ khi nào bạn không chắc cần làm gì tiếp:
1. Mở document này
2. Tìm phase đang làm
3. Xem mục "Việc làm" của phase đó
4. Làm xong → tick → sang việc tiếp

Khi cần sửa scope hoặc thêm yêu cầu mới — update document này trước, rồi mới code. Đừng để document và code lệch nhau.

**Last updated:** 2026-04-25 by Hieu Liem
