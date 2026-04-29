// AlertBadges chỉ giữ DANGER (profit < 0) — rule duy nhất không trùng
// scope với SmartAlerts (M6.3). Warning fee >=12% revenue + good
// profitPct >=15 đã chuyển sang SmartAlerts (rule khác ngưỡng + có
// feature gate riêng).

import { AlertTriangle } from 'lucide-react'
import { fmtVND } from '@/lib/utils'

interface Alert {
  tone: 'danger'
  msg: string
}

export function computeAlerts(params: {
  revenue: number
  profit: number
}): Alert[] {
  const { revenue, profit } = params
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

  return alerts
}

const ALERT_STYLES = {
  danger: { bg: '#FEF2F2', border: '#FCA5A5', icon: '#DC2626', text: '#991B1B' },
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
      <AlertTriangle size={16} color={s.icon} strokeWidth={2} style={{ flexShrink: 0 }} />
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
