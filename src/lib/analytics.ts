// src/lib/analytics.ts
//
// gtag wrapper. Defensive: no-op khi gtag chưa load (vd: ad blocker
// chặn googletagmanager.com, hoặc env var chưa set ở Vercel).
//
// Measurement ID public — hardcode trong index.html cho gtag.js,
// đọc qua env var ở đây cho config động (test override...).

const GA_ID = (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined) || 'G-WRCWN83P2B'

declare global {
  interface Window {
    gtag?: (command: string, ...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

export function isGAEnabled(): boolean {
  return typeof window !== 'undefined' && typeof window.gtag === 'function'
}

export function trackPageView(path: string, title?: string): void {
  if (!isGAEnabled()) return
  window.gtag!('event', 'page_view', {
    page_path: path,
    page_title: title || document.title,
    send_to: GA_ID,
  })
}

export function trackEvent(
  eventName: string,
  params?: Record<string, unknown>
): void {
  if (!isGAEnabled()) return
  window.gtag!('event', eventName, params || {})
}

// ── Typed event helpers ──────────────────────────────────────────

export function trackCalculatorUsed(category: string, profitPct: number): void {
  trackEvent('calculator_used', {
    event_category: 'tool',
    category,
    profit_pct: Number(profitPct.toFixed(2)),
    is_profit: profitPct > 0,
  })
}

export function trackSaveResult(toolId: string, hasName: boolean): void {
  trackEvent('save_result', {
    event_category: 'engagement',
    tool_id: toolId,
    has_product_name: hasName,
  })
}

export function trackShareLinkCreated(toolId: string): void {
  trackEvent('share_link_created', {
    event_category: 'engagement',
    tool_id: toolId,
  })
}

export function trackShareLinkViewed(toolId: string): void {
  trackEvent('share_link_viewed', {
    event_category: 'public',
    tool_id: toolId,
  })
}

export function trackFeatureLocked(featureId: string): void {
  trackEvent('feature_locked', {
    event_category: 'permission',
    feature_id: featureId,
  })
}
