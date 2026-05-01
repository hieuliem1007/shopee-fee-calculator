# ROLLBACK GUIDE — Khôi phục app khi gặp sự cố

⚠️ ĐỌC FILE NÀY KHI: production app bị bug nghiêm trọng và cần đưa về phiên bản ổn định ngay.

## TÌNH HUỐNG 1 — Production crash, cần rollback NGAY (5 phút)

**Cách nhanh nhất: Vercel Dashboard**

1. Mở https://vercel.com/dashboard
2. Click project "shopee-fee-calculator"
3. Tab "Deployments"
4. Tìm deployment có tag "v1.0" (hoặc deployment mới nhất ổn định)
5. Click "..." (3 chấm) → "Promote to Production"
6. Confirm

→ Production rollback xong trong ~30 giây. Không cần command line.

## TÌNH HUỐNG 2 — Xem code v1.0 trên máy (không ảnh hưởng production)

```bash
cd ~/Desktop/shopee-fee-calculator
git checkout v1.0          # đổi code về v1.0 để xem
# ... xem code, test thử ...
git checkout main          # quay lại code mới nhất
```

## TÌNH HUỐNG 3 — Lấy 1 file cụ thể từ v1.0 (vd recommendation-engine.ts bị hỏng ở Phase 7)

```bash
git checkout v1.0 -- src/lib/recommendation-engine.ts
git commit -m "revert: lấy lại recommendation-engine từ v1.0"
git push origin main
```

→ Vercel auto deploy với file revert.

## TÌNH HUỐNG 4 — Reset toàn bộ branch về v1.0 (NGUY HIỂM, mất hết commit sau)

⚠️ CẢNH BÁO: Mất TOÀN BỘ code đã làm sau v1.0. CHỈ làm khi 100% chắc chắn.

```bash
git checkout main
git reset --hard v1.0
git push --force origin main   # ⚠️ FORCE PUSH - không thể undo
```

→ Vercel auto deploy v1.0. **TỐT NHẤT dùng TÌNH HUỐNG 1 (Vercel Dashboard) thay cho cách này.**

## DATABASE ROLLBACK

Code rollback DỄ. Database rollback PHỨC TẠP hơn.

Nếu Phase 7+ có migration làm hỏng data:

1. **Stop migrate ngay**: KHÔNG apply thêm migration mới
2. **Backup hiện tại trước khi sửa**: Vào Supabase Dashboard → Database → Backups → Create manual backup
3. **Rollback migration cụ thể**:
   - Nếu migration mới chưa có data quan trọng → viết migration NGƯỢC LẠI (vd ADD COLUMN → DROP COLUMN)
   - Nếu có data quan trọng → restore từ Supabase backup (Pro plan trở lên)
4. **STOP và hỏi Claude.ai planner trước khi tự sửa DB**

## TAG MILESTONE ỔN ĐỊNH (recommend)

Mỗi feature lớn ổn định, tạo tag mới để có nhiều "ảnh chụp" rollback:

```bash
git tag -a v1.1 -m "Phase 7 — Landing page"
git push origin v1.1

git tag -a v1.2 -m "Phase 7 — Mobile responsive"
git push origin v1.2
```

→ Càng nhiều tag, càng dễ rollback chính xác về điểm muốn.

## WORKFLOW AN TOÀN CHO PHASE 7+

Để giảm rủi ro hơn nữa:

```bash
# Mỗi feature mới làm trên branch riêng
git checkout -b feature/landing-page

# Code, test trên branch này
# Vercel auto tạo preview URL như: feature-landing-page-xxxx.vercel.app
# Test trên preview URL trước khi merge

# Khi feature ổn định:
git checkout main
git merge feature/landing-page
git push origin main   # production deploy

# Nếu feature bị bug, đơn giản xóa branch:
git branch -D feature/landing-page
# Main vẫn nguyên vẹn, không ảnh hưởng production
```

## CHECKLIST KHI GẶP SỰ CỐ PRODUCTION

1. [ ] Bình tĩnh, KHÔNG hoảng loạn
2. [ ] Vào Vercel Dashboard → rollback về deployment ổn định trước (TÌNH HUỐNG 1)
3. [ ] Xác nhận production đã ổn định
4. [ ] Sau đó MỚI debug bug ở local + branch riêng
5. [ ] Fix xong, test kỹ trên preview URL
6. [ ] Merge vào main → production update

## LIÊN HỆ

Nếu không tự xử lý được:
- Claude.ai planner: paste tình huống chi tiết
- Vercel support: cho Hobby plan có forum, Pro plan có chat
- Supabase support: chat trực tiếp trên dashboard
