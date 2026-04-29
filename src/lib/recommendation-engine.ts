// E-Dream Expert Engine — recommendation generator (pure logic, no React).
// Cấu trúc 4 tầng: chẩn đoán → mục tiêu → insight → action plan.
// KHÔNG gọi LLM. Dùng công thức P_hv = F / (1 - k) (xem M6.3 fix 5082eda)
// + rule-based insights với 1-3 wording variants chống lặp giữa các sản phẩm.

import type { Fee } from '@/types/fees'
import { fmtVND } from './utils'

// ── Types ────────────────────────────────────────────────────────

export type RecommendationState =
  | 'critical' | 'warning' | 'caution' | 'ok' | 'excellent'

export interface RecommendationContext {
  costPrice: number
  sellPrice: number
  fixedFees: Fee[]   // fees có category=shopee_fixed (panel vàng)
  varFees: Fee[]     // fees có category=shopee_variable (panel xanh)
  // derived (truyền từ derive() để khỏi tính lại)
  revenue: number
  feeTotal: number
  fixedTotal: number
  varTotal: number
  profit: number
  profitPct: number  // %
  // optional context
  shopType?: 'mall' | 'normal'
  productName?: string
  categoryLabel?: string
  // target margin (default 0.15 = 15%)
  targetMargin?: number
}

export interface RecommendationOutput {
  diagnosis: {
    state: RecommendationState
    title: string
    description: string
    metrics: {
      profitAmount: number
      profitPct: number
      returnBuffer: number | null
    }
  }
  goal: {
    targetMargin: number
    pathA: {
      currentPrice: number
      targetPrice: number
      increasePct: number
      feasible: boolean
    }
    pathB: {
      currentVarFees: number
      maxVarFees: number
      reductionPct: number
      feasible: boolean
    }
  }
  insights: Array<{ id: string; icon: string; text: string }>
  actions: Array<{ priority: number; text: string }>
  meta: {
    breakEvenACOS: number
    breakEvenPrice: number
    targetMarginUsed: number
  }
}

// ── Pure formulas ────────────────────────────────────────────────

/** Tách phí cố định thành 2 phần: flat (VND) và pct (%). Chỉ tính fee on. */
function splitFixedFees(fixedFees: Fee[]) {
  let flatSum = 0
  let pctSum = 0
  for (const f of fixedFees) {
    if (!f.on) continue
    if (f.kind === 'flat') flatSum += f.rate
    else pctSum += f.rate
  }
  return { flatSum, pctSum }
}

function sumPctVarFees(varFees: Fee[]): number {
  return varFees.reduce((s, f) => s + (f.on && f.kind === 'pct' ? f.rate : 0), 0)
}

/**
 * P = F / (1 - k) với F = costPrice + flat fixed; k = pctVar + pctFixed + targetMargin.
 * Nếu k >= 1 → infeasible (Infinity).
 * Khi targetMargin = 0 → giá hòa vốn.
 */
export function computePTarget(
  costPrice: number,
  fixedFlatFees: number,
  variablePercentSum: number,
  fixedPercentSum: number,
  targetMargin: number,
): number {
  const F = costPrice + fixedFlatFees
  const k = variablePercentSum + fixedPercentSum + targetMargin
  if (k >= 1) return Infinity
  return F / (1 - k)
}

/**
 * Số đơn cần bán bù 1 đơn hoàn:
 *   loss = costPrice + packagingFee + nonRefundableFees
 *   buffer = ceil(loss / netProfitPerOrder)
 * netProfitPerOrder ≤ 0 → không tính (đang lỗ thì không có "lãi để bù").
 */
export function computeReturnBuffer(
  costPrice: number,
  packagingFee: number,
  nonRefundableFees: number,
  netProfitPerOrder: number,
): number | null {
  if (netProfitPerOrder <= 0) return null
  const lossPerReturn = costPrice + packagingFee + nonRefundableFees
  return Math.ceil(lossPerReturn / netProfitPerOrder)
}

/**
 * Break-even ACOS: ngưỡng % ads tối đa để không lỗ.
 *   ratio = (costPrice + totalFeesExclAds) / sellPrice
 *   ACOS_max = (1 - ratio) * 100
 */
export function computeBreakEvenACOS(
  costPrice: number,
  totalFeesExclAds: number,
  sellPrice: number,
): number {
  if (sellPrice <= 0) return 0
  const ratio = (costPrice + totalFeesExclAds) / sellPrice
  return Math.max(0, (1 - ratio) * 100)
}

// ── State diagnosis ──────────────────────────────────────────────

function diagnoseState(profit: number, profitPct: number): RecommendationState {
  if (profit < 0) return 'critical'
  if (profitPct < 3) return 'warning'
  if (profitPct < 8) return 'caution'
  if (profitPct < 15) return 'ok'
  return 'excellent'
}

// ── Variant pick (deterministic) ─────────────────────────────────

function hashSeed(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h * 31 + s.charCodeAt(i)) | 0)
  return Math.abs(h)
}

function pickVariant(variants: string[], seed: string): string {
  if (variants.length <= 1) return variants[0] ?? ''
  return variants[hashSeed(seed) % variants.length]
}

// ── Helpers ──────────────────────────────────────────────────────

const fmtPct1 = (n: number): string => n.toFixed(1).replace('.', ',')

function getFee(fees: Fee[], id: string): Fee | undefined {
  return fees.find(f => f.id === id && f.on)
}

// Phí "ngoài cùng" (non-refundable proxy): ước tính = 30% fixed total.
function estimateNonRefundable(fixedTotal: number): number {
  return fixedTotal * 0.30
}

// Phí đóng gói proxy: lấy từ shopee_operation nếu là flat, fallback 0.
function getPackagingFee(fees: Fee[]): number {
  const op = fees.find(f => f.id === 'shopee_operation' && f.on)
  if (!op) return 0
  return op.kind === 'flat' ? op.rate : 0
}

// ── Insights (Logic Tree) ────────────────────────────────────────

interface InsightCtx {
  ctx: RecommendationContext
  allFees: Fee[]
  breakEvenACOS: number
  fixedPctOfRevenue: number
  seed: string
}

interface InsightRule {
  id: string
  icon: string
  severity: number  // 0 = lowest, 100 = highest
  match: (c: InsightCtx) => boolean
  build: (c: InsightCtx) => string
}

const INSIGHTS: InsightRule[] = [
  {
    id: 'acos-burning',
    icon: '🔥',
    severity: 100,
    match: ({ ctx, breakEvenACOS }) => {
      const ads = getFee(ctx.varFees, 'shopee_ads')
      if (!ads || ads.kind !== 'pct') return false
      const acos = ads.rate * 100
      return acos > breakEvenACOS && breakEvenACOS > 0
    },
    build: ({ ctx, breakEvenACOS, seed }) => {
      const ads = getFee(ctx.varFees, 'shopee_ads')!
      const acos = ads.rate * 100
      const variants = [
        `Quảng cáo đang "đốt" tiền lời: ACOS ${fmtPct1(acos)}% > điểm hòa vốn ${fmtPct1(breakEvenACOS)}%. Mỗi đơn từ ads đang LỖ.`,
        `ACOS ${fmtPct1(acos)}% chỉ phù hợp giai đoạn "vít" lượt bán (buff index). Nếu duy trì lâu, mục tiêu phải <${fmtPct1(breakEvenACOS / 2)}% để có lãi thực.`,
      ]
      return pickVariant(variants, seed + ':acos')
    },
  },
  {
    id: 'high-fee-package',
    icon: '📦',
    severity: 80,
    match: ({ ctx }) => {
      const xtraSum = ctx.fixedFees
        .filter(f => f.on && f.id.includes('xtra') && f.kind === 'pct')
        .reduce((s, f) => s + f.rate, 0)
      return xtraSum > 0.30
    },
    build: ({ ctx, seed }) => {
      const xtraFees = ctx.fixedFees.filter(f => f.on && f.id.includes('xtra') && f.kind === 'pct')
      const xtraSum = xtraFees.reduce((s, f) => s + f.rate, 0)
      // Pick gói Xtra rate lớn nhất để gợi ý tắt
      const weakest = xtraFees.slice().sort((a, b) => b.rate - a.rate)[0]
      const variants = [
        `Bẫy "gói dịch vụ": Tổng các gói Xtra đang ngốn ${fmtPct1(xtraSum * 100)}% doanh thu. Hãy cân nhắc tắt ${weakest?.name ?? 'một gói'} nếu sản phẩm không thuộc nhóm có tỷ lệ mua lại cao — có thể giải phóng ~${fmtPct1(weakest ? weakest.rate * 100 : 0)}% biên.`,
        `Cấu trúc phí Xtra (${fmtPct1(xtraSum * 100)}%) đang nặng. Theo dữ liệu Shopee 2024: shop tham gia 1 gói Xtra thường có conversion +30-40%, tham gia cả 2-3 gói KHÔNG tăng đáng kể. Cân nhắc giữ 1 gói hiệu quả nhất.`,
      ]
      return pickVariant(variants, seed + ':xtra')
    },
  },
  {
    id: 'low-price-fixed-trap',
    icon: '🪤',
    severity: 70,
    match: ({ ctx, fixedPctOfRevenue }) =>
      ctx.sellPrice < 150000 && fixedPctOfRevenue > 0.10,
    build: ({ ctx, fixedPctOfRevenue, seed: s }) => {
      const seed = s
      const variants = [
        `Sản phẩm giá thấp (${fmtVND(ctx.sellPrice)}) đang bị phí cố định "ăn" ${fmtPct1(fixedPctOfRevenue * 100)}% doanh thu. Giải pháp: bán Combo 2-3 sản phẩm để pha loãng phí cố định trên mỗi đơn.`,
      ]
      return pickVariant(variants, seed + ':lowprice')
    },
  },
  {
    id: 'high-affiliate',
    icon: '🤝',
    severity: 60,
    match: ({ ctx }) => {
      const aff = getFee(ctx.varFees, 'shopee_affiliate')
      return !!(aff && aff.kind === 'pct' && aff.rate >= 0.08)
    },
    build: ({ ctx, seed }) => {
      const aff = getFee(ctx.varFees, 'shopee_affiliate')!
      const affPct = aff.rate * 100
      const variants = [
        `Affiliate ${fmtPct1(affPct)}% cao hơn mức trung bình ngành (3-5%). Phù hợp ngành Mỹ phẩm/F&B (conversion cao), nhưng quá cao cho ngành Đồ chơi/Thời trang.`,
        `Affiliate ${fmtPct1(affPct)}% chỉ nên áp dụng nếu CTR/CR sản phẩm cao (>3%). Ngược lại, cân nhắc giảm về 3-5% để tối ưu biên.`,
      ]
      return pickVariant(variants, seed + ':aff')
    },
  },
  {
    id: 'shop-mall-cost',
    icon: '🏬',
    severity: 50,
    match: ({ ctx }) => ctx.shopType === 'mall',
    build: ({ ctx, seed }) => {
      const variants = [
        `Shop Mall đang trả thêm phí cố định (~3,5%) cho uy tín thương hiệu. Nếu chưa đủ điều kiện duy trì (doanh thu, đánh giá), xuống Shop thường giảm được ~2% phí cố định.`,
        `Phí Shop Mall (~3,5%) đáng giá nếu sản phẩm cao cấp (>500k). Với sản phẩm phổ thông ${fmtVND(ctx.sellPrice)} thì khá nặng — đánh giá lại ROI của bậc Mall.`,
      ]
      return pickVariant(variants, seed + ':mall')
    },
  },
  {
    id: 'voucher-shop-overlap',
    icon: '🎟️',
    severity: 40,
    match: ({ ctx }) => {
      const xtra = getFee(ctx.fixedFees, 'shopee_voucher_xtra')
      const shop = getFee(ctx.varFees, 'shopee_voucher_shop')
      if (!xtra || !shop) return false
      const total = (xtra.kind === 'pct' ? xtra.rate : 0) + (shop.kind === 'pct' ? shop.rate : 0)
      return total > 0.08
    },
    build: ({ ctx }) => {
      const xtra = getFee(ctx.fixedFees, 'shopee_voucher_xtra')!
      const shop = getFee(ctx.varFees, 'shopee_voucher_shop')!
      const xtraPct = xtra.kind === 'pct' ? xtra.rate * 100 : 0
      const shopPct = shop.kind === 'pct' ? shop.rate * 100 : 0
      return `Bạn đang chạy CẢ Voucher Xtra (${fmtPct1(xtraPct)}%) và Voucher shop (${fmtPct1(shopPct)}%). Hai voucher có chức năng tương tự — tổng ${fmtPct1(xtraPct + shopPct)}% có thể lãng phí. Test tắt 1 trong 2 trong 1 tuần.`
    },
  },
  {
    id: 'thin-margin-return-risk',
    icon: '↩️',
    severity: 30,
    match: ({ ctx }) => ctx.profitPct > 0 && ctx.profitPct < 5,
    build: ({ ctx, seed }) => {
      const buffer = computeReturnBuffer(
        ctx.costPrice,
        getPackagingFee(ctx.fixedFees),
        estimateNonRefundable(ctx.fixedTotal),
        ctx.profit,
      )
      const variants = [
        `Biên ${fmtPct1(ctx.profitPct)}% nguy hiểm: nếu tỷ lệ hoàn hàng vượt 2-3%, lãi tan hết. Cần kiểm soát chặt chất lượng ảnh + đóng gói.`,
        buffer
          ? `Biên mỏng ${fmtPct1(ctx.profitPct)}% — mỗi đơn hoàn "ngốn" lãi của ${buffer} đơn thành công. Test giảm 1 phí biến đổi để cải thiện đệm an toàn.`
          : `Biên mỏng ${fmtPct1(ctx.profitPct)}% — gần ngưỡng lỗ. Test giảm 1 phí biến đổi để có đệm an toàn.`,
      ]
      return pickVariant(variants, seed + ':thin')
    },
  },
]

// ── Main entry ───────────────────────────────────────────────────

export function generateRecommendation(
  ctx: RecommendationContext,
): RecommendationOutput {
  const targetMargin = ctx.targetMargin ?? 0.15

  const { flatSum: fixedFlat, pctSum: fixedPct } = splitFixedFees(ctx.fixedFees)
  const varPct = sumPctVarFees(ctx.varFees)

  // Tầng 1 — Diagnosis
  const state = diagnoseState(ctx.profit, ctx.profitPct)
  const returnBuffer = computeReturnBuffer(
    ctx.costPrice,
    getPackagingFee(ctx.fixedFees),
    estimateNonRefundable(ctx.fixedTotal),
    ctx.profit,
  )

  const diagnosisTitleByState: Record<RecommendationState, string> = {
    critical:  '🚨 NGUY CẤP — Đang lỗ',
    warning:   '🟠 CẢNH BÁO — Biên cực mỏng',
    caution:   '🟡 LƯU Ý — Biên thấp',
    ok:        '🟢 ỔN — Còn dư địa',
    excellent: '⭐ XUẤT SẮC — Sức khỏe tài chính tốt',
  }
  const diagnosisDescByState: Record<RecommendationState, string> = {
    critical:  `Bạn đang LỖ ${fmtVND(Math.abs(ctx.profit))}/đơn (${fmtPct1(ctx.profitPct)}%). Mỗi đơn bán ra là một đơn ăn vào vốn.`,
    warning:   `Biên lợi nhuận cực mỏng (${fmtPct1(ctx.profitPct)}%).${returnBuffer ? ` Chỉ 1 đơn hoàn = mất lãi của ${returnBuffer} đơn khác.` : ''}`,
    caution:   `Biên lợi nhuận thấp (${fmtPct1(ctx.profitPct)}%). Cần tối ưu để chống chịu rủi ro thị trường.`,
    ok:        `Biên lợi nhuận ổn (${fmtPct1(ctx.profitPct)}%). Vẫn còn dư địa để mở rộng quy mô.`,
    excellent: `Biên lợi nhuận tốt (${fmtPct1(ctx.profitPct)}%). Sản phẩm có sức khỏe tài chính vững.`,
  }

  // Tầng 2 — Goal
  const pTarget = computePTarget(ctx.costPrice, fixedFlat, varPct, fixedPct, targetMargin)
  const pathAFeasible = Number.isFinite(pTarget) && pTarget > 0
  const increasePct = pathAFeasible && ctx.sellPrice > 0
    ? ((pTarget - ctx.sellPrice) / ctx.sellPrice) * 100
    : 0

  // Lộ trình B: maxVarFees để đạt biên target
  // Tại biên m: profit = m * sellPrice → feeTotal_max = sellPrice*(1-m) - costPrice
  // varTotal_max = feeTotal_max - currentFixedTotal
  const feeTotalMax = ctx.sellPrice * (1 - targetMargin) - ctx.costPrice
  const maxVarFees = Math.max(0, feeTotalMax - ctx.fixedTotal)
  const reductionPct = ctx.varTotal > 0
    ? Math.max(0, ((ctx.varTotal - maxVarFees) / ctx.varTotal) * 100)
    : 0
  const pathBFeasible = ctx.varTotal > 0 && maxVarFees < ctx.varTotal && feeTotalMax > 0

  // Tầng 3 — Insights (top 2 by severity)
  const breakEvenACOS = computeBreakEvenACOS(
    ctx.costPrice,
    ctx.feeTotal - (getFee(ctx.varFees, 'shopee_ads')
      ? (() => {
          const ads = getFee(ctx.varFees, 'shopee_ads')!
          return ads.kind === 'pct' ? ads.rate * ctx.revenue : ads.rate
        })()
      : 0),
    ctx.sellPrice,
  )
  const fixedPctOfRevenue = ctx.revenue > 0 ? ctx.fixedTotal / ctx.revenue : 0
  const allFees = [...ctx.fixedFees, ...ctx.varFees]
  const seed = `${ctx.productName ?? ''}:${ctx.costPrice}:${ctx.sellPrice}`
  const insightCtx: InsightCtx = { ctx, allFees, breakEvenACOS, fixedPctOfRevenue, seed }

  const matchedInsights = INSIGHTS
    .filter(rule => rule.match(insightCtx))
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 2)
    .map(rule => ({
      id: rule.id,
      icon: rule.icon,
      text: rule.build(insightCtx),
    }))

  // Tầng 4 — Actions (theo state)
  const actions = buildActions(
    state,
    ctx,
    pTarget,
    increasePct,
    pathAFeasible,
    breakEvenACOS,
  )

  // Break-even price (margin = 0)
  const breakEvenPrice = computePTarget(ctx.costPrice, fixedFlat, varPct, fixedPct, 0)

  return {
    diagnosis: {
      state,
      title: diagnosisTitleByState[state],
      description: diagnosisDescByState[state],
      metrics: {
        profitAmount: ctx.profit,
        profitPct: ctx.profitPct,
        returnBuffer,
      },
    },
    goal: {
      targetMargin,
      pathA: {
        currentPrice: ctx.sellPrice,
        targetPrice: pathAFeasible ? Math.round(pTarget) : 0,
        increasePct: pathAFeasible ? Math.round(increasePct * 10) / 10 : 0,
        feasible: pathAFeasible,
      },
      pathB: {
        currentVarFees: ctx.varTotal,
        maxVarFees: Math.round(maxVarFees),
        reductionPct: Math.round(reductionPct * 10) / 10,
        feasible: pathBFeasible,
      },
    },
    insights: matchedInsights,
    actions,
    meta: {
      breakEvenACOS: Math.round(breakEvenACOS * 10) / 10,
      breakEvenPrice: Number.isFinite(breakEvenPrice) ? Math.round(breakEvenPrice) : 0,
      targetMarginUsed: targetMargin,
    },
  }
}

// ── Action plans (theo state, mỗi action tham chiếu số cụ thể) ──

function buildActions(
  state: RecommendationState,
  ctx: RecommendationContext,
  pTarget: number,
  increasePct: number,
  pTargetFeasible: boolean,
  breakEvenACOS: number,
): Array<{ priority: number; text: string }> {
  const actions: Array<{ priority: number; text: string }> = []

  // Helper — find weakest Xtra để gợi ý tắt
  const xtraFees = ctx.fixedFees.filter(f => f.on && f.id.includes('xtra') && f.kind === 'pct')
  const weakestXtra = xtraFees.slice().sort((a, b) => b.rate - a.rate)[0]
  const xtraSavingPct = weakestXtra ? weakestXtra.rate * 100 : 0
  const xtraSavingAmount = weakestXtra ? Math.round(weakestXtra.rate * ctx.revenue) : 0

  const ads = getFee(ctx.varFees, 'shopee_ads')
  const adsPct = ads && ads.kind === 'pct' ? ads.rate * 100 : 0
  const adsSavingAmount = ads
    ? Math.round((adsPct - breakEvenACOS) / 100 * ctx.revenue)
    : 0

  if (state === 'critical' || state === 'warning') {
    if (pTargetFeasible) {
      actions.push({
        priority: 1,
        text: `Tăng giá bán lên ${fmtVND(Math.round(pTarget))} (+${increasePct.toFixed(1).replace('.', ',')}%) để đạt biên 15%.`,
      })
    } else {
      actions.push({
        priority: 1,
        text: `Cấu trúc phí hiện tại không cho phép đạt biên 15% chỉ bằng tăng giá. Phải cắt giảm phí biến đổi trước (Quảng cáo, Affiliate, Vận hành).`,
      })
    }
    // Sản phẩm giá thấp (<150k) ưu tiên gợi ý Combo trước Xtra/ads.
    if (ctx.sellPrice < 150000) {
      const comboPrice = ctx.sellPrice * 2.5
      actions.push({
        priority: 2,
        text: `Tạo Combo 2-3 sản phẩm (giá Combo ~${fmtVND(Math.round(comboPrice))}) để pha loãng phí cố định trên mỗi đơn — đặc biệt hiệu quả cho sản phẩm giá <150k.`,
      })
    } else if (weakestXtra) {
      actions.push({
        priority: 2,
        text: `Tắt gói "${weakestXtra.name}" (${fmtPct1(xtraSavingPct)}%) cho sản phẩm này — tiết kiệm ~${fmtVND(xtraSavingAmount)}/đơn.`,
      })
    }
    if (ads && breakEvenACOS > 0 && adsPct > breakEvenACOS) {
      actions.push({
        priority: 3,
        text: `Giảm thầu Quảng cáo về ACOS ≤${fmtPct1(breakEvenACOS)}% (đang ${fmtPct1(adsPct)}%) — tiết kiệm ~${fmtVND(Math.max(0, adsSavingAmount))}/đơn.`,
      })
    } else if (!ads) {
      actions.push({
        priority: 3,
        text: `Đàm phán giá vốn xuống ~${fmtVND(Math.round(ctx.costPrice * 0.95))} (-5%) với nhà cung cấp.`,
      })
    }
  } else if (state === 'caution') {
    const comboPrice = ctx.sellPrice * 2.5
    actions.push({
      priority: 1,
      text: `Tạo Combo 2-3 sản phẩm (giá Combo gợi ý ~${fmtVND(Math.round(comboPrice))}) để pha loãng phí cố định trên mỗi đơn.`,
    })
    if (ads) {
      actions.push({
        priority: 2,
        text: `Tối ưu thầu Quảng cáo: giảm 20-30% (từ ${fmtPct1(adsPct)}% về ${fmtPct1(adsPct * 0.75)}%) → đo lại sau 1 tuần.`,
      })
    }
    actions.push({
      priority: 3,
      text: `Đàm phán giá vốn xuống ~${fmtVND(Math.round(ctx.costPrice * 0.95))} (-5%) với nhà cung cấp.`,
    })
  } else {
    // ok / excellent — scale playbook
    if (ads && breakEvenACOS > 0) {
      const scaleAdsPct = Math.min(adsPct + 3, breakEvenACOS - 1)
      actions.push({
        priority: 1,
        text: `Mở rộng quy mô: tăng ngân sách quảng cáo lên ~${fmtPct1(scaleAdsPct)}% (vẫn an toàn vì ACOS hòa vốn ${fmtPct1(breakEvenACOS)}%).`,
      })
    }
    actions.push({
      priority: 2,
      text: `Bán kèm sản phẩm bổ sung biên cao để upsell — gợi ý nhóm phụ kiện liên quan.`,
    })
    actions.push({
      priority: 3,
      text: `Đầu tư vào nội dung video/TikTok để giảm phụ thuộc Quảng cáo Shopee và mở rộng kênh.`,
    })
  }

  return actions.slice(0, 3)
}
