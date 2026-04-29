// Smart Alerts logic — phân tích kết quả calc và sinh ra cảnh báo/gợi ý
// dựa trên ngưỡng profitPct + tỷ lệ cấu trúc phí.
//
// "Cảnh báo lỗ" (profit < 0) đã do AlertBadges đảm trách → SmartAlerts
// chỉ sinh các rule còn lại (warning/tip/ok).
//
// Snapshot vào saved_results.results.alerts để khi load lại thấy đúng
// alerts tại thời điểm save (kể cả nếu logic thay đổi sau này).

import type { Fee } from '@/types/fees'
import { computeFee } from './fees'

export type AlertSeverity = 'warning' | 'tip' | 'ok'

export interface SmartAlert {
  id: string
  severity: AlertSeverity
  title: string
  description: string
}

export interface SmartAlertInput {
  revenue: number
  feeTotal: number
  profitPct: number
}

const MAX_WARNINGS = 3
const MAX_TIPS = 1
const MAX_OKS = 1

const HIGH_FEE_RATIO = 0.30
const TOTAL_FEE_RATIO = 0.40

const fmtPct1 = (n: number) => n.toFixed(1).replace('.', ',')

export function computeSmartAlerts(input: SmartAlertInput, varFees: Fee[]): SmartAlert[] {
  const { revenue, feeTotal, profitPct } = input
  const out: SmartAlert[] = []

  // Warning: profit mỏng (profit < 0 đã có AlertBadges danger).
  if (profitPct >= 0 && profitPct < 5) {
    out.push({
      id: 'low-profit',
      severity: 'warning',
      title: `Lợi nhuận quá mỏng (${fmtPct1(profitPct)}%)`,
      description: 'Dễ lỗ nếu phát sinh chi phí ngoài dự tính. Cân nhắc tăng giá bán hoặc cắt phí biến đổi.',
    })
  }

  // Warning: 1 phí biến đổi chiếm > 30% tổng phí.
  if (feeTotal > 0) {
    const candidates: { fee: Fee; ratio: number }[] = []
    for (const f of varFees) {
      if (!f.on) continue
      const amount = computeFee(f, revenue)
      if (amount <= 0) continue
      const ratio = amount / feeTotal
      if (ratio > HIGH_FEE_RATIO) candidates.push({ fee: f, ratio })
    }
    candidates.sort((a, b) => b.ratio - a.ratio)
    for (const c of candidates) {
      out.push({
        id: `high-fee-${c.fee.id}`,
        severity: 'warning',
        title: `Phí "${c.fee.name}" chiếm ${fmtPct1(c.ratio * 100)}% tổng phí`,
        description: 'Cân nhắc cắt giảm hoặc tối ưu khoản này để cải thiện lợi nhuận.',
      })
    }
  }

  // Warning: tổng phí > 40% doanh thu.
  if (revenue > 0) {
    const totalRatio = feeTotal / revenue
    if (totalRatio > TOTAL_FEE_RATIO) {
      out.push({
        id: 'total-fee-high',
        severity: 'warning',
        title: `Tổng phí chiếm ${fmtPct1(totalRatio * 100)}% doanh thu`,
        description: 'Cấu trúc phí đang bào mòn lợi nhuận. Xem xét bỏ bớt phí Xtra hoặc tăng giá bán.',
      })
    }
  }

  // Tip: profit 5-10%.
  if (profitPct >= 5 && profitPct < 10) {
    out.push({
      id: 'mid-profit',
      severity: 'tip',
      title: `Lợi nhuận ổn (${fmtPct1(profitPct)}%)`,
      description: 'Có thể tăng giá nhẹ hoặc cắt phí biến đổi để cải thiện thêm.',
    })
  }

  // OK: profit > 15% (vùng 10-15% trung tính → không alert).
  if (profitPct > 15) {
    out.push({
      id: 'good-profit',
      severity: 'ok',
      title: 'Lợi nhuận tốt, tiếp tục duy trì',
      description: '',
    })
  }

  // Cap theo brief: max 3 warning + 1 tip + 1 ok.
  const warnings = out.filter(a => a.severity === 'warning').slice(0, MAX_WARNINGS)
  const tips = out.filter(a => a.severity === 'tip').slice(0, MAX_TIPS)
  const oks = out.filter(a => a.severity === 'ok').slice(0, MAX_OKS)
  return [...warnings, ...tips, ...oks]
}
