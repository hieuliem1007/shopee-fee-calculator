// Reconstruct Calculator-shaped Fee[] từ fees_snapshot đã lưu trong DB.
// Snapshot từ M6.7 trở đi có field `group: 'fixed' | 'var'`. Dữ liệu cũ
// (pre-M6.7) thiếu group → fallback heuristic (xem getGroup).

import type { Fee, FeeKind } from '@/types/fees'

export interface FeeSnapshotItem {
  id: string
  label: string
  value: number          // percent dạng 5.00 hoặc VND raw
  unit: 'percent' | 'vnd'
  on: boolean
  custom?: boolean
  group?: 'fixed' | 'var'
  hint?: string
}

// Set fee_key biến đổi theo default_fees DB. Fallback dùng cho saved cũ.
const VAR_KEYS = new Set([
  'shopee_ads',
  'shopee_affiliate',
  'shopee_operation',
  'shopee_other',
  'shopee_voucher_shop',
])

function getGroup(item: FeeSnapshotItem): 'fixed' | 'var' {
  if (item.group) return item.group
  if (item.id === 'fixed') return 'fixed'
  if (VAR_KEYS.has(item.id)) return 'var'
  // Custom fee không xác định → mặc định fixed (an toàn vì custom thêm bằng tay).
  return 'fixed'
}

function toFee(item: FeeSnapshotItem): Fee {
  const kind: FeeKind = item.unit === 'percent' ? 'pct' : 'flat'
  const rate = item.unit === 'percent' ? item.value / 100 : item.value
  return {
    id: item.id,
    name: item.label,
    kind,
    rate,
    on: item.on,
    hint: item.hint ?? '',
    custom: item.custom ?? false,
  }
}

export interface SplitFees {
  fixedFees: Fee[]
  varFees: Fee[]
}

export function splitFeesFromSnapshot(snapshot: FeeSnapshotItem[]): SplitFees {
  const fixedFees: Fee[] = []
  const varFees: Fee[] = []
  for (const item of snapshot) {
    const fee = toFee(item)
    if (getGroup(item) === 'fixed') fixedFees.push(fee)
    else varFees.push(fee)
  }
  return { fixedFees, varFees }
}
