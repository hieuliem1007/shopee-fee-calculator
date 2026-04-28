import { useEffect, useState } from 'react'
import { Share2, Copy, Check, X, Loader2, RefreshCw, AlertTriangle } from 'lucide-react'
import { createShareLink } from '@/lib/saved-results'

interface Props {
  open: boolean
  onClose: () => void
  resultId: string
  existingSlug: string | null
  resultName: string
  onSlugChanged?: (slug: string) => void
}

type ViewState = 'ready' | 'creating' | 'created' | 'recreating' | 'confirm_recreate'

export function ShareLinkDialog({
  open, onClose, resultId, existingSlug, resultName, onSlugChanged,
}: Props) {
  const [state, setState] = useState<ViewState>('ready')
  const [slug, setSlug] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Re-init khi dialog mở hoặc existingSlug đổi
  useEffect(() => {
    if (!open) return
    setError(null)
    setCopied(false)
    if (existingSlug) {
      setSlug(existingSlug)
      setState('created')
    } else {
      setSlug(null)
      setState('ready')
    }
  }, [open, existingSlug])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state !== 'creating' && state !== 'recreating') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, state, onClose])

  if (!open) return null

  const fullUrl = slug ? window.location.origin + '/share/' + slug : ''

  const handleCreate = async () => {
    setState('creating')
    setError(null)
    const { data, error: err } = await createShareLink(resultId)
    if (err || !data) {
      setError(err ?? 'Không tạo được link')
      setState('ready')
      return
    }
    setSlug(data.slug)
    setState('created')
    onSlugChanged?.(data.slug)
  }

  const handleRecreateConfirmed = async () => {
    setState('recreating')
    setError(null)
    const { data, error: err } = await createShareLink(resultId)
    if (err || !data) {
      setError(err ?? 'Không tạo lại được link')
      setState('created')
      return
    }
    setSlug(data.slug)
    setCopied(false)
    setState('created')
    onSlugChanged?.(data.slug)
  }

  const handleCopy = async () => {
    if (!fullUrl) return
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Không copy được. Vui lòng copy thủ công.')
    }
  }

  const busy = state === 'creating' || state === 'recreating'

  return (
    <div onClick={() => !busy && onClose()} style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 520, maxWidth: '92vw',
        background: '#fff', borderRadius: 16, padding: '22px 26px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{
            margin: 0, fontSize: 16, fontWeight: 700, color: '#1A1A1A',
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            {state === 'created' || state === 'recreating'
              ? 'Link chia sẻ đã sẵn sàng'
              : state === 'confirm_recreate'
                ? 'Tạo lại link mới?'
                : 'Chia sẻ kết quả'}
          </h2>
          <button onClick={onClose} disabled={busy} style={{
            width: 28, height: 28, padding: 0, border: 'none',
            background: 'transparent', cursor: busy ? 'not-allowed' : 'pointer',
            color: '#6B6B66', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Body — varies by state */}
        {state === 'confirm_recreate' ? (
          <div>
            <div style={{
              padding: '12px 14px', borderRadius: 8,
              background: '#FEF9E7', border: '1px solid #FCD34D',
              display: 'flex', gap: 10,
            }}>
              <AlertTriangle size={16} color="#92400E" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 13, color: '#92400E', lineHeight: 1.6 }}>
                Link cũ sẽ không còn dùng được. Người đã có link cũ sẽ thấy thông báo "Link không tồn tại". Tiếp tục?
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
              <button onClick={() => setState('created')} style={btnSecondary}>Hủy</button>
              <button onClick={handleRecreateConfirmed} style={btnDanger}>
                <RefreshCw size={13} /> Tạo lại
              </button>
            </div>
          </div>
        ) : state === 'created' || state === 'recreating' ? (
          <div>
            <div style={{
              display: 'flex', gap: 8, alignItems: 'stretch',
              border: '1px solid #EFEAE0', borderRadius: 8,
              background: '#FAFAF7', padding: 4,
            }}>
              <input
                readOnly
                value={fullUrl}
                onFocus={e => e.currentTarget.select()}
                style={{
                  flex: 1, padding: '8px 10px',
                  border: 'none', background: 'transparent',
                  fontSize: 13, color: '#1A1A1A',
                  outline: 'none', fontFamily: 'monospace',
                }}
              />
              <button onClick={handleCopy} disabled={state === 'recreating'} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 6, border: 'none',
                background: copied ? '#1D9E75' : '#1A1A1A',
                color: '#fff', fontSize: 12, fontWeight: 500,
                cursor: state === 'recreating' ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                transition: 'background 0.15s',
              }}>
                {copied ? <><Check size={13} /> Đã copy</> : <><Copy size={13} /> Copy link</>}
              </button>
            </div>

            <div style={{
              marginTop: 14, padding: '10px 14px', borderRadius: 8,
              background: '#F0F9FF', border: '1px solid #BAE6FD',
              fontSize: 12, color: '#0C4A6E', lineHeight: 1.7,
            }}>
              <div>ℹ️ Bất kỳ ai có link đều có thể xem kết quả (không cần đăng nhập).</div>
              <div>ℹ️ Link tự hết hạn cùng lúc với kết quả gốc (≈90 ngày).</div>
            </div>

            {error && <ErrorBox message={error} />}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 18 }}>
              <button
                onClick={() => setState('confirm_recreate')}
                disabled={state === 'recreating'}
                style={{ ...btnSecondary, opacity: state === 'recreating' ? 0.5 : 1 }}
              >
                <RefreshCw size={13} /> Tạo lại link mới
              </button>
              <button onClick={onClose} style={btnPrimary}>Đóng</button>
            </div>
          </div>
        ) : (
          // ready / creating
          <div>
            <p style={{ margin: 0, fontSize: 13, color: '#6B6B66', lineHeight: 1.7 }}>
              Tạo link công khai để chia sẻ kết quả <strong style={{ color: '#1A1A1A' }}>{resultName}</strong>.
            </p>
            <ul style={{
              margin: '12px 0 0', paddingLeft: 18,
              fontSize: 12, color: '#6B6B66', lineHeight: 1.8,
            }}>
              <li>Bất kỳ ai có link đều có thể xem kết quả (không cần đăng nhập).</li>
              <li>Link sẽ hết hạn cùng lúc với kết quả gốc (≈90 ngày).</li>
              <li>Bạn có thể tạo lại link mới bất cứ lúc nào — link cũ sẽ ngừng hoạt động.</li>
            </ul>

            {error && <ErrorBox message={error} />}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
              <button onClick={onClose} disabled={busy} style={btnSecondary}>Hủy</button>
              <button onClick={handleCreate} disabled={busy} style={btnPrimary}>
                {state === 'creating'
                  ? <Loader2 size={13} style={{ animation: 'spin 0.7s linear infinite' }} />
                  : <Share2 size={13} />}
                Tạo link chia sẻ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div style={{
      marginTop: 12, padding: '10px 14px', borderRadius: 8,
      background: '#FEF2F2', border: '1px solid #FCA5A5',
      color: '#991B1B', fontSize: 13,
    }}>
      {message}
    </div>
  )
}

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '9px 18px', borderRadius: 8, border: 'none',
  background: '#F5B81C', color: '#1A1A1A',
  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  boxShadow: '0 1px 0 rgba(255,255,255,0.4) inset, 0 2px 6px rgba(245,184,28,0.30)',
}

const btnSecondary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '9px 16px', borderRadius: 8, border: '1px solid #EFEAE0',
  background: '#fff', color: '#1A1A1A',
  fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
}

const btnDanger: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '9px 16px', borderRadius: 8, border: 'none',
  background: '#A82928', color: '#fff',
  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
}
