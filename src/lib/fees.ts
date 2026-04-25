import type { Fee, Category, DerivedFees } from '@/types/fees'

export const DEFAULT_FIXED_FEES: Fee[] = [
  { id: 'fixed',     name: 'Phí cố định',     kind: 'pct',  rate: 0.07,  on: true,  hint: '7% trên doanh thu' },
  { id: 'payment',   name: 'Phí thanh toán',   kind: 'pct',  rate: 0.05,  on: true,  hint: '5% trên doanh thu' },
  { id: 'freeship',  name: 'Freeship Xtra',    kind: 'pct',  rate: 0.06,  on: true,  hint: '6% trợ giá vận chuyển' },
  { id: 'content',   name: 'Content Xtra',     kind: 'pct',  rate: 0.03,  on: false, hint: '3% gói nội dung' },
  { id: 'voucher_x', name: 'Voucher Xtra',     kind: 'pct',  rate: 0.03,  on: true,  hint: '3% chương trình voucher' },
  { id: 'pi_ship',   name: 'Pi Ship',          kind: 'flat', rate: 2500,  on: true,  hint: 'Phí Pi Ship / đơn' },
  { id: 'infra',     name: 'Hạ tầng',          kind: 'flat', rate: 1500,  on: true,  hint: 'Phí hạ tầng / đơn' },
  { id: 'tax',       name: 'Thuế',             kind: 'pct',  rate: 0.015, on: true,  hint: '1.5% thuế TNCN + GTGT' },
]

export const DEFAULT_VAR_FEES: Fee[] = [
  { id: 'ads',          name: 'Phí quảng cáo',   kind: 'pct',  rate: 0.05, on: true, hint: '5% ngân sách Ads' },
  { id: 'voucher_shop', name: 'Voucher shop',      kind: 'pct',  rate: 0.03, on: true, hint: '3% voucher của shop' },
  { id: 'ops',          name: 'Vận hành / đơn',   kind: 'flat', rate: 4000, on: true, hint: 'Đóng gói + nhân sự' },
  { id: 'aff',          name: 'Affiliate',         kind: 'pct',  rate: 0.05, on: true, hint: '5% hoa hồng CTV' },
  { id: 'other',        name: 'Chi phí khác',      kind: 'pct',  rate: 0.03, on: true, hint: '3% dự phòng' },
]

export const CATEGORIES: Category[] = [
  { id: 'auto',        name: 'Ô tô',       adj: 0.07  },
  { id: 'fashion',     name: 'Thời trang', adj: 0.04  },
  { id: 'electronics', name: 'Điện tử',    adj: 0.03  },
  { id: 'beauty',      name: 'Mỹ phẩm',   adj: 0.04  },
  { id: 'home',        name: 'Gia dụng',   adj: 0.045 },
  { id: 'food',        name: 'Thực phẩm',  adj: 0.035 },
]

export const FEE_EXPLAIN: Record<string, string> = {
  fixed:        'Mặc định cho tất cả đơn hàng',
  payment:      'Mặc định cho tất cả đơn hàng',
  freeship:     'Tối đa 50.000đ — áp dụng cho Shop Mall',
  content:      'Shop thường không giới hạn, Shop Mall tối đa 50k',
  voucher_x:    'Tối đa 50.000đ giá trị đơn hàng',
  pi_ship:      'Phí tính trên tất cả đơn hàng đã bàn giao đơn vị vận chuyển',
  infra:        'Phí tính trên tất cả đơn hàng thành công',
  tax:          'Nếu là công ty thì tự khai và điền mức thuế khác',
  ads:          'Quảng cáo trên Shopee, thường nằm 5–10% so với tổng doanh số',
  voucher_shop: 'Voucher Shopee tài trợ — % so với doanh số shop',
  ops:          'Mặt bằng, nhân viên, điện nước, nguyên vật liệu đóng gói…',
  aff:          'Chi phí chương trình Tiếp Thị Liên Kết',
  other:        'Các chi phí khác dự kiến — % theo doanh số',
}

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
