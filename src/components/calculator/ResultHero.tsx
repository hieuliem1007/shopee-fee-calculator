// ResultHero — phần "anh hùng" của Calculator: live label + lợi nhuận lớn
// + gauge + 4 KPI. Tách ra để Saved/Share dùng lại y hệt Calculator.
//
// Dùng `kind`:
// - 'live'     → ResultCard (Calculator) — pulse dot + "cập nhật trực tiếp"
// - 'snapshot' → SavedResultDetailPage / PublicSharePage — không pulse,
//                label "snapshot khi lưu"

import { ArrowUp, ArrowDown } from 'lucide-react'
import { ProfitGauge } from './ProfitGauge'
import { fmtVND, fmtNum, fmtPct } from '@/lib/utils'

interface Props {
  revenue: number
  costPrice: number
  feeTotal: number
  profit: number
  profitPct: number
  kind?: 'live' | 'snapshot'
  // Calculator chèn SmartAlerts + 4 nút action vào trong cùng card.
  // Saved/Share không pass → hero hiển thị standalone.
  children?: React.ReactNode
}

function Metric({ label, value, divider }: { label: string; value: string; divider?: boolean }) {
  return (
    <div style={{
      padding: '0 16px',
      borderLeft: divider ? '1px solid rgba(0,0,0,0.06)' : 'none',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 500, color: '#8A8A82',
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
      }}>{label}</div>
      <div style={{
        fontSize: 18, fontWeight: 600, color: '#1A1A1A',
        fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
      }}>{value}</div>
    </div>
  )
}

export function ResultHero({
  revenue, costPrice, feeTotal, profit, profitPct, kind = 'live', children,
}: Props) {
  const isProfit = profit >= 0
  const profitColor = isProfit ? '#1D9E75' : '#E24B4A'
  const isLive = kind === 'live'

  return (
    <div
      data-result-card
      style={{
        position: 'relative',
        background: 'linear-gradient(135deg, #FFFBF0 0%, #FFFFFF 60%)',
        border: '1px solid #F5E5B8',
        borderRadius: 16, padding: 32,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04)',
        overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute', right: -80, top: -80, width: 240, height: 240,
        borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(245,184,28,0.10) 0%, transparent 70%)',
      }} />

      {/* Label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <span style={{
          position: 'relative', width: 8, height: 8, borderRadius: '50%',
          background: isLive ? '#1D9E75' : '#A47408', display: 'inline-block',
        }}>
          {isLive && (
            <span style={{
              position: 'absolute', inset: -4, borderRadius: '50%',
              background: '#1D9E75', opacity: 0.3,
              animation: 'pulse 2s ease-in-out infinite',
            }} />
          )}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.14em',
          color: '#6B6B66', textTransform: 'uppercase',
        }}>
          {isLive ? 'Kết quả · cập nhật trực tiếp' : 'Kết quả · snapshot khi lưu'}
        </span>
      </div>

      {/* Big number */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 13, color: '#6B6B66', marginBottom: 6, fontWeight: 500 }}>
            Lợi nhuận
          </div>
          <div style={{
            fontSize: 52, fontWeight: 600, color: profitColor,
            letterSpacing: '-0.025em', lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            display: 'flex', alignItems: 'baseline', gap: 2,
          }}>
            {isProfit ? '' : '-'}
            <span>{fmtNum(Math.abs(profit))}</span>
            <span style={{ fontSize: 28, fontWeight: 500, marginLeft: 2 }}>đ</span>
          </div>
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '6px 12px', borderRadius: 999,
          background: isProfit ? '#E1F5EE' : '#FCE5E4',
          color: isProfit ? '#0F6E56' : '#A82928',
          fontSize: 13, fontWeight: 600,
          fontVariantNumeric: 'tabular-nums', marginBottom: 6,
        }}>
          {isProfit ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
          {fmtPct(profitPct, true)}
        </div>
      </div>

      <ProfitGauge pct={profitPct} />

      {/* Metrics */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(0,0,0,0.06)',
      }}>
        <Metric label="Doanh thu" value={fmtVND(revenue)} />
        <Metric label="Giá vốn" value={fmtVND(costPrice)} divider />
        <Metric label="Tổng chi phí" value={fmtVND(feeTotal)} divider />
        <Metric label="% Phí / Doanh thu" value={fmtPct(revenue > 0 ? feeTotal / revenue * 100 : 0)} divider />
      </div>

      {children}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
