// Shared gauge logic for app UI (ProfitGauge.tsx) và ExportTemplate.tsx.
// Thresholds + scale + flex widths phải khớp giữa 2 nơi để export ảnh
// phản ánh đúng vị trí pointer như user nhìn trên app.

export const GAUGE_SCALE_LO = -10
export const GAUGE_SCALE_HI = 30
export const GAUGE_FLEX = [10, 3, 7, 10, 10] as const

export function getGaugePointerPct(pct: number): number {
  const clamped = Math.max(GAUGE_SCALE_LO, Math.min(GAUGE_SCALE_HI, pct))
  return ((clamped - GAUGE_SCALE_LO) / (GAUGE_SCALE_HI - GAUGE_SCALE_LO)) * 100
}
