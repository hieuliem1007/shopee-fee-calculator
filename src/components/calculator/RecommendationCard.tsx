// RecommendationCard — Expert Engine 4 tầng (M6.8 Task 2).
// Render output từ generateRecommendation(): chẩn đoán + mục tiêu + insights + actions.
//
// 2 chế độ:
// - Live: pass ctx → component compute (Calculator)
// - Snapshot: pass output đã lưu → render trực tiếp (Saved/Share)
//
// M6.9.1 — Feature gate `shopee_expert_insight`:
// - hasFeature=false → render LockedCard với CTA Zalo (giống ScenariosLockCard)
// - hasFeature=true (default) → render full content
// - SavedDetail/PublicShare luôn pass hasFeature=true (data đã chia sẻ).

import { useEffect, useMemo, useState } from 'react'
import { Lightbulb, Lock, Target, Sparkles, Rocket } from 'lucide-react'
import { generateRecommendation, type RecommendationContext, type RecommendationOutput, type RecommendationState } from '@/lib/recommendation-engine'
import { fmtVND } from '@/lib/utils'
import { getZaloLink } from '@/lib/system-config'

interface Props {
  ctx?: RecommendationContext
  preset?: RecommendationOutput
  hasFeature?: boolean
}

// Card wrapper màu xanh thống nhất (đồng bộ với design cũ Charts.tsx).
// Tầng 1 Diagnosis title đổi màu theo state (critical đỏ, warning cam, ...) —
// còn lại giữ tone xanh: border, header, section headers, action numbers.
const CARD_THEME = {
  border: '#DBE9F8',          // soft blue
  bgGradientStart: '#F0F7FF', // very light blue
  bgGradientEnd: '#F8FBFF',
  accent: '#3B82C4',          // medium blue — header icon + section titles
  accentDeep: '#1A5BA5',      // deep blue — accents nếu cần
}

// Diagnosis title chỉ đổi màu theo state. Body content giữ neutral.
const DIAGNOSIS_COLOR: Record<RecommendationState, string> = {
  critical:  '#991B1B',
  warning:   '#92400E',
  caution:   '#854D0E',
  ok:        '#065F46',
  excellent: '#064E3B',
}

export function RecommendationCard({ ctx, preset, hasFeature = true }: Props) {
  const out = useMemo(() => preset ?? (ctx ? generateRecommendation(ctx) : null), [ctx, preset])
  if (!hasFeature) return <RecommendationLockedCard />
  if (!out) return null

  const diagnosisColor = DIAGNOSIS_COLOR[out.diagnosis.state]
  const targetMarginPct = (out.goal.targetMargin * 100).toFixed(0)

  return (
    <div style={{
      marginTop: 18,
      background: `linear-gradient(135deg, ${CARD_THEME.bgGradientStart} 0%, ${CARD_THEME.bgGradientEnd} 100%)`,
      border: `1px solid ${CARD_THEME.border}`,
      borderRadius: 16, padding: 26,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: '#fff', border: `1px solid ${CARD_THEME.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: CARD_THEME.accent, flexShrink: 0,
        }}>
          <Lightbulb size={17} strokeWidth={2} />
        </div>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
          color: CARD_THEME.accent, textTransform: 'uppercase',
        }}>
          Phân tích chuyên sâu từ E-Dream
        </div>
      </div>

      {/* Tầng 1 — Diagnosis (title màu theo state để giữ ngữ điệu cảnh báo) */}
      <div style={{ marginBottom: 18 }}>
        <div style={{
          fontSize: 17, fontWeight: 700, color: diagnosisColor, marginBottom: 6,
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
      <SectionHeader icon={<Target size={14} />} title={`Để đạt biên ${targetMarginPct}% (an toàn), bạn có 2 lựa chọn`} accent={CARD_THEME.accent} />
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
          <SectionHeader icon={<Sparkles size={14} />} title="Insight chuyên sâu" accent={CARD_THEME.accent} />
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
      <SectionHeader icon={<Rocket size={14} />} title="Hành động gợi ý" accent={CARD_THEME.accent} />
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
              background: CARD_THEME.accent, color: '#fff',
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

function RecommendationLockedCard() {
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
      marginTop: 18,
      background: '#FAFAF7', border: '1px dashed #E2DDD0', borderRadius: 16,
      padding: '24px 28px', display: 'flex', gap: 16, alignItems: 'flex-start',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: '#fff', border: '1px solid #EFEAE0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Lock size={18} color="#3B82C4" />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
          color: '#3B82C4', textTransform: 'uppercase', marginBottom: 6,
        }}>
          Phân tích chuyên sâu từ E-Dream
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A', marginBottom: 4 }}>
          Tính năng cao cấp — Mở khóa để xem chẩn đoán + mục tiêu + insight + hành động
        </div>
        <div style={{ fontSize: 13, color: '#6B6B66', lineHeight: 1.6, marginBottom: 14 }}>
          Nhận phân tích 4 tầng từ E-Dream: chẩn đoán tài chính theo trạng thái sản phẩm,
          2 lộ trình đạt biên mục tiêu, insight chuyên sâu về cấu trúc phí, và gợi ý hành động ưu tiên.
        </div>
        <a
          href={disabled ? undefined : zaloLink!}
          target="_blank"
          rel="noreferrer"
          aria-disabled={disabled}
          onClick={e => { if (disabled) e.preventDefault() }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8,
            background: disabled ? '#E5E5E0' : '#0084FF',
            color: disabled ? '#A8A89E' : '#fff',
            fontSize: 13, fontWeight: 500, textDecoration: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          {zaloLink === null && !zaloError ? 'Đang tải...' : zaloError ? 'Vui lòng thử lại sau' : 'Liên hệ Zalo nâng cấp'}
        </a>
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
