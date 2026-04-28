import type { Fee, Category, DerivedFees } from '@/types/fees'
import type { DefaultFee, CategoryFee } from './fees-admin'

// ── Pure compute (data-agnostic) ─────────────────────────────────

export const computeFee = (fee: Fee, revenue: number): number => {
  if (!fee.on) return 0
  return fee.kind === 'pct' ? revenue * fee.rate : fee.rate
}

export const derive = (
  costPrice: number,
  sellPrice: number,
  fixedFees: Fee[],
  varFees: Fee[]
): DerivedFees => {
  const revenue = sellPrice
  const fixedTotal = fixedFees.reduce((s, f) => s + computeFee(f, revenue), 0)
  const varTotal   = varFees.reduce((s, f) => s + computeFee(f, revenue), 0)
  const feeTotal   = fixedTotal + varTotal
  const profit     = revenue - costPrice - feeTotal
  const profitPct  = revenue > 0 ? (profit / revenue) * 100 : 0
  return { revenue, fixedTotal, varTotal, feeTotal, profit, profitPct }
}

export const GAUGE_SEGMENTS = [
  { id: 0, label: 'Lỗ',       color: '#E24B4A', range: [-Infinity, 0]   },
  { id: 1, label: 'Hòa vốn',  color: '#A8A89E', range: [0, 3]           },
  { id: 2, label: 'Lãi mỏng', color: '#F5B81C', range: [3, 10]          },
  { id: 3, label: 'Lãi tốt',  color: '#3FB37D', range: [10, 20]         },
  { id: 4, label: 'Rất tốt',  color: '#0A6B4E', range: [20, Infinity]   },
] as const

export const segmentForPct = (pct: number): number => {
  for (let i = 0; i < GAUGE_SEGMENTS.length; i++) {
    const [lo, hi] = GAUGE_SEGMENTS[i].range
    if (pct >= lo && pct < hi) return i
  }
  return pct < 0 ? 0 : 4
}

// ── Vietnamese slug helper ────────────────────────────────────────
// "Thời trang" → "thoi-trang", "Ô tô" → "o-to"
export function slugifyVi(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

// ── DB → client mappers ──────────────────────────────────────────
//
// Conversion rules:
// - DB stores percent as 5.00 (human-readable). Client computeFee dùng
//   decimal 0.05. Mapper chia /100 cho fee_unit='percent'.
// - DB stores VND flat as raw number (vd 1650). Client dùng raw → giữ.
// - 'shopee_freeship_xtra_cap' là cap meta-config (50000 VND), không phải
//   phí cộng dồn → default `on=false` để không phá kết quả tính.

const CAP_FEE_KEYS = new Set(['shopee_freeship_xtra_cap'])

export function mapDbFeeToClientFee(dbFee: DefaultFee): Fee {
  const isPct = dbFee.fee_unit === 'percent'
  const rate = isPct ? dbFee.fee_value / 100 : dbFee.fee_value
  return {
    id: dbFee.fee_key,
    name: dbFee.fee_label,
    kind: isPct ? 'pct' : 'flat',
    rate,
    on: !CAP_FEE_KEYS.has(dbFee.fee_key),
    hint: dbFee.description || '',
  }
}

export function mapDbCategoryToClientCategory(dbCategory: CategoryFee): Category {
  return {
    id: slugifyVi(dbCategory.category_name),
    name: dbCategory.category_name,
    adj: dbCategory.fee_value / 100,
  }
}

// "Phí cố định" tổng hợp theo ngành hàng. DB không có row riêng cho
// fee này — rate được rút từ category đang chọn. Synthetic ID giữ
// nguyên 'fixed' để useFeeCalculator override khi đổi ngành.
export function buildSyntheticFixedFee(initialAdj: number): Fee {
  return {
    id: 'fixed',
    name: 'Phí cố định',
    kind: 'pct',
    rate: initialAdj,
    on: true,
    hint: 'Phí Shopee theo ngành hàng (tự cập nhật khi đổi ngành)',
  }
}
