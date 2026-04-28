import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Loader2, AlertCircle, Clock, Calculator } from 'lucide-react'
import { getPublicResult, type PublicResultData } from '@/lib/saved-results'
import { fmtVND, fmtPct } from '@/lib/utils'

interface FeeSnapshotItem {
  id: string
  label: string
  value: number
  unit: 'percent' | 'vnd'
  on: boolean
  custom?: boolean
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
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
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
  const inputs = data.inputs as { costPrice?: number; sellPrice?: number; category?: string; categoryLabel?: string }
  const results = data.results as { feeTotal?: number; profit?: number; profitPct?: number; revenue?: number }
  const fees = (data.fees_snapshot as unknown as FeeSnapshotItem[]) ?? []

  const costPrice = Number(inputs.costPrice ?? 0)
  const sellPrice = Number(inputs.sellPrice ?? 0)
  const categoryLabel = inputs.categoryLabel ?? inputs.category ?? '—'
  const feeTotal = Number(results.feeTotal ?? 0)
  const profit = Number(results.profit ?? 0)
  const profitPct = Number(results.profitPct ?? 0)
  const profitColor = profit > 0 ? '#1D9E75' : profit < 0 ? '#A82928' : '#C99A0E'

  const productName = data.product_name?.trim() || 'Kết quả tính phí'

  // Compute mỗi fee actual amount cho table
  const activeFees = fees.filter(f => f.on)

  const computeFeeAmount = (f: FeeSnapshotItem) =>
    f.unit === 'percent' ? sellPrice * (f.value / 100) : f.value

  return (
    <div style={{ marginTop: 8 }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #FFFBF0 0%, #FFFFFF 60%)',
        border: '1px solid #F5E5B8', borderRadius: 16,
        padding: '28px 32px', marginBottom: 18,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(245,184,28,0.06)',
      }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1A1A1A' }}>
          {productName}
        </h1>
        <div style={{ marginTop: 6, fontSize: 12, color: '#8A8A82' }}>
          Được chia sẻ bởi user của E-Dream Tools
        </div>

        {/* Hero numbers */}
        <div style={{
          marginTop: 22, paddingTop: 20, borderTop: '1px solid rgba(0,0,0,0.06)',
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16,
        }}>
          <HeroMetric label="Doanh thu" value={fmtVND(sellPrice)} />
          <HeroMetric label="Lợi nhuận" value={fmtVND(profit)} color={profitColor} big />
          <HeroMetric label="Tỷ lệ LN" value={fmtPct(profitPct)} color={profitColor} />
        </div>
      </div>

      {/* Section 1: Thông tin tính phí */}
      <Section title="Thông tin tính phí">
        <KV label="Giá vốn" value={fmtVND(costPrice)} />
        <KV label="Giá bán" value={fmtVND(sellPrice)} />
        <KV label="Ngành hàng" value={categoryLabel} last />
      </Section>

      {/* Section 2: Phí áp dụng */}
      <Section title={`Phí áp dụng (${activeFees.length} khoản)`}>
        {activeFees.length === 0 ? (
          <div style={{ padding: '14px 0', fontSize: 13, color: '#A8A89E' }}>
            Không có phí nào được áp dụng.
          </div>
        ) : (
          <div style={{ border: '1px solid #EFEAE0', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 0.8fr 1fr',
              padding: '9px 12px', background: '#FAFAF7',
              borderBottom: '1px solid #EFEAE0',
              fontSize: 11, fontWeight: 600, color: '#8A8A82',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              <div>Tên phí</div>
              <div style={{ textAlign: 'right' }}>{'%/đơn vị'}</div>
              <div style={{ textAlign: 'right' }}>Số tiền</div>
            </div>
            {activeFees.map((f, i) => (
              <div key={f.id || i} style={{
                display: 'grid', gridTemplateColumns: '2fr 0.8fr 1fr',
                padding: '10px 12px', alignItems: 'center',
                borderBottom: i < activeFees.length - 1 ? '1px solid #F5F2EA' : 'none',
                fontSize: 13,
              }}>
                <div style={{ fontWeight: 500 }}>{f.label}</div>
                <div style={{ textAlign: 'right', color: '#6B6B66', fontVariantNumeric: 'tabular-nums' }}>
                  {f.unit === 'percent' ? f.value + '%' : 'VNĐ'}
                </div>
                <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {fmtVND(computeFeeAmount(f))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Section 3: Kết quả */}
      <Section title="Kết quả">
        <KV label="Tổng phí" value={fmtVND(feeTotal)} />
        <KV
          label="Lợi nhuận"
          value={<span style={{ color: profitColor, fontWeight: 600 }}>{fmtVND(profit)}</span>}
        />
        <KV
          label="Lợi nhuận %"
          value={<span style={{ color: profitColor, fontWeight: 600 }}>{fmtPct(profitPct)}</span>}
          last
        />
      </Section>

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
      padding: '18px 22px', marginBottom: 14,
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

function KV({ label, value, last }: { label: string; value: React.ReactNode; last?: boolean }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '160px 1fr',
      padding: '9px 0', borderBottom: last ? 'none' : '1px solid #F5F2EA',
      fontSize: 13,
    }}>
      <div style={{ color: '#6B6B66', fontWeight: 500 }}>{label}</div>
      <div style={{ color: '#1A1A1A', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  )
}

function HeroMetric({ label, value, color, big }: { label: string; value: string; color?: string; big?: boolean }) {
  return (
    <div>
      <div style={{
        fontSize: 11, fontWeight: 500, color: '#8A8A82',
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
      }}>{label}</div>
      <div style={{
        fontSize: big ? 26 : 18, fontWeight: 600,
        color: color ?? '#1A1A1A',
        fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
      }}>{value}</div>
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
