// Off-screen single-column 800px template dùng cho PNG/PDF export.
// App UI 3-cột giữ nguyên — template này chỉ render khi user click export.

import { fmtVND } from '@/lib/utils'
import { segmentForPct } from '@/lib/fees'
import { GAUGE_FLEX, getGaugePointerPct } from '@/lib/gauge-utils'

export interface ExportFee {
  id: string
  name: string
  rate: number
  kind: 'pct' | 'flat'
  amount: number
}

export interface ExportTemplateProps {
  productName: string
  category: string
  shopType: string
  businessType: string
  inputs: { costPrice: number; sellPrice: number }
  results: { profit: number; profitPct: number; totalCost: number; costPct: number }
  fixedFees: ExportFee[]
  variableFees: ExportFee[]
  totalFixedFees: number
  totalVariableFees: number
  fixedFeesActiveCount: number
  fixedFeesTotalCount: number
  variableFeesActiveCount: number
  variableFeesTotalCount: number
  exportDate: string
}

interface SegConfig {
  label: string
  active: string
  inactive: string
  labelActive: string
}

// Index 0..4 phải khớp GAUGE_SEGMENTS trong lib/fees.ts (Lỗ → Rất tốt).
const SEG_CONFIG: SegConfig[] = [
  { label: 'Lỗ',        active: '#F0997B', inactive: '#FCEBEB', labelActive: '#A82928' },
  { label: 'Hòa vốn',   active: '#B4B2A9', inactive: '#F1EFE8', labelActive: '#5F5E5A' },
  { label: 'Lãi mỏng',  active: '#EF9F27', inactive: '#FAEEDA', labelActive: '#854F0B' },
  { label: 'Lãi tốt',   active: '#97C459', inactive: '#EAF3DE', labelActive: '#3F6B14' },
  { label: 'Rất tốt',   active: '#1D9E75', inactive: '#E1F5EE', labelActive: '#0F6E56' },
]

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

function formatRate(fee: ExportFee): string {
  if (fee.kind === 'pct') return `${(fee.rate * 100).toFixed(2).replace(/\.?0+$/, '')}%`
  return fmtVND(fee.rate)
}

function FeeRow({ fee }: { fee: ExportFee }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12,
      padding: '7px 0', borderBottom: '0.5px solid #F1EFE8', fontSize: 13,
    }}>
      <div style={{ color: '#2C2C2A', minWidth: 0, flex: 1 }}>
        {fee.name} <span style={{ color: '#888780', fontSize: 12 }}>({formatRate(fee)})</span>
      </div>
      <div style={{
        color: '#2C2C2A', fontWeight: 500,
        fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', flexShrink: 0,
      }}>
        {fmtVND(fee.amount)}
      </div>
    </div>
  )
}

function FeeTotalRow({ label, amount, accent }: { label: string; amount: number; accent: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12,
      marginTop: 4, paddingTop: 12, paddingBottom: 4,
      borderTop: '1px solid #D3D1C7',
      fontSize: 14, fontWeight: 500,
    }}>
      <div style={{ color: accent, minWidth: 0, flex: 1 }}>{label}</div>
      <div style={{
        color: accent, fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap', flexShrink: 0,
      }}>{fmtVND(amount)}</div>
    </div>
  )
}

function SectionBar({ color }: { color: string }) {
  return <div style={{ width: 4, height: 16, background: color, borderRadius: 2, flexShrink: 0 }} />
}

function FlowRow({ label, value, color, sign, bold, size = 13 }: {
  label: string; value: number; color?: string; sign?: '−' | '='; bold?: boolean; size?: number
}) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12,
      padding: '6px 0', fontSize: size,
    }}>
      <div style={{ color: color ?? '#2C2C2A', fontWeight: bold ? 500 : 400, minWidth: 0, flex: 1 }}>
        {sign ? <span style={{ marginRight: 6, color: '#7A6038' }}>{sign}</span> : null}
        {label}
      </div>
      <div style={{
        color: color ?? '#2C2C2A', fontWeight: bold ? 500 : 400,
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap', flexShrink: 0,
      }}>
        {fmtVND(value)}
      </div>
    </div>
  )
}

export function ExportTemplate(props: ExportTemplateProps) {
  const {
    productName, category, shopType, businessType,
    inputs, results,
    fixedFees, variableFees,
    totalFixedFees, totalVariableFees,
    fixedFeesActiveCount, fixedFeesTotalCount,
    variableFeesActiveCount, variableFeesTotalCount,
    exportDate,
  } = props

  const isProfit = results.profit >= 0
  const profitColor = isProfit ? '#04342C' : '#A82928'
  const pillBg = '#FFFFFF'
  const pillColor = isProfit ? '#1D9E75' : '#A82928'
  const pillSign = isProfit ? '+' : '−'
  const grossProfit = inputs.sellPrice - inputs.costPrice

  const fixedPct = inputs.sellPrice > 0 ? (totalFixedFees / inputs.sellPrice * 100) : 0
  const varPct = inputs.sellPrice > 0 ? (totalVariableFees / inputs.sellPrice * 100) : 0

  // Tỷ lệ thực giống ProfitGauge — ngưỡng GAUGE_SEGMENTS, scale [-10, 30].
  const activeIndex = segmentForPct(results.profitPct)
  const pointerPct = getGaugePointerPct(results.profitPct)

  return (
    <div style={{
      width: 800, background: '#FFFFFF',
      borderRadius: 12, overflow: 'hidden',
      fontFamily: FONT, color: '#2C2C2A',
    }}>
      {/* SECTION 1 — banner */}
      <div style={{
        background: '#FAEEDA', borderBottom: '2px solid #EF9F27',
        padding: '18px 28px', display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10, background: '#EF9F27',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#FFFFFF', fontSize: 22, fontWeight: 500,
        }}>E</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#412402' }}>E-Dream Tools</div>
          <div style={{ fontSize: 12, color: '#633806', marginTop: 2 }}>
            Tính phí Shopee chính xác · {exportDate} · edream.vn
          </div>
        </div>
      </div>

      {/* SECTION 2 — product info */}
      <div style={{ padding: '24px 28px 16px' }}>
        <div style={{
          fontSize: 11, letterSpacing: '0.5px', color: '#888780',
          textTransform: 'uppercase', marginBottom: 6,
        }}>SẢN PHẨM</div>
        <div style={{ fontSize: 18, fontWeight: 500, color: '#2C2C2A', marginBottom: 4 }}>
          {productName || '(chưa đặt tên)'}
        </div>
        <div style={{ fontSize: 13, color: '#5F5E5A' }}>
          Ngành: {category} · Loại shop: {shopType} · Hình thức: {businessType}
        </div>
      </div>

      {/* SECTION 3 — hero profit + gauge */}
      <div style={{
        background: '#E1F5EE', borderRadius: 12,
        padding: '20px 24px', margin: '0 28px 16px',
      }}>
        <div style={{
          fontSize: 12, letterSpacing: '0.5px', color: '#0F6E56',
          textTransform: 'uppercase', marginBottom: 8, fontWeight: 500,
        }}>LỢI NHUẬN RÒNG</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
          <div style={{
            fontSize: 32, fontWeight: 500, color: profitColor,
            fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
            lineHeight: 1.1,
          }}>
            {fmtVND(results.profit)}
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            background: pillBg, color: pillColor,
            padding: '4px 10px', borderRadius: 20,
            fontSize: 14, fontWeight: 500, fontVariantNumeric: 'tabular-nums',
            flexShrink: 0, whiteSpace: 'nowrap',
          }}>
            {pillSign}{Math.abs(results.profitPct).toFixed(2)}%
          </div>
        </div>

        {/* Gauge — chia theo ngưỡng + pointer theo tỷ lệ thực */}
        <div style={{ position: 'relative', paddingTop: 16, marginTop: 14 }}>
          {/* Triangle pointer */}
          <div style={{
            position: 'absolute', top: 0,
            left: `${pointerPct}%`,
            transform: 'translateX(-50%)',
            width: 14, height: 14, lineHeight: 0,
          }}>
            <svg width={14} height={14} viewBox="0 0 14 14">
              <path d="M 7 14 L 0 0 L 14 0 Z" fill="#2C2C2A" />
            </svg>
          </div>

          {/* Bar — flex theo GAUGE_FLEX */}
          <div style={{
            display: 'flex', gap: 2, height: 10,
            borderRadius: 5, overflow: 'hidden',
          }}>
            {SEG_CONFIG.map((seg, i) => (
              <div key={i} style={{
                flex: GAUGE_FLEX[i],
                background: i === activeIndex ? seg.active : seg.inactive,
                borderRadius: 5,
              }} />
            ))}
          </div>

          {/* Labels — cùng flex weight để label canh tâm dưới segment tương ứng */}
          <div style={{
            display: 'flex', gap: 2, marginTop: 8,
            fontSize: 11, textAlign: 'center',
          }}>
            {SEG_CONFIG.map((seg, i) => (
              <div key={i} style={{
                flex: GAUGE_FLEX[i],
                color: i === activeIndex ? seg.labelActive : '#B4B2A9',
                fontWeight: i === activeIndex ? 500 : 400,
              }}>
                {seg.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 4 — 4 KPI cards (2x2 đều width) */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10,
        margin: '0 28px 24px',
      }}>
        {[
          { label: 'DOANH THU',          value: fmtVND(inputs.sellPrice) },
          { label: 'GIÁ VỐN',            value: fmtVND(inputs.costPrice) },
          { label: 'TỔNG CHI PHÍ',       value: fmtVND(results.totalCost) },
          { label: '% PHÍ / DOANH THU',  value: `${results.costPct.toFixed(2)}%` },
        ].map((kpi, i) => (
          <div key={i} style={{
            background: '#F1EFE8', borderRadius: 8, padding: '14px 16px',
            minWidth: 0,
          }}>
            <div style={{
              fontSize: 11, color: '#5F5E5A', textTransform: 'uppercase',
              letterSpacing: '0.04em', marginBottom: 4,
            }}>{kpi.label}</div>
            <div style={{
              fontSize: 18, fontWeight: 500, color: '#2C2C2A',
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* SECTION 5 — phí cố định */}
      <div style={{ margin: '0 28px 24px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #D3D1C7',
        }}>
          <SectionBar color="#EF9F27" />
          <div style={{ fontSize: 14, fontWeight: 500, color: '#2C2C2A' }}>
            PHÍ CỐ ĐỊNH (Phí sàn Shopee)
          </div>
          <div style={{
            marginLeft: 'auto', fontSize: 11, color: '#854F0B',
            background: '#FAEEDA', padding: '3px 10px', borderRadius: 10,
            display: 'inline-flex', alignItems: 'center', flexShrink: 0,
            fontVariantNumeric: 'tabular-nums', fontWeight: 500,
          }}>
            {fixedFeesActiveCount}/{fixedFeesTotalCount} áp dụng
          </div>
        </div>
        {fixedFees.length === 0 ? (
          <div style={{ fontSize: 13, color: '#888780', padding: '8px 0' }}>
            Không có phí cố định nào được bật.
          </div>
        ) : (
          fixedFees.map(f => <FeeRow key={f.id} fee={f} />)
        )}
        <FeeTotalRow
          label={`TỔNG CỐ ĐỊNH (${fixedPct.toFixed(2)}% doanh thu)`}
          amount={totalFixedFees}
          accent="#854F0B"
        />
      </div>

      {/* SECTION 6 — phí biến đổi */}
      <div style={{ margin: '0 28px 24px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #D3D1C7',
        }}>
          <SectionBar color="#378ADD" />
          <div style={{ fontSize: 14, fontWeight: 500, color: '#2C2C2A' }}>
            PHÍ BIẾN ĐỔI (Chi phí ngoài sàn)
          </div>
          <div style={{
            marginLeft: 'auto', fontSize: 11, color: '#1F5C8C',
            background: '#E6F1FB', padding: '3px 10px', borderRadius: 10,
            display: 'inline-flex', alignItems: 'center', flexShrink: 0,
            fontVariantNumeric: 'tabular-nums', fontWeight: 500,
          }}>
            {variableFeesActiveCount}/{variableFeesTotalCount} áp dụng
          </div>
        </div>
        {variableFees.length === 0 ? (
          <div style={{ fontSize: 13, color: '#888780', padding: '8px 0' }}>
            Không có phí biến đổi nào được bật.
          </div>
        ) : (
          variableFees.map(f => <FeeRow key={f.id} fee={f} />)
        )}
        <FeeTotalRow
          label={`TỔNG BIẾN ĐỔI (${varPct.toFixed(2)}% doanh thu)`}
          amount={totalVariableFees}
          accent="#1F5C8C"
        />
      </div>

      {/* SECTION 7 — flow */}
      <div style={{
        background: '#FAEEDA', borderRadius: 12,
        padding: '18px 24px', margin: '0 28px 16px',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
        }}>
          <SectionBar color="#BA7517" />
          <div style={{ fontSize: 14, fontWeight: 500, color: '#412402' }}>
            DÒNG TÍNH LỢI NHUẬN
          </div>
        </div>
        <FlowRow label="Doanh thu" value={inputs.sellPrice} />
        <FlowRow label="Giá vốn sản phẩm" value={inputs.costPrice} sign="−" />
        <div style={{ borderTop: '1px solid #EF9F27', marginTop: 4 }} />
        <FlowRow label="Lãi gộp" value={grossProfit} color="#1D9E75" sign="=" bold />
        <FlowRow label="Tổng phí cố định" value={totalFixedFees} sign="−" />
        <FlowRow label="Tổng phí biến đổi" value={totalVariableFees} sign="−" />
        <div style={{ borderTop: '2px solid #EF9F27', marginTop: 6 }} />
        <FlowRow
          label="LỢI NHUẬN RÒNG"
          value={results.profit}
          color={isProfit ? '#1D9E75' : '#A82928'}
          sign="="
          bold
          size={16}
        />
      </div>

      {/* SECTION 8 — footer */}
      <div style={{
        padding: '14px 28px', borderTop: '1px solid #D3D1C7',
        background: '#F1EFE8',
        display: 'flex', justifyContent: 'space-between',
        fontSize: 11, color: '#5F5E5A',
      }}>
        <div>Powered by E-Dream Tools · edream.vn</div>
        <div>Tài liệu được tạo tự động từ kết quả tính phí</div>
      </div>
    </div>
  )
}
