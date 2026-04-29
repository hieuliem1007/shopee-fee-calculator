// SmartAlerts (unified) — render danger + warning + tip + ok cùng 1 list,
// nằm trong ResultCard ngay dưới hàng KPI cards.
//
// Feature gate: danger LUÔN HIỆN cho mọi user (cảnh báo critical, ai cũng
// cần biết). warning + tip + ok gate qua hasFeature shopee_smart_alerts.
// Khi user free có alerts bị ẩn → render 1 dòng nhỏ Zalo CTA.
//
// 3 cách dùng:
// 1. Live (ResultCard): pass result + varFees + hasFeature → component compute.
// 2. Saved/public view: pass presetAlerts đã lưu trong results.alerts +
//    hasFeature=true → render full snapshot.
// 3. Locked: hasFeature=false → filter chỉ giữ danger + Zalo footer.

import { useEffect, useState } from 'react'
import { AlertTriangle, AlertOctagon, Lightbulb, CheckCircle2 } from 'lucide-react'
import type { Fee } from '@/types/fees'
import { getZaloLink } from '@/lib/system-config'
import { computeSmartAlerts, type SmartAlert, type SmartAlertInput } from '@/lib/smart-alerts'

interface Props {
  hasFeature: boolean
  result?: SmartAlertInput
  varFees?: Fee[]
  presetAlerts?: SmartAlert[]
}

const TONE = {
  danger:  { bg: '#FEEAEA', stripe: '#DC3545', titleColor: '#842029', textColor: '#5C1A22', iconColor: '#DC3545' },
  warning: { bg: '#FFF7E0', stripe: '#F4C56C', titleColor: '#854F0B', textColor: '#5C3A00', iconColor: '#B85C00' },
  tip:     { bg: '#E6F1FB', stripe: '#7CB6E8', titleColor: '#1F5C8C', textColor: '#1F4063', iconColor: '#1F5C8C' },
  ok:      { bg: '#E8F5EF', stripe: '#7DC9A2', titleColor: '#0F5132', textColor: '#0F4A3D', iconColor: '#0F6E56' },
} as const

const ICON_FOR = {
  danger: AlertOctagon,
  warning: AlertTriangle,
  tip: Lightbulb,
  ok: CheckCircle2,
} as const

function AlertRow({ alert }: { alert: SmartAlert }) {
  const tone = TONE[alert.severity]
  const Icon = ICON_FOR[alert.severity]
  const compact = alert.severity === 'ok'
  return (
    <div style={{
      display: 'flex', alignItems: compact ? 'center' : 'flex-start', gap: 10,
      padding: compact ? '9px 12px 9px 14px' : '11px 12px 11px 14px',
      borderRadius: 8,
      background: tone.bg,
      borderLeft: `3px solid ${tone.stripe}`,
      fontSize: 13, lineHeight: 1.5,
    }}>
      <Icon size={16} color={tone.iconColor} strokeWidth={2}
        style={{ flexShrink: 0, marginTop: compact ? 0 : 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: tone.titleColor }}>{alert.title}</div>
        {alert.description && !compact && (
          <div style={{ marginTop: 3, fontSize: 12.5, color: tone.textColor, opacity: 0.92 }}>
            {alert.description}
          </div>
        )}
      </div>
    </div>
  )
}

function UpgradeFooter({ hiddenCount }: { hiddenCount: number }) {
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
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 10, padding: '8px 12px', borderRadius: 8,
      background: '#FAFAF7', border: '1px dashed #E2DDD0',
      fontSize: 12.5, color: '#6B6B66',
    }}>
      <span>
        Có {hiddenCount} cảnh báo/gợi ý nâng cao đang bị ẩn —{' '}
        <strong style={{ color: '#1A1A1A', fontWeight: 600 }}>Cảnh báo thông minh</strong>
      </span>
      <a
        href={disabled ? undefined : zaloLink!}
        target="_blank"
        rel="noreferrer"
        aria-disabled={disabled}
        onClick={e => { if (disabled) e.preventDefault() }}
        style={{
          flexShrink: 0, padding: '5px 10px', borderRadius: 6,
          background: disabled ? '#E5E5E0' : '#0084FF',
          color: disabled ? '#A8A89E' : '#fff',
          fontSize: 12, fontWeight: 500, textDecoration: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {zaloLink === null && !zaloError ? 'Đang tải...' : zaloError ? 'Thử lại sau' : 'Liên hệ Zalo'}
      </a>
    </div>
  )
}

export function SmartAlerts({ result, varFees, hasFeature, presetAlerts }: Props) {
  const allAlerts = presetAlerts ?? (
    result && varFees ? computeSmartAlerts(result, varFees) : []
  )
  if (allAlerts.length === 0) return null

  const visibleAlerts = hasFeature
    ? allAlerts
    : allAlerts.filter(a => a.severity === 'danger')
  const hiddenCount = allAlerts.length - visibleAlerts.length

  if (visibleAlerts.length === 0 && hiddenCount === 0) return null

  return (
    <div style={{
      marginTop: 20, paddingTop: 20,
      borderTop: '1px solid rgba(0,0,0,0.06)',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {visibleAlerts.map(a => <AlertRow key={a.id} alert={a} />)}
      {!hasFeature && hiddenCount > 0 && <UpgradeFooter hiddenCount={hiddenCount} />}
    </div>
  )
}
