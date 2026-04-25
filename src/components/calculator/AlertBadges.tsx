import { AlertTriangle, CheckCircle } from 'lucide-react'
import { computeFee } from '@/lib/fees'
import { fmtVND } from '@/lib/utils'
import type { Fee } from '@/types/fees'

interface Alert {
  tone: 'danger' | 'warn' | 'good'
  msg: string
}

export function computeAlerts(params: {
  revenue: number
  profit: number
  profitPct: number
  fixedFees: Fee[]
  varFees: Fee[]
}): Alert[] {
  const { revenue, profit, profitPct, fixedFees, varFees } = params
  const alerts: Alert[] = []
  if (revenue <= 0) return alerts

  if (profit < 0) {
    const needRevenue = revenue - profit
    const pctIncrease = ((needRevenue - revenue) / revenue) * 100
    alerts.push({
      tone: 'danger',
      msg: `Bạn đang lỗ — cần tăng giá bán thêm tối thiểu ${pctIncrease.toFixed(1).replace('.', ',')}% hoặc cắt giảm tổng phí xuống còn ${fmtVND(needRevenue)}`,
    })
  }

  const allFees = [...fixedFees, ...varFees]
  for (const f of allFees) {
    if (!f.on) continue
    const amt = computeFee(f, revenue)
    const pct = (amt / revenue) * 100
    if (pct >= 12) {
      alerts.push({
        tone: 'warn',
        msg: `${f.name} đang chiếm ${pct.toFixed(1).replace('.', ',')}% doanh thu — cao bất thường, cân nhắc tắt để tăng lợi nhuận thêm ${fmtVND(amt)}/đơn`,
      })
    }
  }

  if (profitPct >= 15) {
    const headroom = Math.max(1, Math.floor((profitPct - 10) / 1.5))
    alerts.push({
      tone: 'good',
      msg: `Lợi nhuận tốt! Có thể tăng ngân sách quảng cáo thêm ~${headroom}% để scale đơn mà vẫn có lãi`,
    })
  }

  return alerts
}

const ALERT_STYLES = {
  danger: { bg: '#FEF2F2', border: '#FCA5A5', icon: '#DC2626', text: '#991B1B' },
  warn:   { bg: '#FFFBEB', border: '#FCD34D', icon: '#D97706', text: '#92400E' },
  good:   { bg: '#F0FDF4', border: '#86EFAC', icon: '#16A34A', text: '#166534' },
}

function AlertBadge({ tone, msg }: Alert) {
  const s = ALERT_STYLES[tone]
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px', borderRadius: 8,
      background: s.bg, border: `1px solid ${s.border}`,
      fontSize: 13, color: s.text, lineHeight: 1.45, minHeight: 40,
    }}>
      {tone === 'good'
        ? <CheckCircle size={16} color={s.icon} strokeWidth={2} style={{ flexShrink: 0 }} />
        : <AlertTriangle size={16} color={s.icon} strokeWidth={2} style={{ flexShrink: 0 }} />
      }
      <span style={{ fontWeight: 500 }}>{msg}</span>
    </div>
  )
}

export function AlertBadges({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null
  return (
    <div style={{
      marginTop: 20, paddingTop: 20,
      borderTop: '1px solid rgba(0,0,0,0.06)',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {alerts.map((a, i) => <AlertBadge key={i} {...a} />)}
    </div>
  )
}
