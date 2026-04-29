import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Loader2, AlertCircle, Clock, Calculator, Info } from 'lucide-react'
import { getPublicResult, type PublicResultData } from '@/lib/saved-results'
import { trackShareLinkViewed } from '@/lib/analytics'
import { fmtVND } from '@/lib/utils'
import { ResultHero } from '@/components/calculator/ResultHero'
import { FeePanel } from '@/components/calculator/FeePanel'
import { CalcFlow } from '@/components/calculator/CalcFlow'
import { SmartAlerts } from '@/components/calculator/SmartAlerts'
import { splitFeesFromSnapshot, type FeeSnapshotItem } from '@/lib/fee-snapshot'
import { computeFee } from '@/lib/fees'
import type { SmartAlert } from '@/lib/smart-alerts'

const SHOP_TYPE_LABELS: Record<string, string> = {
  mall: 'Shop Mall',
  normal: 'Shop thường',
}

const TAX_MODE_LABELS: Record<string, string> = {
  hokd: 'Hộ kinh doanh',
  company: 'Công ty',
  personal: 'Cá nhân',
}

export function PublicSharePage() {
  const { slug } = useParams<{ slug: string }>()
  const [data, setData] = useState<PublicResultData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) {
      setError('Link không tồn tại')
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    getPublicResult(slug).then(({ data, error: err }) => {
      if (cancelled) return
      if (err || !data) {
        setError(err ?? 'Link không tồn tại')
        setLoading(false)
        return
      }
      setData(data)
      setLoading(false)
      trackShareLinkViewed(data.tool_id || 'shopee_calculator')
    })
    return () => { cancelled = true }
  }, [slug])

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF7', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        height: 56, padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #EFEAE0',
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <LogoMark size={28} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>E-Dream Tools</span>
        </Link>
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
          color: '#8A8A82', textTransform: 'uppercase',
        }}>
          Kết quả tính phí Shopee
        </div>
      </header>

      <main style={{ flex: 1, padding: '24px 16px' }}>
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
          {loading && <LoadingState />}
          {!loading && error && <ErrorState message={error} />}
          {!loading && !error && data && <Body data={data} />}
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        padding: '14px 16px', textAlign: 'center',
        fontSize: 11, color: '#A8A89E',
        borderTop: '1px solid #EFEAE0', background: '#fff',
      }}>
        Powered by <strong style={{ color: '#6B6B66' }}>E-Dream Tools</strong> · edream.vn
      </footer>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div style={{ padding: 80, textAlign: 'center' }}>
      <Loader2 size={28} color="#F5B81C" style={{ animation: 'spin 0.7s linear infinite' }} />
      <div style={{ marginTop: 12, fontSize: 13, color: '#6B6B66' }}>Đang tải kết quả...</div>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  const isExpired = message.includes('hết hạn')
  return (
    <div style={{
      padding: '60px 24px', textAlign: 'center',
      background: '#fff', border: '1px solid #EFEAE0', borderRadius: 16,
      marginTop: 24,
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: isExpired ? '#FEF9E7' : '#FEF2F2',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 18px',
      }}>
        {isExpired
          ? <Clock size={32} color="#92400E" />
          : <AlertCircle size={32} color="#A82928" />}
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: '#1A1A1A', marginBottom: 8 }}>
        {isExpired ? 'Link này đã hết hạn' : 'Link không tồn tại hoặc đã hết hạn'}
      </div>
      <div style={{ fontSize: 13, color: '#6B6B66', marginBottom: 22, maxWidth: 420, margin: '0 auto 22px' }}>
        {isExpired
          ? 'Người chia sẻ có thể đã tạo lại link mới hoặc kết quả đã quá hạn lưu trữ.'
          : 'Vui lòng kiểm tra lại đường dẫn hoặc liên hệ người đã gửi link.'}
      </div>
      <Link to="/login" style={ctaPrimary}>
        Vào trang chủ
      </Link>
    </div>
  )
}

function Body({ data }: { data: PublicResultData }) {
  const inputs = data.inputs as {
    costPrice?: number; sellPrice?: number; category?: string; categoryLabel?: string
    shopType?: string; taxMode?: string
    shopTypeLabel?: string; taxModeLabel?: string
  }
  const results = data.results as {
    feeTotal?: number; profit?: number; profitPct?: number; revenue?: number
    alerts?: SmartAlert[]
  }
  const snapshot = (data.fees_snapshot as unknown as FeeSnapshotItem[]) ?? []
  const savedAlerts = Array.isArray(results.alerts) ? results.alerts : null

  const costPrice = Number(inputs.costPrice ?? 0)
  const sellPrice = Number(inputs.sellPrice ?? 0)
  const revenue = Number(results.revenue ?? sellPrice)
  const categoryLabel = inputs.categoryLabel ?? inputs.category ?? '—'
  const shopTypeLabel = inputs.shopTypeLabel
    ?? (inputs.shopType ? SHOP_TYPE_LABELS[inputs.shopType] : null)
  const taxModeLabel = inputs.taxModeLabel
    ?? (inputs.taxMode ? TAX_MODE_LABELS[inputs.taxMode] : null)
  const feeTotal = Number(results.feeTotal ?? 0)
  const profit = Number(results.profit ?? 0)
  const profitPct = Number(results.profitPct ?? 0)

  const productName = data.product_name?.trim() || 'Kết quả tính phí'

  const { fixedFees, varFees } = splitFeesFromSnapshot(snapshot)
  const fixedTotal = fixedFees.reduce((s, f) => s + computeFee(f, revenue), 0)
  const varTotal = varFees.reduce((s, f) => s + computeFee(f, revenue), 0)

  return (
    <div style={{ marginTop: 8 }}>
      {/* Title */}
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1A1A1A' }}>
          {productName}
        </h1>
        <div style={{ marginTop: 6, fontSize: 12, color: '#8A8A82' }}>
          Được chia sẻ bởi user của E-Dream Tools
        </div>
      </div>

      {/* Card "Thông tin sản phẩm" */}
      <Section title="Thông tin sản phẩm">
        {categoryLabel !== '—' && <KV label="Ngành hàng" value={categoryLabel} />}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          <KV label="Giá vốn" value={fmtVND(costPrice)} compact />
          <KV label="Giá bán" value={fmtVND(sellPrice)} compact />
        </div>
        {shopTypeLabel && <KV label="Loại shop" value={shopTypeLabel} />}
        {taxModeLabel && <KV label="Hình thức kinh doanh" value={taxModeLabel} last />}
      </Section>

      {/* Hero */}
      <div style={{ marginBottom: 16 }}>
        <ResultHero
          revenue={revenue} costPrice={costPrice} feeTotal={feeTotal}
          profit={profit} profitPct={profitPct}
          kind="snapshot"
        />
      </div>

      {/* Smart alerts */}
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
        marginBottom: 22, padding: '11px 14px', borderRadius: 10,
        background: '#FEF9E7', border: '1px solid #FCD34D',
        fontSize: 12, color: '#92400E', lineHeight: 1.5,
        display: 'flex', alignItems: 'flex-start', gap: 8,
      }}>
        <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          Đây là <strong>snapshot tại thời điểm lưu</strong>. Phí Shopee hiện tại có thể đã thay đổi.
        </span>
      </div>

      {/* CTA */}
      <div style={{
        marginTop: 24, padding: '32px 24px', textAlign: 'center',
        background: '#fff', border: '1px solid #EFEAE0', borderRadius: 16,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: 'linear-gradient(135deg, #F5B81C 0%, #E8A60E 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
        }}>
          <Calculator size={22} color="#1A1A1A" />
        </div>
        <div style={{ fontSize: 17, fontWeight: 600, color: '#1A1A1A', marginBottom: 6 }}>
          Bạn cũng muốn tự tính phí Shopee?
        </div>
        <div style={{ fontSize: 13, color: '#6B6B66', marginBottom: 20, maxWidth: 460, margin: '0 auto 20px' }}>
          E-Dream Tools giúp bạn tính phí Shopee chính xác, lưu kết quả và chia sẻ chỉ với 1 link.
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/register" style={ctaPrimary}>Đăng ký miễn phí</Link>
          <Link to="/login" style={ctaSecondary}>Đăng nhập</Link>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #EFEAE0', borderRadius: 12,
      padding: '18px 22px', marginBottom: 16,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 600, color: '#8A8A82',
        letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12,
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
      display: 'grid', gridTemplateColumns: compact ? '110px 1fr' : '160px 1fr',
      padding: '9px 0',
      borderBottom: last ? 'none' : compact ? 'none' : '1px solid #F5F2EA',
      fontSize: 13,
    }}>
      <div style={{ color: '#6B6B66', fontWeight: 500 }}>{label}</div>
      <div style={{ color: '#1A1A1A', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  )
}

function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 7,
      background: 'linear-gradient(135deg, #F5B81C 0%, #E8A60E 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 1px 0 rgba(255,255,255,.4) inset, 0 2px 6px rgba(245,184,28,.3)',
      flexShrink: 0,
    }}>
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 20 20">
        <path d="M4 3 L16 3 L16 6 L7 6 L7 8.5 L14 8.5 L14 11.5 L7 11.5 L7 14 L16 14 L16 17 L4 17 Z" fill="#1A1A1A" />
      </svg>
    </div>
  )
}

const ctaPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '11px 22px', borderRadius: 8,
  background: '#F5B81C', color: '#1A1A1A',
  fontSize: 14, fontWeight: 600,
  textDecoration: 'none', fontFamily: 'inherit',
  boxShadow: '0 1px 0 rgba(255,255,255,0.4) inset, 0 2px 6px rgba(245,184,28,0.30)',
}

const ctaSecondary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '11px 22px', borderRadius: 8,
  background: '#fff', color: '#1A1A1A',
  fontSize: 14, fontWeight: 500,
  textDecoration: 'none', fontFamily: 'inherit',
  border: '1px solid #EFEAE0',
}
