import { useEffect, useRef, useState } from 'react'
import { Bookmark, Image, Download, Share2, ArrowUp, ArrowDown, Lock } from 'lucide-react'
import { ProfitGauge } from './ProfitGauge'
import { AlertBadges, computeAlerts } from './AlertBadges'
import { SaveResultDialog } from './SaveResultDialog'
import { ShareLinkDialog } from './ShareLinkDialog'
import { fmtVND, fmtNum, fmtPct } from '@/lib/utils'
import { useHasFeature } from '@/hooks/useHasFeature'
import type { Fee } from '@/types/fees'
import type { ToastState } from '@/components/ui/Toast'

interface Props {
  revenue: number
  costPrice: number
  feeTotal: number
  profit: number
  profitPct: number
  fixedFees: Fee[]
  varFees: Fee[]
  productName: string
  category: string
  categoryLabel: string
  onSaveSuccess?: (resultId: string) => void
  onShowToast?: (toast: ToastState) => void
}

const btnSec: React.CSSProperties = {
  padding: '12px 12px', borderRadius: 10,
  background: '#FFFFFF', color: '#1A1A1A',
  border: '1px solid #E2DDD0', fontSize: 13, fontWeight: 500,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  gap: 6, fontFamily: 'inherit',
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

export function ResultCard({
  revenue, costPrice, feeTotal, profit, profitPct,
  fixedFees, varFees,
  productName, category, categoryLabel,
  onSaveSuccess, onShowToast,
}: Props) {
  const [hover, setHover] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [savedResultId, setSavedResultId] = useState<string | null>(null)
  const wantShareAfterSaveRef = useRef(false)
  const isProfit = profit >= 0
  const profitColor = isProfit ? '#1D9E75' : '#E24B4A'

  const alerts = computeAlerts({ revenue, profit, profitPct, fixedFees, varFees })

  const { hasFeature: canSave, loading: featureLoading } = useHasFeature('shopee_save_result')
  const { hasFeature: canShare, loading: shareFeatureLoading } = useHasFeature('shopee_share_link')

  // Saved result tied to current inputs/fees; clear khi user thay đổi inputs hay fees
  // → tránh share một snapshot stale.
  const inputSignature = `${costPrice}|${revenue}|${category}|${productName}|${[...fixedFees, ...varFees].map(f => `${f.id}:${f.on?1:0}:${f.rate}`).join(',')}`
  useEffect(() => {
    setSavedResultId(null)
  }, [inputSignature])

  const feesSnapshot = [...fixedFees, ...varFees].map(f => ({
    id: f.id,
    label: f.name,
    value: f.kind === 'pct' ? +(f.rate * 100).toFixed(4) : f.rate,
    unit: f.kind === 'pct' ? 'percent' : 'vnd',
    on: f.on,
    custom: f.custom ?? false,
  }))

  const inputs = {
    costPrice, sellPrice: revenue,
    category, categoryLabel,
  }

  const results = { feeTotal, profit, profitPct, revenue }

  const handleSaveClick = () => {
    if (!canSave || featureLoading) return
    setDialogOpen(true)
  }

  const handleShareClick = () => {
    if (!canShare || shareFeatureLoading) return
    if (savedResultId) {
      setShareDialogOpen(true)
      return
    }
    if (!canSave) {
      onShowToast?.({
        kind: 'info',
        message: 'Vui lòng lưu kết quả trước khi chia sẻ. Vào Dashboard → Chi tiết để mở link share.',
      })
      return
    }
    onShowToast?.({
      kind: 'info',
      message: 'Vui lòng lưu kết quả trước khi chia sẻ.',
    })
    wantShareAfterSaveRef.current = true
    setDialogOpen(true)
  }

  const handleSaved = (id: string) => {
    setSavedResultId(id)
    onSaveSuccess?.(id)
    if (wantShareAfterSaveRef.current) {
      wantShareAfterSaveRef.current = false
      setShareDialogOpen(true)
    }
  }

  return (
    <div
      data-result-card
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        background: 'linear-gradient(135deg, #FFFBF0 0%, #FFFFFF 60%)',
        border: '1px solid #F5E5B8',
        borderRadius: 16, padding: 32,
        boxShadow: hover
          ? '0 2px 4px rgba(245,184,28,0.06), 0 16px 40px rgba(245,184,28,0.10)'
          : '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04)',
        transform: hover ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute', right: -80, top: -80, width: 240, height: 240,
        borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(245,184,28,0.10) 0%, transparent 70%)',
      }} />

      {/* Live label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <span style={{ position: 'relative', width: 8, height: 8, borderRadius: '50%', background: '#1D9E75', display: 'inline-block' }}>
          <span style={{
            position: 'absolute', inset: -4, borderRadius: '50%',
            background: '#1D9E75', opacity: 0.3,
            animation: 'pulse 2s ease-in-out infinite',
          }} />
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', color: '#6B6B66', textTransform: 'uppercase' }}>
          Kết quả · cập nhật trực tiếp
        </span>
      </div>

      {/* Big number */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 13, color: '#6B6B66', marginBottom: 6, fontWeight: 500 }}>Lợi nhuận</div>
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

      <AlertBadges alerts={alerts} />

      {/* Action buttons */}
      <div className="result-actions" style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 10, marginTop: 24,
      }}>
        <button
          onClick={handleSaveClick}
          disabled={!canSave || featureLoading}
          title={!canSave && !featureLoading ? 'Liên hệ admin để mở khóa tính năng lưu kết quả' : undefined}
          style={{
            padding: '12px 14px', borderRadius: 10,
            background: canSave ? '#F5B81C' : '#E5E5E0',
            color: canSave ? '#1A1A1A' : '#A8A89E',
            border: 0, fontSize: 13, fontWeight: 600,
            cursor: canSave && !featureLoading ? 'pointer' : 'not-allowed',
            opacity: canSave ? 1 : 0.6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, transition: 'all 0.2s', fontFamily: 'inherit',
            boxShadow: canSave ? '0 1px 0 rgba(255,255,255,0.4) inset, 0 2px 6px rgba(245,184,28,0.30)' : 'none',
          }}
        >
          {canSave ? <Bookmark size={14} /> : <Lock size={14} />}
          Lưu kết quả
        </button>
        <button style={btnSec}><Image size={14} /> Tải ảnh</button>
        <button style={btnSec}><Download size={14} /> Xuất PDF</button>
        <button
          onClick={handleShareClick}
          disabled={!canShare || shareFeatureLoading}
          title={!canShare && !shareFeatureLoading ? 'Liên hệ admin để mở khóa tính năng chia sẻ' : undefined}
          style={{
            ...btnSec,
            background: canShare ? '#FFFFFF' : '#F5F5F0',
            color: canShare ? '#1A1A1A' : '#A8A89E',
            cursor: canShare && !shareFeatureLoading ? 'pointer' : 'not-allowed',
            opacity: canShare ? 1 : 0.7,
          }}
        >
          {canShare ? <Share2 size={14} /> : <Lock size={14} />} Chia sẻ
        </button>
      </div>

      <SaveResultDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          wantShareAfterSaveRef.current = false
        }}
        defaultProductName={productName}
        inputs={inputs}
        feesSnapshot={feesSnapshot}
        results={results}
        onSaved={handleSaved}
      />

      <ShareLinkDialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        resultId={savedResultId ?? ''}
        existingSlug={null}
        resultName={productName || 'Kết quả không tên'}
      />

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(2.2); opacity: 0; }
        }
        @media (max-width: 480px) {
          .result-actions { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  )
}
