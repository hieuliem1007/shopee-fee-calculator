// RecommendationCard — Expert Engine 4 tầng (M6.8 Task 2).
// Render output từ generateRecommendation(): chẩn đoán + mục tiêu + insights + actions.
//
// 2 chế độ:
// - Live: pass ctx → component compute (Calculator)
// - Snapshot: pass output đã lưu → render trực tiếp (Saved/Share)

import { useMemo } from 'react'
import { Lightbulb, Target, Sparkles, Rocket } from 'lucide-react'
import { generateRecommendation, type RecommendationContext, type RecommendationOutput, type RecommendationState } from '@/lib/recommendation-engine'
import { fmtVND } from '@/lib/utils'

interface Props {
  ctx?: RecommendationContext
  preset?: RecommendationOutput
}

const STATE_THEME: Record<RecommendationState, { border: string; bg: string; accent: string; chipBg: string; chipText: string }> = {
  critical:  { border: '#DC2626', bg: '#FEF2F2', accent: '#991B1B', chipBg: '#FEE2E2', chipText: '#991B1B' },
  warning:   { border: '#F59E0B', bg: '#FFFBEB', accent: '#92400E', chipBg: '#FEF3C7', chipText: '#92400E' },
  caution:   { border: '#EAB308', bg: '#FEFCE8', accent: '#854D0E', chipBg: '#FEF9C3', chipText: '#854D0E' },
  ok:        { border: '#10B981', bg: '#F0FDF4', accent: '#065F46', chipBg: '#D1FAE5', chipText: '#065F46' },
  excellent: { border: '#059669', bg: '#ECFDF5', accent: '#064E3B', chipBg: '#A7F3D0', chipText: '#064E3B' },
}

export function RecommendationCard({ ctx, preset }: Props) {
  const out = useMemo(() => preset ?? (ctx ? generateRecommendation(ctx) : null), [ctx, preset])
  if (!out) return null

  const theme = STATE_THEME[out.diagnosis.state]
  const targetMarginPct = (out.goal.targetMargin * 100).toFixed(0)

  return (
    <div style={{
      marginTop: 18,
      background: theme.bg,
      border: `1.5px solid ${theme.border}`,
      borderRadius: 16, padding: 26,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: '#fff', border: `1px solid ${theme.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: theme.border, flexShrink: 0,
        }}>
          <Lightbulb size={17} strokeWidth={2} />
        </div>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
          color: theme.accent, textTransform: 'uppercase',
        }}>
          Phân tích chuyên sâu từ E-Dream
        </div>
      </div>

      {/* Tầng 1 — Diagnosis */}
      <div style={{ marginBottom: 18 }}>
        <div style={{
          fontSize: 17, fontWeight: 700, color: theme.accent, marginBottom: 6,
          letterSpacing: '-0.01em',
        }}>
          {out.diagnosis.title}
        </div>
        <div style={{
          fontSize: 14, color: '#1A1A1A', lineHeight: 1.55,
        }}>
          {out.diagnosis.description}
        </div>
      </div>

      <Divider />

      {/* Tầng 2 — Goal */}
      <SectionHeader icon={<Target size={14} />} title={`Để đạt biên ${targetMarginPct}% (an toàn), bạn có 2 lựa chọn`} accent={theme.accent} />
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 12, marginTop: 12, marginBottom: 18,
      }}>
        <PathCard
          label="Lộ trình A — Tăng giá"
          primary={out.goal.pathA.feasible ? `${fmtVND(out.goal.pathA.targetPrice)}` : 'Không khả thi'}
          secondary={out.goal.pathA.feasible
            ? `từ ${fmtVND(out.goal.pathA.currentPrice)} (+${out.goal.pathA.increasePct.toFixed(1).replace('.', ',')}%)`
            : 'Tổng phí % vượt 100% — phải giảm phí trước'}
          dim={!out.goal.pathA.feasible}
        />
        <PathCard
          label="Lộ trình B — Giảm phí biến đổi"
          primary={out.goal.pathB.feasible ? `Còn ${fmtVND(out.goal.pathB.maxVarFees)}` : 'Không khả thi'}
          secondary={out.goal.pathB.feasible
            ? `từ ${fmtVND(out.goal.pathB.currentVarFees)} (-${out.goal.pathB.reductionPct.toFixed(1).replace('.', ',')}%)`
            : 'Phí biến đổi đã thấp / cần giảm vốn'}
          dim={!out.goal.pathB.feasible}
        />
      </div>

      {/* Tầng 3 — Insights */}
      {out.insights.length > 0 && (
        <>
          <Divider />
          <SectionHeader icon={<Sparkles size={14} />} title="Insight chuyên sâu" accent={theme.accent} />
          <div style={{ marginTop: 10, marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {out.insights.map(insight => (
              <div key={insight.id} style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                padding: '10px 14px', borderRadius: 10,
                background: '#fff', border: '1px solid rgba(0,0,0,0.06)',
              }}>
                <span style={{ fontSize: 17, lineHeight: 1.3, flexShrink: 0 }}>{insight.icon}</span>
                <div style={{ fontSize: 13.5, color: '#1A1A1A', lineHeight: 1.55, flex: 1 }}>
                  {insight.text}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Tầng 4 — Actions */}
      <Divider />
      <SectionHeader icon={<Rocket size={14} />} title="Hành động gợi ý" accent={theme.accent} />
      <ol style={{
        marginTop: 10, marginBottom: 18, paddingLeft: 0, listStyle: 'none',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {out.actions.map(action => (
          <li key={action.priority} style={{
            display: 'flex', gap: 12, alignItems: 'flex-start',
            fontSize: 13.5, color: '#1A1A1A', lineHeight: 1.55,
          }}>
            <span style={{
              flexShrink: 0,
              width: 22, height: 22, borderRadius: '50%',
              background: theme.border, color: '#fff',
              fontSize: 12, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontVariantNumeric: 'tabular-nums',
            }}>{action.priority}</span>
            <span style={{ flex: 1 }}>{action.text}</span>
          </li>
        ))}
      </ol>

      {/* Advanced metrics box */}
      <div style={{
        marginTop: 4, padding: '12px 14px', borderRadius: 10,
        background: '#fff', border: '1px solid rgba(0,0,0,0.08)',
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
      }}>
        <Metric label="Giá hòa vốn" value={out.meta.breakEvenPrice > 0 ? fmtVND(out.meta.breakEvenPrice) : '—'} />
        <Metric label="ACOS hòa vốn" value={out.meta.breakEvenACOS > 0 ? `${out.meta.breakEvenACOS.toFixed(1).replace('.', ',')}%` : '—'} />
        <Metric label="Đơn bù 1 đơn hoàn" value={out.diagnosis.metrics.returnBuffer != null ? `${out.diagnosis.metrics.returnBuffer} đơn` : '—'} />
      </div>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────

function Divider() {
  return <div style={{
    height: 1, background: 'rgba(0,0,0,0.08)', margin: '0 0 14px',
  }} />
}

function SectionHeader({ icon, title, accent }: { icon: React.ReactNode; title: string; accent: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      fontSize: 11, fontWeight: 700, color: accent,
      textTransform: 'uppercase', letterSpacing: '0.08em',
    }}>
      {icon}
      <span>{title}</span>
    </div>
  )
}

function PathCard({ label, primary, secondary, dim }: {
  label: string; primary: string; secondary: string; dim?: boolean
}) {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 10,
      background: '#fff', border: '1px solid rgba(0,0,0,0.08)',
      opacity: dim ? 0.7 : 1,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 600, color: '#6B6B66',
        letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6,
      }}>{label}</div>
      <div style={{
        fontSize: 18, fontWeight: 700, color: dim ? '#8A8A82' : '#1A1A1A',
        letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums',
      }}>{primary}</div>
      <div style={{ fontSize: 12, color: '#6B6B66', marginTop: 3, lineHeight: 1.45 }}>
        {secondary}
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{
        fontSize: 10, fontWeight: 600, color: '#8A8A82',
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3,
      }}>{label}</div>
      <div style={{
        fontSize: 13, fontWeight: 600, color: '#1A1A1A',
        fontVariantNumeric: 'tabular-nums',
      }}>{value}</div>
    </div>
  )
}
