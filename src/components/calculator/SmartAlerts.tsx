// SmartAlerts — render danh sách cảnh báo/gợi ý theo SmartAlert[].
//
// 3 cách dùng:
// 1. Calculator live: pass result + varFees + hasFeature → component compute
//    qua computeSmartAlerts.
// 2. Saved view (detail / public share): pass presetAlerts đã lưu trong
//    results.alerts → render đúng snapshot, không tính lại.
// 3. Locked: hasFeature=false → render LockCard kèm Zalo CTA (copy pattern
//    ScenariosLockCard trong CalculatorApp.tsx).

import { useEffect, useState } from 'react'
import { AlertTriangle, Lightbulb, CheckCircle2, Lock } from 'lucide-react'
import type { Fee } from '@/types/fees'
import { getZaloLink } from '@/lib/system-config'
import { computeSmartAlerts, type SmartAlert, type SmartAlertInput } from '@/lib/smart-alerts'

interface Props {
  hasFeature: boolean
  // Live calculator: pass result + varFees để compute. Saved/public view:
  // pass presetAlerts đã lưu trong results.alerts.
  result?: SmartAlertInput
  varFees?: Fee[]
  presetAlerts?: SmartAlert[]
}

const ALERT_TONE = {
  warning: { bg: '#FFF7E0', border: '#F4C56C', icon: '#B85C00', text: '#5C3A00' },
  tip:     { bg: '#E6F1FB', border: '#7CB6E8', icon: '#1F5C8C', text: '#1F4063' },
  ok:      { bg: '#E8F5EF', border: '#7DC9A2', icon: '#0F6E56', text: '#0F4A3D' },
} as const

function AlertRow({ alert }: { alert: SmartAlert }) {
  const tone = ALERT_TONE[alert.severity]
  const Icon = alert.severity === 'tip'
    ? Lightbulb
    : alert.severity === 'ok'
      ? CheckCircle2
      : AlertTriangle
  // OK alert: render gọn 1 dòng (theo brief).
  const compact = alert.severity === 'ok'
  return (
    <div style={{
      display: 'flex', alignItems: compact ? 'center' : 'flex-start', gap: 10,
      padding: compact ? '8px 14px' : '12px 14px', borderRadius: 8,
      background: tone.bg, border: `1px solid ${tone.border}`,
      color: tone.text, fontSize: 13, lineHeight: 1.5,
    }}>
      <Icon size={16} color={tone.icon} strokeWidth={2}
        style={{ flexShrink: 0, marginTop: compact ? 0 : 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500 }}>{alert.title}</div>
        {alert.description && !compact && (
          <div style={{ marginTop: 2, fontSize: 12, color: tone.text, opacity: 0.85 }}>
            {alert.description}
          </div>
        )}
      </div>
    </div>
  )
}

function SmartAlertsLockCard() {
  const [zaloLink, setZaloLink] = useState<string | null>(null)
  const [zaloError, setZaloError] = useState(false)

  useEffect(() => {
    let cancelled = false
    getZaloLink()
      .then(link => { if (!cancelled) setZaloLink(link) })
      .catch(() => { if (!cancelled) setZaloError(true) })
    return () => { cancelled = true }
  }, [])

  const disabled = !zaloLink || zaloError

  return (
    <section style={{ marginTop: 16 }}>
      <div style={{
        background: '#FAFAF7', border: '1px dashed #E2DDD0', borderRadius: 12,
        padding: '20px 24px', display: 'flex', gap: 14, alignItems: 'flex-start',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9, flexShrink: 0,
          background: '#fff', border: '1px solid #EFEAE0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Lock size={16} color="#A47408" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A', marginBottom: 4 }}>
            Cảnh báo thông minh — Tính năng nâng cao
          </div>
          <div style={{ fontSize: 13, color: '#6B6B66', lineHeight: 1.6, marginBottom: 12 }}>
            Phát hiện tự động cấu trúc phí bất thường (1 phí biến đổi {'>'} 30% tổng phí, tổng phí {'>'} 40% doanh thu)
            và đề xuất ngưỡng lợi nhuận an toàn. Liên hệ admin để mở khóa tính năng này.
          </div>
          <a
            href={disabled ? undefined : zaloLink!}
            target="_blank"
            rel="noreferrer"
            aria-disabled={disabled}
            onClick={e => { if (disabled) e.preventDefault() }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8,
              background: disabled ? '#E5E5E0' : '#0084FF',
              color: disabled ? '#A8A89E' : '#fff',
              fontSize: 13, fontWeight: 500, textDecoration: 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            {zaloLink === null && !zaloError ? 'Đang tải...' : zaloError ? 'Vui lòng thử lại sau' : 'Liên hệ admin để mở khóa'}
          </a>
        </div>
      </div>
    </section>
  )
}

export function SmartAlerts({ result, varFees, hasFeature, presetAlerts }: Props) {
  if (!hasFeature) return <SmartAlertsLockCard />
  const alerts = presetAlerts ?? (
    result && varFees ? computeSmartAlerts(result, varFees) : []
  )
  if (alerts.length === 0) return null
  return (
    <section style={{
      marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {alerts.map(a => <AlertRow key={a.id} alert={a} />)}
    </section>
  )
}
