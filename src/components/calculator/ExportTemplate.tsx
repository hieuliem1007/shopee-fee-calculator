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
  color: string
  labelActive: string
}

// Index 0..4 phải khớp GAUGE_SEGMENTS trong lib/fees.ts (Lỗ → Rất tốt).
// Dùng opacity thay vì 2 màu (active/inactive) — match pattern ProfitGauge,
// tránh bug pale-color blend với card background (vd Rất tốt #E1F5EE trùng hero bg).
const SEG_CONFIG: SegConfig[] = [
  { label: 'Lỗ',        color: '#E24B4A', labelActive: '#A82928' },
  { label: 'Hòa vốn',   color: '#A8A89E', labelActive: '#5F5E5A' },
  { label: 'Lãi mỏng',  color: '#F5B81C', labelActive: '#854F0B' },
  { label: 'Lãi tốt',   color: '#3FB37D', labelActive: '#3F6B14' },
  { label: 'Rất tốt',   color: '#0A6B4E', labelActive: '#0A6B4E' },
]

const INACTIVE_OPACITY = 0.28

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

// Style chung cho mọi giá trị số/% — đảm bảo tabular-nums render đều,
// không bị letter-spacing default tạo gap quanh dấu chấm hay dấu %.
const NUMERIC_STYLE: React.CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  fontFeatureSettings: '"tnum" 1',
  letterSpacing: 0,
}

const AMOUNT_COL_MIN_WIDTH = 110

function formatRate(fee: ExportFee): string {
  if (fee.kind === 'pct') return `${(fee.rate * 100).toFixed(2).replace(/\.?0+$/, '')}%`
  return fmtVND(fee.rate)
}

// Đợt A.5 — format % theo style Việt Nam (dấu phẩy thay chấm), 2 chữ số.
// Đồng bộ với fmtPct trong lib/utils.ts (Đợt A app dùng).
function formatPctVN(n: number): string {
  return n.toFixed(2).replace('.', ',') + '%'
}

function formatPctSignedVN(n: number): string {
  return (n > 0 ? '+' : '') + n.toFixed(2).replace('.', ',') + '%'
}

function FeeRow({ fee, revenue }: { fee: ExportFee; revenue: number }) {
  // Đợt A.5 — fee kind='flat': % gộp vào cột rate (Phương án 1) để cột amount
  // căn phải đồng đều giữa fee flat và fee %. Vd: "Hạ tầng (3.000đ ~ 0,75%)" +
  // amount "3.000đ" (chỉ số tiền). Fee kind='pct' giữ nguyên: "Voucher Xtra (6%)" +
  // amount "24.000đ". Edge: revenue=0 → flat label chỉ "(3.000đ)" không hiện %.
  const rateLabel = fee.kind === 'flat' && revenue > 0
    ? `${formatRate(fee)} ~ ${formatPctVN((fee.amount / revenue) * 100)}`
    : formatRate(fee)
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 12,
      padding: '9px 0', fontSize: 13,
    }}>
      <div style={{
        color: '#2C2C2A', flex: 1, minWidth: 0,
        whiteSpace: 'nowrap',
      }}>
        {fee.name} <span style={{ color: '#888780', fontSize: 12 }}>({rateLabel})</span>
      </div>
      <div style={{
        ...NUMERIC_STYLE,
        color: '#2C2C2A', fontWeight: 500,
        whiteSpace: 'nowrap', flexShrink: 0,
        minWidth: AMOUNT_COL_MIN_WIDTH, textAlign: 'right',
      }}>
        {fmtVND(fee.amount)}
      </div>
    </div>
  )
}

function FeeTotalRow({ label, amount, accent }: { label: string; amount: number; accent: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 12,
      marginTop: 4, paddingTop: 12, paddingBottom: 4,
      borderTop: '1px solid #D3D1C7',
      fontSize: 14, fontWeight: 500,
    }}>
      <div style={{
        color: accent, flex: 1, minWidth: 0,
        whiteSpace: 'nowrap',
      }}>{label}</div>
      <div style={{
        ...NUMERIC_STYLE,
        color: accent, whiteSpace: 'nowrap', flexShrink: 0,
        minWidth: AMOUNT_COL_MIN_WIDTH, textAlign: 'right',
      }}>{fmtVND(amount)}</div>
    </div>
  )
}

function SectionBar({ color }: { color: string }) {
  return <div style={{ width: 4, height: 16, background: color, borderRadius: 2, flexShrink: 0 }} />
}

function FlowRow({ label, value, revenue, color, sign, bold, size = 13 }: {
  label: string; value: number; revenue: number
  color?: string; sign?: '−' | '='; bold?: boolean; size?: number
}) {
  // Đợt A.5 — thêm "(X,XX%)" sau giá trị (đồng bộ với CalcFlow trong app).
  // revenue=0 → ẩn pct (defensive, không hiển thị NaN/Infinity).
  const pctText = revenue > 0 ? `(${formatPctVN((value / revenue) * 100)})` : null
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 12,
      padding: '6px 0', fontSize: size,
    }}>
      <div style={{
        color: color ?? '#2C2C2A', fontWeight: bold ? 500 : 400,
        flex: 1, minWidth: 0,
        whiteSpace: 'nowrap',
      }}>
        {sign ? <span style={{ marginRight: 6, color: '#7A6038' }}>{sign}</span> : null}
        {label}
      </div>
      <div style={{
        ...NUMERIC_STYLE,
        color: color ?? '#2C2C2A', fontWeight: bold ? 500 : 400,
        whiteSpace: 'nowrap', flexShrink: 0,
        minWidth: AMOUNT_COL_MIN_WIDTH, textAlign: 'right',
      }}>
        {fmtVND(value)}
        {pctText && (
          <span style={{
            marginLeft: 6, fontSize: size - 2, fontWeight: 400, color: '#888780',
          }}>{pctText}</span>
        )}
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

  // Đợt A.5 — defensive cho edge case revenue=0 (ít khả năng vì user export
  // sau khi đã có kết quả, nhưng vẫn handle để KHÔNG crash + KHÔNG hiển thị NaN).
  const isEmpty = inputs.sellPrice <= 0 || inputs.costPrice <= 0
  const costPricePctOfRevenue = inputs.sellPrice > 0 ? (inputs.costPrice / inputs.sellPrice) * 100 : 0

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{
            ...NUMERIC_STYLE,
            fontSize: 32, fontWeight: 500, color: profitColor,
            lineHeight: 1.2,
          }}>
            {fmtVND(results.profit)}
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: pillBg, color: pillColor,
            height: 26, padding: '0 12px', borderRadius: 999,
            fontSize: 14, fontWeight: 500, lineHeight: 1,
            flexShrink: 0, whiteSpace: 'nowrap', letterSpacing: 0,
          }}>
            {pillSign}{Math.abs(results.profitPct).toFixed(2)}%
          </span>
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

          {/* Bar — flex theo GAUGE_FLEX, opacity cho inactive segments */}
          <div style={{
            display: 'flex', gap: 2, height: 10,
            borderRadius: 5, overflow: 'hidden',
          }}>
            {SEG_CONFIG.map((seg, i) => (
              <div key={i} style={{
                flex: GAUGE_FLEX[i],
                background: seg.color,
                opacity: i === activeIndex ? 1 : INACTIVE_OPACITY,
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

      {/* SECTION 4 — 4 KPI cards (2x2 đều width)
          Đợt A.5 — đồng bộ với UI live: subtitle % cho Doanh thu/Giá vốn/Tổng chi phí,
          cột 4 đổi từ "% PHÍ/DT" thành "LỢI NHUẬN RÒNG %" (đỏ < 0, xanh > 0). */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10,
        margin: '0 28px 24px',
      }}>
        {[
          {
            label: 'DOANH THU',
            value: fmtVND(inputs.sellPrice),
            subtitle: isEmpty ? null : '100% gốc',
            valueColor: '#2C2C2A',
          },
          {
            label: 'GIÁ VỐN',
            value: fmtVND(inputs.costPrice),
            subtitle: isEmpty ? null : `${formatPctVN(costPricePctOfRevenue)} doanh thu`,
            valueColor: '#2C2C2A',
          },
          {
            label: 'TỔNG CHI PHÍ',
            value: fmtVND(results.totalCost),
            subtitle: isEmpty ? null : `${formatPctVN(results.costPct)} doanh thu`,
            valueColor: '#2C2C2A',
          },
          {
            label: 'LỢI NHUẬN RÒNG %',
            value: isEmpty ? '—' : formatPctSignedVN(results.profitPct),
            subtitle: isEmpty ? null : 'trên doanh thu',
            valueColor: isEmpty ? '#2C2C2A' : (isProfit ? '#1D9E75' : '#A82928'),
          },
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
              ...NUMERIC_STYLE,
              fontSize: 18, fontWeight: 500, color: kpi.valueColor,
              whiteSpace: 'nowrap',
            }}>{kpi.value}</div>
            {kpi.subtitle && (
              <div style={{
                ...NUMERIC_STYLE,
                fontSize: 10, color: '#888780', marginTop: 4,
                whiteSpace: 'nowrap', fontWeight: 400,
              }}>{kpi.subtitle}</div>
            )}
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
            background: '#FAEEDA', boxSizing: 'border-box',
            height: 22, padding: '0 12px 4px', borderRadius: 11,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, lineHeight: 1, whiteSpace: 'nowrap',
            fontWeight: 500, letterSpacing: 0,
          }}>
            {fixedFeesActiveCount}/{fixedFeesTotalCount} áp dụng
          </div>
        </div>
        {fixedFees.length === 0 ? (
          <div style={{ fontSize: 13, color: '#888780', padding: '8px 0' }}>
            Không có phí cố định nào được bật.
          </div>
        ) : (
          fixedFees.map(f => <FeeRow key={f.id} fee={f} revenue={inputs.sellPrice} />)
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
            background: '#E6F1FB', boxSizing: 'border-box',
            height: 22, padding: '0 12px 4px', borderRadius: 11,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, lineHeight: 1, whiteSpace: 'nowrap',
            fontWeight: 500, letterSpacing: 0,
          }}>
            {variableFeesActiveCount}/{variableFeesTotalCount} áp dụng
          </div>
        </div>
        {variableFees.length === 0 ? (
          <div style={{ fontSize: 13, color: '#888780', padding: '8px 0' }}>
            Không có phí biến đổi nào được bật.
          </div>
        ) : (
          variableFees.map(f => <FeeRow key={f.id} fee={f} revenue={inputs.sellPrice} />)
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
        <FlowRow label="Doanh thu" value={inputs.sellPrice} revenue={inputs.sellPrice} />
        <FlowRow label="Giá vốn sản phẩm" value={inputs.costPrice} revenue={inputs.sellPrice} sign="−" />
        <div style={{ borderTop: '1px solid #EF9F27', marginTop: 4 }} />
        <FlowRow label="Lãi gộp" value={grossProfit} revenue={inputs.sellPrice} color="#1D9E75" sign="=" bold />
        <FlowRow label="Tổng phí cố định" value={totalFixedFees} revenue={inputs.sellPrice} sign="−" />
        <FlowRow label="Tổng phí biến đổi" value={totalVariableFees} revenue={inputs.sellPrice} sign="−" />
        <div style={{ borderTop: '2px solid #EF9F27', marginTop: 6 }} />
        <FlowRow
          label="LỢI NHUẬN RÒNG"
          value={results.profit}
          revenue={inputs.sellPrice}
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
