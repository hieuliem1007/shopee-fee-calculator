// Smart Alerts (unified) — danger lỗ + warning + tip + ok cùng 1 list,
// render trong ResultCard ngay dưới hàng KPI cards.
//
// Wording mọi gợi ý cắt giảm phí HƯỚNG VỀ phí biến đổi (quảng cáo,
// affiliate, vận hành...) — phí cố định Shopee (phí sàn, Xtra, thuế,
// thanh toán, hạ tầng) là phí sàn quy định, USER KHÔNG ĐỔI ĐƯỢC.
//
// Snapshot vào saved_results.results.alerts để khi load saved/public
// view sẽ render đúng alerts tại thời điểm save.

import type { Fee } from '@/types/fees'
import { computeFee } from './fees'
import { fmtVND } from './utils'

export type AlertSeverity = 'danger' | 'warning' | 'tip' | 'ok'

export interface SmartAlert {
  id: string
  severity: AlertSeverity
  title: string
  description: string
}

export interface SmartAlertInput {
  revenue: number
  feeTotal: number
  profit: number
  profitPct: number
  costPrice: number
}

// Break-even theo cost-volume-profit:
//   F = chi phí không phụ thuộc giá bán = giá vốn + Σ phí flat đang on
//   k = tổng tỷ lệ phí % theo giá bán = Σ rate của các phí kind='pct' đang on
//   Giá hòa vốn: P_hv = F / (1 - k)
// Lưu ý: rate của fee kind='pct' đã ở dạng decimal (vd 0.035), kind='flat'
// là raw VND (vd 1650).
function computeBreakEven(
  costPrice: number,
  sellPrice: number,
  allFees: Fee[],
  currentFeeTotal: number,
) {
  let flatSum = 0
  let pctSum = 0
  for (const f of allFees) {
    if (!f.on) continue
    if (f.kind === 'flat') flatSum += f.rate
    else pctSum += f.rate
  }
  const F = costPrice + flatSum
  const k = pctSum
  const breakEvenPrice = k < 1 ? F / (1 - k) : Number.POSITIVE_INFINITY
  const pctIncreaseNeeded = sellPrice > 0 && Number.isFinite(breakEvenPrice)
    ? ((breakEvenPrice - sellPrice) / sellPrice) * 100
    : Number.POSITIVE_INFINITY
  const maxFeeAllowed = Math.max(0, sellPrice - costPrice)
  const feeReductionNeeded = Math.max(0, currentFeeTotal - maxFeeAllowed)
  return { breakEvenPrice, pctIncreaseNeeded, maxFeeAllowed, feeReductionNeeded }
}

const MAX_DANGERS = 1
const MAX_WARNINGS = 3
const MAX_TIPS = 1
const MAX_OKS = 1

const HIGH_FEE_RATIO = 0.30
const TOTAL_FEE_RATIO = 0.40

const fmtPct1 = (n: number) => n.toFixed(1).replace('.', ',')

export function computeSmartAlerts(
  input: SmartAlertInput,
  fixedFees: Fee[],
  varFees: Fee[],
): SmartAlert[] {
  const { revenue, feeTotal, profit, profitPct, costPrice } = input
  const out: SmartAlert[] = []

  if (revenue <= 0) return out

  // 1. Danger lỗ — luôn quan trọng nhất, hiển thị cho mọi user.
  // Tính P_hv chính xác theo break-even thay vì lấy %lỗ làm % tăng giá:
  // tăng giá bán → các phí % cũng scale theo nên cần công thức F/(1-k).
  if (profit < 0) {
    const be = computeBreakEven(costPrice, revenue, [...fixedFees, ...varFees], feeTotal)
    const isReachable = Number.isFinite(be.breakEvenPrice)
    const desc = isReachable
      ? `Để hòa vốn: tăng giá bán thêm ${fmtPct1(be.pctIncreaseNeeded)}% (lên ${fmtVND(Math.round(be.breakEvenPrice))}) HOẶC cắt giảm tổng phí xuống còn ${fmtVND(be.maxFeeAllowed)} (giảm ${fmtVND(Math.round(be.feeReductionNeeded))}).`
      : `Tổng phí % vượt 100% doanh thu — không thể hòa vốn chỉ bằng tăng giá. Cần cắt giảm tổng phí xuống còn ${fmtVND(be.maxFeeAllowed)} (giảm ${fmtVND(Math.round(be.feeReductionNeeded))}).`
    out.push({
      id: 'loss',
      severity: 'danger',
      title: `Bạn đang lỗ (${fmtPct1(profitPct)}%)`,
      description: desc,
    })
  }

  // 2. Warning: lợi nhuận mỏng (0 ≤ profitPct < 5).
  if (profitPct >= 0 && profitPct < 5) {
    out.push({
      id: 'low-profit',
      severity: 'warning',
      title: `Lợi nhuận quá mỏng (${fmtPct1(profitPct)}%)`,
      description: 'Dễ lỗ nếu phát sinh chi phí ngoài dự tính. Cân nhắc tăng giá bán hoặc giảm phí biến đổi (quảng cáo, affiliate...).',
    })
  }

  // 3. Warning: 1 phí biến đổi chiếm > 30% tổng phí. Chỉ check var fees.
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
        description: 'Đây là phí biến đổi cao bất thường. Cân nhắc giảm hoặc tối ưu khoản này.',
      })
    }
  }

  // 4. Warning: tổng phí > 40% doanh thu.
  const totalRatio = feeTotal / revenue
  if (totalRatio > TOTAL_FEE_RATIO) {
    out.push({
      id: 'total-fee-high',
      severity: 'warning',
      title: `Tổng phí chiếm ${fmtPct1(totalRatio * 100)}% doanh thu`,
      description: 'Cấu trúc phí đang bào mòn lợi nhuận. Cân nhắc giảm phí biến đổi (quảng cáo, affiliate, vận hành) hoặc tăng giá bán.',
    })
  }

  // 5. Tip: profit ổn (5 ≤ profitPct < 10).
  if (profitPct >= 5 && profitPct < 10) {
    out.push({
      id: 'mid-profit',
      severity: 'tip',
      title: `Lợi nhuận ổn (${fmtPct1(profitPct)}%)`,
      description: 'Có thể tăng giá bán hoặc giảm phí biến đổi để cải thiện thêm.',
    })
  }

  // 6. (10 ≤ profitPct ≤ 15: trung tính, không alert.)

  // 7. OK: profit > 15%.
  if (profitPct > 15) {
    out.push({
      id: 'good-profit',
      severity: 'ok',
      title: `Lợi nhuận tốt (${fmtPct1(profitPct)}%)`,
      description: 'Tiếp tục duy trì cấu trúc phí và giá bán hiện tại.',
    })
  }

  // Cap theo brief: 1 danger + 3 warning + 1 tip + 1 ok.
  const dangers = out.filter(a => a.severity === 'danger').slice(0, MAX_DANGERS)
  const warnings = out.filter(a => a.severity === 'warning').slice(0, MAX_WARNINGS)
  const tips = out.filter(a => a.severity === 'tip').slice(0, MAX_TIPS)
  const oks = out.filter(a => a.severity === 'ok').slice(0, MAX_OKS)
  return [...dangers, ...warnings, ...tips, ...oks]
}
