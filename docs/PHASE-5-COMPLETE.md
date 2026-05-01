# Phase 5 — COMPLETE

**STATUS**: STABLE
**Tag**: rolled into v1.0 (không tag riêng)
**Date**: 2026-04-28 → 2026-04-29 (~1 ngày)

## Sẵn sàng Phase 6
Phase 6 — Feature completion (export, smart alerts, change password, admin overview, layout polish, business type, recommendation engine, Mall/Normal split) + Security audit + v1.0 release.

## Scope đã giao
- 3 commits chính (5.2 reset password, 5.4 GA4, UX polish toast/tooltip).
- 0 migration mới (Phase 5 toàn frontend + auth).
- 0 RPC mới.
- 2 page mới: `ForgotPasswordPage`, `ResetPasswordPage`.
- 1 lib mới: `analytics.ts` (gtag wrapper + 5 typed event helpers).
- 1 component nâng cấp: `Toast` (bóc khỏi inline `CalculatorApp` thành reusable component dùng chung 9 file admin/app/calculator).
- 1 component mới: `AnalyticsProvider` (listen `useLocation` → `trackPageView`).

## Milestones không thực hiện (defer)
Master plan ban đầu liệt kê 5.1 (email notification), 5.3 (profile enhancement), 5.5 (settings advanced) nhưng chỉ 5.2 + 5.4 + UX polish được commit. Các milestone còn lại bị scope vào Phase 6 (M6.4 change password thay cho 5.3, email notification chưa có Resend integration). Lesson: scope shifts giữa phases — không phải mọi milestone planned đều cần có commit riêng nếu bị merge vào phase sau.

## Functionality delivered

### Reset password (M5.2 — commit f2e1a99)
- `/forgot-password` form email → `supabase.auth.resetPasswordForEmail` với `redirectTo=window.location.origin/reset-password`. Success view hiển thị email gửi đi + link quay lại login. Rate-limit error mapped sang Việt.
- `/reset-password` listen `PASSWORD_RECOVERY` auth event + `getSession()` race + 1500ms fallback sang invalid-link view nếu user vào trực tiếp không có recovery token. Form password + confirm validate zod (min 8 + match). `updateUser({password})` xong tự `signOut` + redirect `/login` sau 2s.
- App.tsx: `/forgot-password` + `/reset-password` đặt trong `PublicLayout` nhưng KHÔNG wrap `GuestRoute` — recovery session là logged-in session, GuestRoute sẽ bounce khỏi page.

### GA4 integration (M5.4 — commit ec5e39d)
- `index.html` bootstrap `gtag.js` với `G-WRCWN83P2B`, `send_page_view=false` (tự manage qua AnalyticsProvider).
- `lib/analytics.ts`: `isGAEnabled` defensive check `import.meta.env.VITE_GA_MEASUREMENT_ID`, no-op nếu thiếu. `trackPageView`, `trackEvent` + 5 helper typed: `trackCalculatorUsed`, `trackSaveResult`, `trackShareLinkCreated`, `trackShareLinkViewed`, `trackFeatureLocked`.
- `AnalyticsProvider` lắng nghe React Router `useLocation` → `trackPageView` mỗi khi pathname đổi.
- Wire 5 events:
  - CalculatorApp: `trackCalculatorUsed` throttled 5s (chỉ fire khi cost+sell+category đều set, tránh fire mỗi keystroke).
  - SaveResultDialog: fire on save success.
  - ShareLinkDialog: fire on create + recreate success.
  - PublicSharePage: fire on `getPublicResult` success (dùng `tool_id` từ response).
  - FeatureGate: fire khi feature missing trước khi redirect `/locked`.
- `.env.example` documents `VITE_GA_MEASUREMENT_ID`.

### UX polish (commit a5015f0)
- `Toast.tsx`: bóc state + render khỏi inline implementation trong `CalculatorApp` thành component reusable. 4s timeout (Cowork suggest từ Phase 4). Dùng chung 9 file: 5 admin pages + 3 app pages + 1 calculator → DRY pattern thay cho 9 inline state copy-paste.
- Empty states + tooltips bổ sung lác đác trong các form admin/profile (commit message ngắn, chỉ 84 dòng thêm vs 52 xóa).

## Test gating
- Build TypeScript: pass cả 3 commits.
- Live test reset password: send email rate-limit error mapped, recovery link redirect chạy.
- GA4 verify: console DevTools network → request `gtag/js?id=G-WRCWN83P2B` fire khi đổi route. Throttle 5s verify Calculator không spam event.
- 0 migration → không có DB audit.

Xem chi tiết [LESSONS-LEARNED-PHASE-5.md](./LESSONS-LEARNED-PHASE-5.md).
