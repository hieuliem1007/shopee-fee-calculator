import { fmtVND, fmtPct } from '@/lib/utils'

interface Props {
  revenue: number
  costPrice: number
  fixedTotal: number
  varTotal: number
  profit: number
  // Calculator dùng sticky trong sidebar grid; Saved/Share single-column
  // → tắt sticky để không che nội dung phía dưới khi scroll.
  sticky?: boolean
}

function Row({ label, value, pctText, color, weight = 500, op, divider, accent }: {
  label: string; value: string; pctText?: string
  color?: string; weight?: number
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
        display: 'inline-flex', alignItems: 'baseline', gap: 6,
      }}>
        {value}
        {pctText && (
          <span style={{
            fontSize: accent ? 12 : 11, fontWeight: 500, color: '#A8A89E',
          }}>({pctText})</span>
        )}
      </span>
    </div>
  )
}

export function CalcFlow({ revenue, costPrice, fixedTotal, varTotal, profit, sticky = true }: Props) {
  const isEmpty = costPrice <= 0 || revenue <= 0
  const profitColor = profit >= 0 ? '#1D9E75' : '#E24B4A'
  const grossMargin = revenue - costPrice

  // % so với doanh thu cho mỗi dòng. Khi revenue=0 → '—' (không tính được).
  const pctOf = (n: number): string => revenue > 0 ? fmtPct((n / revenue) * 100) : '—'
  const valueOf = (n: number): string => isEmpty ? '—' : fmtVND(n)
  // Khi empty: ẩn pctText (KHÔNG hiển thị "(—)") để dòng gọn hơn.
  const pctOrUndef = (n: number): string | undefined => isEmpty ? undefined : pctOf(n)

  return (
    <div style={{
      background: 'linear-gradient(180deg, #FFFBF0 0%, #FFFFFF 100%)',
      border: '1px solid #F5E5B8', borderRadius: 14,
      padding: '8px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      alignSelf: 'start',
      ...(sticky ? { position: 'sticky' as const, top: 76 } : {}),
    }}>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
        color: '#A47408', textTransform: 'uppercase',
        padding: '12px 0 4px', display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#F5B81C' }} />
        Dòng tính lợi nhuận
      </div>
      <Row label="Doanh thu" value={valueOf(revenue)}
        pctText={isEmpty ? undefined : '100%'} weight={600} />
      <Row label="Giá vốn sản phẩm" value={valueOf(costPrice)}
        pctText={pctOrUndef(costPrice)} op="−" divider />
      <Row label="Lãi gộp" value={valueOf(grossMargin)}
        pctText={pctOrUndef(grossMargin)}
        color={isEmpty ? undefined : (grossMargin >= 0 ? '#1D9E75' : '#E24B4A')}
        weight={600} op="=" divider accent />
      <Row label="Tổng phí cố định" value={valueOf(fixedTotal)}
        pctText={pctOrUndef(fixedTotal)} op="−" divider />
      <Row label="Tổng phí biến đổi" value={valueOf(varTotal)}
        pctText={pctOrUndef(varTotal)} op="−" />
      <Row label="Lợi nhuận ròng" value={valueOf(profit)}
        pctText={pctOrUndef(profit)}
        color={isEmpty ? undefined : profitColor}
        weight={700} op="=" divider accent />
    </div>
  )
}
