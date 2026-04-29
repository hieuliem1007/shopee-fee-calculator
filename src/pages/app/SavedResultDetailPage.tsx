import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Share2, Trash2, Loader2, X, Lock, AlertCircle, Info } from 'lucide-react'
import { getResultDetail, deleteResult, type SavedResultDetail } from '@/lib/saved-results'
import { fmtVND } from '@/lib/utils'
import { relativeTime, daysUntil, expiryLabel } from '@/lib/format'
import { useHasFeature } from '@/hooks/useHasFeature'
import { ShareLinkDialog } from '@/components/calculator/ShareLinkDialog'
import { ResultHero } from '@/components/calculator/ResultHero'
import { FeePanel } from '@/components/calculator/FeePanel'
import { CalcFlow } from '@/components/calculator/CalcFlow'
import { SmartAlerts } from '@/components/calculator/SmartAlerts'
import { splitFeesFromSnapshot, type FeeSnapshotItem } from '@/lib/fee-snapshot'
import { computeFee } from '@/lib/fees'
import type { SmartAlert } from '@/lib/smart-alerts'
import { Toast, type ToastState } from '@/components/ui/Toast'

const TOOL_LABEL: Record<string, string> = {
  shopee_calculator: 'Shopee Calculator',
}

const SHOP_TYPE_LABELS: Record<string, string> = {
  mall: 'Shop Mall',
  normal: 'Shop thường',
}

const TAX_MODE_LABELS: Record<string, string> = {
  hokd: 'Hộ kinh doanh',
  company: 'Công ty',
  personal: 'Cá nhân',
}

export function SavedResultDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [detail, setDetail] = useState<SavedResultDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showShareDialog, setShowShareDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [toast, setToast] = useState<ToastState | null>(null)
  const showToast = (kind: 'success' | 'error', message: string) => {
    setToast({ kind, message })
  }

  const { hasFeature: canShare, loading: featureLoading } = useHasFeature('shopee_share_link')

  const fetchDetail = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    const { data, error: err } = await getResultDetail(id)
    if (err || !data) {
      setError(err ?? 'Không tải được kết quả')
      setLoading(false)
      return
    }
    setDetail(data)
    setLoading(false)
  }, [id])

  useEffect(() => { fetchDetail() }, [fetchDetail])

  const handleDelete = async () => {
    if (!id) return
    setDeleting(true)
    const { error: err } = await deleteResult(id)
    setDeleting(false)
    setShowDeleteDialog(false)
    if (err) {
      showToast('error', err)
      return
    }
    navigate('/app', { state: { toast: 'Đã xóa kết quả' } })
  }

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <Loader2 size={28} color="#F5B81C" style={{ animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error || !detail) {
    const isMissing = !!error && (error.includes('Không tìm thấy') || error.includes('hết hạn'))
    return (
      <div style={{ padding: 32, maxWidth: 720, margin: '0 auto' }}>
        <BackButton onClick={() => navigate('/app')} />
        <div style={{
          marginTop: 18, padding: '40px 32px', textAlign: 'center',
          background: '#fff', border: '1px solid #EFEAE0', borderRadius: 14,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <AlertCircle size={26} color="#A82928" />
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#1A1A1A', marginBottom: 6 }}>
            {isMissing ? 'Kết quả không tồn tại hoặc đã hết hạn' : 'Không tải được kết quả'}
          </div>
          <div style={{ fontSize: 13, color: '#6B6B66', marginBottom: 18 }}>
            {error ?? 'Vui lòng thử lại sau.'}
          </div>
          <button onClick={() => navigate('/app')} style={btnPrimary}>
            Về Dashboard
          </button>
        </div>
      </div>
    )
  }

  const productName = detail.product_name?.trim() || '(chưa đặt tên)'
  const isPlaceholder = !detail.product_name?.trim()
  const tool = TOOL_LABEL[detail.tool_id] ?? detail.tool_id
  const inputs = detail.inputs as {
    costPrice?: number; sellPrice?: number; category?: string; categoryLabel?: string
    shopType?: string; taxMode?: string
    shopTypeLabel?: string; taxModeLabel?: string
  }
  const results = detail.results as {
    feeTotal?: number; profit?: number; profitPct?: number; revenue?: number
    alerts?: SmartAlert[]
  }
  const snapshot = (detail.fees_snapshot as unknown as FeeSnapshotItem[]) ?? []
  const savedAlerts = Array.isArray(results.alerts) ? results.alerts : null

  const costPrice = Number(inputs.costPrice ?? 0)
  const sellPrice = Number(inputs.sellPrice ?? 0)
  const revenue = Number(results.revenue ?? sellPrice)
  const categoryLabel = inputs.categoryLabel ?? inputs.category ?? '—'
  // M6.7+: lưu trực tiếp label. Pre-M6.7 fallback dùng map từ raw ID.
  const shopTypeLabel = inputs.shopTypeLabel
    ?? (inputs.shopType ? SHOP_TYPE_LABELS[inputs.shopType] : null)
  const taxModeLabel = inputs.taxModeLabel
    ?? (inputs.taxMode ? TAX_MODE_LABELS[inputs.taxMode] : null)
  const feeTotal = Number(results.feeTotal ?? 0)
  const profit = Number(results.profit ?? 0)
  const profitPct = Number(results.profitPct ?? 0)
  const expiryDays = daysUntil(detail.expires_at)
  const expiryWarn = expiryDays < 7

  const { fixedFees, varFees } = splitFeesFromSnapshot(snapshot)
  const fixedTotal = fixedFees.reduce((s, f) => s + computeFee(f, revenue), 0)
  const varTotal = varFees.reduce((s, f) => s + computeFee(f, revenue), 0)

  return (
    <div style={{ padding: 32, maxWidth: 880, margin: '0 auto' }}>
      <BackButton onClick={() => navigate('/app')} />

      {/* Title */}
      <div style={{ marginTop: 18, marginBottom: 20 }}>
        <h1 style={{
          margin: 0, fontSize: 22, fontWeight: 700, color: '#1A1A1A',
          fontStyle: isPlaceholder ? 'italic' : 'normal',
        }}>
          {productName}
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6B6B66' }}>
          Lưu lúc <strong>{relativeTime(detail.created_at)}</strong>
          {' · Hết hạn sau '}
          <strong style={{ color: expiryWarn ? '#C2410C' : '#6B6B66' }}>
            {expiryLabel(detail.expires_at)}
          </strong>
        </p>
      </div>

      {/* Action row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 22, flexWrap: 'wrap' }}>
        <button
          onClick={() => canShare && setShowShareDialog(true)}
          disabled={!canShare || featureLoading}
          title={!canShare && !featureLoading ? 'Liên hệ admin để mở khóa tính năng chia sẻ' : undefined}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '9px 16px', borderRadius: 8, border: 'none',
            background: canShare ? (detail.share_slug ? '#1D9E75' : '#1A1A1A') : '#E5E5E0',
            color: canShare ? '#fff' : '#A8A89E',
            fontSize: 13, fontWeight: 500,
            cursor: canShare && !featureLoading ? 'pointer' : 'not-allowed',
            opacity: canShare ? 1 : 0.7,
            fontFamily: 'inherit',
          }}
        >
          {canShare ? <Share2 size={14} /> : <Lock size={14} />}
          {detail.share_slug ? 'Xem link chia sẻ' : 'Chia sẻ link'}
        </button>
        <button
          onClick={() => setShowDeleteDialog(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '9px 16px', borderRadius: 8,
            border: '1px solid #FCA5A5', background: '#fff',
            color: '#A82928', fontSize: 13, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <Trash2 size={14} /> Xóa
        </button>
      </div>

      {/* Card "Thông tin sản phẩm" */}
      <Section title="Thông tin sản phẩm">
        <KV label="Tool" value={tool} />
        <KV label="Tên sản phẩm" value={isPlaceholder ? <em style={{ color: '#A8A89E' }}>(chưa đặt tên)</em> : productName} />
        {categoryLabel !== '—' && <KV label="Ngành hàng" value={categoryLabel} />}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          <KV label="Giá vốn" value={fmtVND(costPrice)} compact />
          <KV label="Giá bán" value={fmtVND(sellPrice)} compact />
        </div>
        {shopTypeLabel && <KV label="Loại shop" value={shopTypeLabel} />}
        {taxModeLabel && <KV label="Hình thức kinh doanh" value={taxModeLabel} last />}
        {!taxModeLabel && !shopTypeLabel && <div style={{ height: 0 }} />}
      </Section>

      {/* Hero */}
      <div style={{ marginBottom: 16 }}>
        <ResultHero
          revenue={revenue} costPrice={costPrice} feeTotal={feeTotal}
          profit={profit} profitPct={profitPct}
          kind="snapshot"
        />
      </div>

      {/* Smart alerts (snapshot) */}
      {savedAlerts && savedAlerts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <SmartAlerts hasFeature={true} presetAlerts={savedAlerts} />
        </div>
      )}

      {/* 2 panel phí */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)',
        gap: 16, marginBottom: 16,
      }}>
        {fixedFees.length > 0 && (
          <FeePanel
            title="Phí cố định"
            fees={fixedFees} revenue={revenue}
            color="#F5B81C" accentBg="#FFFBF0"
            readOnly
          />
        )}
        {varFees.length > 0 && (
          <FeePanel
            title="Phí biến đổi"
            fees={varFees} revenue={revenue}
            color="#3B82F6" accentBg="#EBF3FE"
            readOnly
          />
        )}
      </div>

      {/* CalcFlow */}
      <div style={{ marginBottom: 16 }}>
        <CalcFlow
          revenue={revenue} costPrice={costPrice}
          fixedTotal={fixedTotal} varTotal={varTotal} profit={profit}
          sticky={false}
        />
      </div>

      {/* Snapshot banner */}
      <div style={{
        marginBottom: 16, padding: '11px 14px', borderRadius: 10,
        background: '#FEF9E7', border: '1px solid #FCD34D',
        fontSize: 12, color: '#92400E', lineHeight: 1.5,
        display: 'flex', alignItems: 'flex-start', gap: 8,
      }}>
        <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          Đây là <strong>snapshot tại thời điểm lưu</strong>. Phí Shopee hiện tại có thể đã thay đổi —
          mở Calculator để tính lại với phí mới nhất.
        </span>
      </div>

      {/* Footer meta */}
      <div style={{
        padding: '12px 14px', borderRadius: 8,
        background: '#FAFAF7', border: '1px solid #EFEAE0',
        fontSize: 11, color: '#8A8A82',
        display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
      }}>
        <span>ID: <code style={{ fontSize: 10 }}>{detail.id}</code></span>
        <span>Tự động xóa sau: <strong style={{ color: expiryWarn ? '#C2410C' : '#6B6B66' }}>{expiryLabel(detail.expires_at)}</strong></span>
      </div>

      {/* Dialogs */}
      <ShareLinkDialog
        open={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        resultId={detail.id}
        existingSlug={detail.share_slug}
        resultName={productName}
        onSlugChanged={(slug) => {
          setDetail(prev => prev ? { ...prev, share_slug: slug } : prev)
        }}
      />

      {showDeleteDialog && (
        <DeleteConfirm
          name={productName}
          deleting={deleting}
          onCancel={() => setShowDeleteDialog(false)}
          onConfirm={handleDelete}
        />
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 0', border: 'none', background: 'transparent',
      color: '#6B6B66', fontSize: 13, fontWeight: 500,
      cursor: 'pointer', fontFamily: 'inherit',
    }}>
      <ArrowLeft size={14} /> Quay lại Dashboard
    </button>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #EFEAE0', borderRadius: 12,
      padding: '18px 22px', marginBottom: 16,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 600, color: '#8A8A82',
        letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14,
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function KV({ label, value, last, compact }: {
  label: string; value: React.ReactNode; last?: boolean; compact?: boolean
}) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: compact ? '110px 1fr' : '180px 1fr',
      padding: '10px 0',
      borderBottom: last ? 'none' : compact ? 'none' : '1px solid #F5F2EA',
      fontSize: 13,
    }}>
      <div style={{ color: '#6B6B66', fontWeight: 500 }}>{label}</div>
      <div style={{ color: '#1A1A1A', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  )
}

function DeleteConfirm({ name, deleting, onCancel, onConfirm }: {
  name: string; deleting: boolean
  onCancel: () => void; onConfirm: () => void
}) {
  const isPlaceholder = name === '(chưa đặt tên)'
  const display = isPlaceholder ? 'kết quả chưa đặt tên' : `"${name}"`
  return (
    <div onClick={() => !deleting && onCancel()} style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 420, maxWidth: '92vw',
        background: '#fff', borderRadius: 14, padding: '22px 24px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>
            Xóa kết quả?
          </h2>
          <button onClick={onCancel} disabled={deleting} style={{
            width: 26, height: 26, padding: 0, border: 'none',
            background: 'transparent', cursor: deleting ? 'not-allowed' : 'pointer',
            color: '#6B6B66',
          }}>
            <X size={16} />
          </button>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: '#6B6B66', lineHeight: 1.6 }}>
          Bạn sắp xóa {display}. Hành động này <strong style={{ color: '#A82928' }}>KHÔNG thể hoàn tác</strong>.
          Link chia sẻ liên quan cũng sẽ bị xóa theo.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <button onClick={onCancel} disabled={deleting} style={btnSecondary}>Hủy</button>
          <button onClick={onConfirm} disabled={deleting} style={{
            ...btnDanger,
            opacity: deleting ? 0.7 : 1,
            cursor: deleting ? 'not-allowed' : 'pointer',
          }}>
            {deleting
              ? <Loader2 size={13} style={{ animation: 'spin 0.7s linear infinite' }} />
              : <Trash2 size={13} />}
            Xóa
          </button>
        </div>
      </div>
    </div>
  )
}

const btnPrimary: React.CSSProperties = {
  padding: '9px 18px', borderRadius: 8, border: 'none',
  background: '#F5B81C', color: '#1A1A1A',
  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  boxShadow: '0 1px 0 rgba(255,255,255,0.4) inset, 0 2px 6px rgba(245,184,28,0.30)',
}

const btnSecondary: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8, border: '1px solid #EFEAE0',
  background: '#fff', color: '#1A1A1A',
  fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
}

const btnDanger: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', borderRadius: 8, border: 'none',
  background: '#A82928', color: '#fff',
  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
}

