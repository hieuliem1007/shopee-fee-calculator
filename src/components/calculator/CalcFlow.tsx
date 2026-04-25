import { fmtVND } from '@/lib/utils'

interface Props {
  revenue: number
  costPrice: number
  fixedTotal: number
  varTotal: number
  profit: number
}

function Row({ label, value, color, weight = 500, op, divider, accent }: {
  label: string; value: string; color?: string; weight?: number
  op?: '−' | '=' | '+'; divider?: boolean; accent?: boolean
}) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '10px 0',
      borderTop: divider ? '1px solid #EFEAE0' : 'none',
    }}>
      <span style={{ fontSize: 13, color: '#1A1A1A', fontWeight: weight, display: 'flex', alignItems: 'center', gap: 8 }}>
        {op && (
          <span style={{
            width: 18, height: 18, borderRadius: 4,
            background: op === '−' ? '#FCE5E4' : op === '=' ? '#FAF6E8' : '#F5F2EA',
            color: op === '−' ? '#A82928' : op === '=' ? '#A47408' : '#6B6B66',
            fontSize: 11, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>{op}</span>
        )}
        {label}
      </span>
      <span style={{
        fontSize: accent ? 18 : 14, fontWeight: weight,
        color: color || '#1A1A1A',
        fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
      }}>{value}</span>
    </div>
  )
}

export function CalcFlow({ revenue, costPrice, fixedTotal, varTotal, profit }: Props) {
  const profitColor = profit >= 0 ? '#1D9E75' : '#E24B4A'
  const grossMargin = revenue - costPrice

  return (
    <div style={{
      background: 'linear-gradient(180deg, #FFFBF0 0%, #FFFFFF 100%)',
      border: '1px solid #F5E5B8', borderRadius: 14,
      padding: '8px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      alignSelf: 'start', position: 'sticky', top: 76,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
        color: '#A47408', textTransform: 'uppercase',
        padding: '12px 0 4px', display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#F5B81C' }} />
        Dòng tính lợi nhuận
      </div>
      <Row label="Doanh thu" value={fmtVND(revenue)} weight={600} />
      <Row label="Giá vốn sản phẩm" value={fmtVND(costPrice)} op="−" divider />
      <Row label="Lãi gộp" value={fmtVND(grossMargin)}
        color={grossMargin >= 0 ? '#1D9E75' : '#E24B4A'}
        weight={600} op="=" divider accent />
      <Row label="Tổng phí cố định" value={fmtVND(fixedTotal)} op="−" divider />
      <Row label="Tổng phí biến đổi" value={fmtVND(varTotal)} op="−" />
      <Row label="Lợi nhuận ròng" value={fmtVND(profit)}
        color={profitColor} weight={700} op="=" divider accent />
    </div>
  )
}
