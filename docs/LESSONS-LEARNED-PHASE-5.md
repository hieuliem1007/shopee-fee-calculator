# LESSONS LEARNED — PHASE 5: Reset Password, GA4 & UX Polish

## Tổng quan
- **Thời gian:** 28/04/2026 → 29/04/2026 (~1 ngày)
- **Milestones:** 3 commits chính (5.2 reset password, 5.4 GA4, UX polish)
- **Tag git:** rolled into v1.0 (không có tag riêng cho Phase 5)
- **Files thay đổi:** 0 migration, 2 page mới, 1 lib mới (`analytics.ts`), 1 component reusable (`Toast`), 1 wrapper (`AnalyticsProvider`)
- **Cowork test:** không có round riêng cho Phase 5 (rolled vào Phase 6 smoke test)

## Bugs phát hiện và lessons

### Lesson 1: PASSWORD_RECOVERY auth event cần race + fallback
Supabase emit `PASSWORD_RECOVERY` event khi user click link reset từ email. Nếu user mở `/reset-password` trực tiếp (không qua link), event không fire → `ResetPasswordPage` đứng yên không có context. Fix: subscribe event + đồng thời `getSession()` (vì có thể session đã được set trước khi listener mount), với 1500ms fallback timer → nếu cả hai không trả token → render invalid-link view.
**Lesson:** Auth event listener pattern luôn phải có 3 path: (1) event fire bình thường, (2) session đã có sẵn lúc mount (race), (3) timeout fallback. Nếu chỉ subscribe event → user direct-visit thấy spinner vô tận.

### Lesson 2: Public route reset không được wrap GuestRoute
`GuestRoute` trong codebase redirect `/dashboard` nếu user đã login. Nhưng recovery session từ `PASSWORD_RECOVERY` event là **logged-in session** → wrap `GuestRoute` quanh `/reset-password` sẽ bounce user về dashboard trước khi page kịp render form đổi mật khẩu. Fix: đặt `/forgot-password` + `/reset-password` trong `PublicLayout` nhưng **KHÔNG** wrap `GuestRoute`.
**Lesson:** Auth state có ≥3 trạng thái: (a) anon, (b) authenticated, (c) recovery — không phải chỉ 2 (logged-in/out). Recovery session ngắn hạn nhưng từ frame đầu user đã có `auth.uid()`. Mọi page xử lý recovery phải tách riêng khỏi guest-only routes. Tương tự cho magic link, OAuth callback.

### Lesson 3: Defensive feature gate cho 3rd-party SDK
GA4 wrapper `lib/analytics.ts` không assume gtag tồn tại — `isGAEnabled = !!import.meta.env.VITE_GA_MEASUREMENT_ID && typeof window.gtag === 'function'`. Mọi `trackPageView` / `trackEvent` đều bắt đầu bằng `if (!isGAEnabled) return;`. Lý do: dev local thường không set env → import script gtag fail → không crash app.
**Lesson:** SDK tracking/analytics phải fail-safe: env missing → no-op không throw, không log error đỏ. Tương tự cho Sentry, Resend, Stripe... Wrapper module phải hide complexity và bảo đảm app không phụ thuộc cứng vào SDK.

### Lesson 4: Throttle event tracking thay vì fire-on-keystroke
`trackCalculatorUsed` được wire trong `CalculatorApp` mỗi khi `cost + sell + category` đều set. Nếu fire raw, user gõ 5 chữ số `costPrice` = 5 events trong 1 giây → noise vô nghĩa cho GA4. Fix: throttle 5s (event chỉ fire 1 lần trong 5s ngay cả khi user thay đổi nhiều input).
**Lesson:** Event tracking cho user input phải có debounce/throttle. Pattern: throttle 5–10s cho calculator-style (continuous input), debounce 500ms cho search box (single intent). Tránh `onChange={() => trackEvent(...)}` raw.

### Lesson 5: AnalyticsProvider listen useLocation thay vì send_page_view tự động
`gtag.js` mặc định auto-send page_view ở mỗi load + on route change qua `history` API. Nhưng SPA React Router dùng `pushState` + `popstate` — không đủ trigger được tất cả case (vd: param thay đổi không reload). Fix: `send_page_view=false` trong config + `AnalyticsProvider` listen `useLocation()` → manual `trackPageView(pathname + search)`.
**Lesson:** Với SPA, vô hiệu auto page_view của 3rd-party SDK + manage manual qua router hook. Tương tự cho hash router, Next.js App Router. Đảm bảo route changes (kể cả param-only) có log đủ.

### Lesson 6: Bóc inline state copy-paste thành reusable component muộn còn hơn không
Trước Phase 5, mỗi page có toast tự copy-paste: `useState<Toast>({...})`, `setTimeout` 2s clear, render JSX inline. Phase 5 bóc thành `<Toast>` reusable + 1 hook `useToast()`. 9 file áp dụng, giảm 52 dòng + thêm 84 dòng vào component reusable. Trade-off: scope creep nhỏ (Phase 4 chỉ nói "tăng duration 2→4s") nhưng đảm bảo Phase 6 thêm toast ở chỗ mới không lặp pattern.
**Lesson:** Khi user feedback "tunable cosmetic" (vd duration, color, position) cho UI lặp lại 5+ chỗ, ưu tiên bóc reusable thay vì sửa từng chỗ. Cost upfront ~2x nhưng next change chỉ chạm 1 file. Test rule of 3: lặp lại 3 lần là dấu hiệu cần extract.

### Lesson 7: Master plan milestones có thể collapse
Master plan Phase 5 list 5.1 (email notification), 5.3 (profile enhancement), 5.5 (settings advanced) nhưng không có commit nào với prefix đó. Chúng được rolled vào Phase 6 (M6.4 change password thay cho 5.3) hoặc defer sang Phase 7 (email notification — cần Resend setup chưa làm). Không phải lỗi planning — là realistic scope adjustment.
**Lesson:** Master plan là kim chỉ nam, không phải hợp đồng. Khi scope shift, ghi chú rõ trong commit/PHASE-COMPLETE thay vì cố ép milestone không cần thiết. Phần defer phải có lý do (chưa có resource, chưa có user feedback, chưa có infra).

## Mandatory patterns Phase 6

1. **Auth event listener** — listen + getSession race + timeout fallback (3 path)
2. **Recovery session ≠ guest** — public routes xử lý recovery KHÔNG wrap GuestRoute
3. **Defensive 3rd-party SDK wrapper** — env missing → no-op, không throw
4. **Throttle/debounce tracking events** — không fire raw on every input change
5. **SPA manual page_view** — disable auto của SDK, listen router hook
6. **Reusable component khi 3+ chỗ lặp** — bóc state + JSX, không copy-paste
7. **Defer milestones có lý do rõ** — ghi vào PHASE-COMPLETE thay vì xoá khỏi plan

## Statistics
- **Migrations apply:** 0
- **RPCs viết mới:** 0
- **Pages tạo mới:** 2 (`ForgotPasswordPage`, `ResetPasswordPage`)
- **Components reusable:** 1 (`Toast`) + 1 wrapper (`AnalyticsProvider`)
- **Libs:** 1 (`analytics.ts` — 77 dòng)
- **Bug fixes:** 0 (no regression Phase 5)
- **Cowork test:** rolled vào Phase 6

## Decisions không sửa, defer Phase 6/7

1. **Email notification khi share link expire** — defer Phase 7 (cần Resend integration).
2. **Multi-device session management** — defer Phase 7.
3. **Master plan 5.1, 5.3, 5.5 milestones** — collapse vào Phase 6 hoặc defer Phase 7.
4. **2FA/MFA** — defer Phase 7.
