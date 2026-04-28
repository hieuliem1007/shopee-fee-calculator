import { useEffect, useState, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Search, Plus, Eye, Trash2, X, Inbox, ChevronLeft, ChevronRight, Loader2,
} from 'lucide-react'
import { listMyResults, deleteResult, type SavedResultRow } from '@/lib/saved-results'
import { fmtVND, fmtPct } from '@/lib/utils'
import { relativeTime, daysUntil, expiryLabel } from '@/lib/format'
import { Toast, type ToastState } from '@/components/ui/Toast'

const PAGE_SIZE = 20

export function DashboardPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [rows, setRows] = useState<SavedResultRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)

  // Flash toast khi navigate tới /app với state.toast (vd: từ Detail page sau xóa)
  useEffect(() => {
    const flash = (location.state as { toast?: string } | null)?.toast
    if (flash) {
      setToast({ kind: 'success', message: flash })
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location, navigate])

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim())
      setOffset(0)
    }, 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await listMyResults(search || undefined, offset, PAGE_SIZE)
    if (err || !data) {
      setError(err ?? 'Không tải được danh sách')
      setLoading(false)
      return
    }
    setRows(data.rows)
    setTotal(data.total)
    setLoading(false)
  }, [search, offset])

  useEffect(() => { fetchData() }, [fetchData])

  const showToast = (kind: 'success' | 'error', message: string) => {
    setToast({ kind, message })
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    const id = confirmDelete.id
    setDeletingId(id)
    const { error: err } = await deleteResult(id)
    setDeletingId(null)
    setConfirmDelete(null)
    if (err) {
      showToast('error', err)
      return
    }
    showToast('success', 'Đã xóa kết quả')
    // Nếu xóa row cuối của trang cuối → lùi 1 trang
    const willBeEmpty = rows.length === 1 && offset > 0
    if (willBeEmpty) setOffset(Math.max(0, offset - PAGE_SIZE))
    else fetchData()
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1
  const rangeFrom = total === 0 ? 0 : offset + 1
  const rangeTo = Math.min(offset + rows.length, total)

  return (
    <div style={{ padding: 32, maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{
          margin: 0, fontSize: 22, fontWeight: 700, color: '#1A1A1A',
          textTransform: 'uppercase', letterSpacing: '0.02em',
        }}>
          Kết quả đã lưu
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B6B66' }}>
          Tổng <strong>{total}</strong> kết quả · Tự động xóa sau 90 ngày
        </p>
      </div>

      {/* Action row */}
      <div style={{
        display: 'flex', gap: 12, alignItems: 'center', marginBottom: 18,
        flexWrap: 'wrap',
      }}>
        <div style={{
          flex: 1, minWidth: 240, position: 'relative',
        }}>
          <Search size={14} color="#8A8A82" style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          }} />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Tìm theo tên sản phẩm..."
            style={{
              width: '100%', padding: '9px 12px 9px 34px', borderRadius: 8,
              border: '1px solid #EFEAE0', background: '#fff',
              fontSize: 13, color: '#1A1A1A', outline: 'none',
              fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />
        </div>
        <button onClick={() => navigate('/app/shopee-calculator')} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '9px 16px', borderRadius: 8, border: 'none',
          background: '#F5B81C', color: '#1A1A1A',
          fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 1px 0 rgba(255,255,255,0.4) inset, 0 2px 6px rgba(245,184,28,0.30)',
        }}>
          <Plus size={14} /> Tính toán mới
        </button>
      </div>

      {/* Body */}
      {loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center' }}>
          <Loader2 size={28} color="#F5B81C" style={{ animation: 'spin 0.7s linear infinite' }} />
        </div>
      ) : error ? (
        <div style={{
          padding: '20px 24px', borderRadius: 12,
          background: '#FEF2F2', border: '1px solid #FCA5A5',
          color: '#991B1B', fontSize: 13,
        }}>
          {error}
        </div>
      ) : total === 0 && !search ? (
        <EmptyState onCreate={() => navigate('/app/shopee-calculator')} />
      ) : total === 0 && search ? (
        <div style={{
          padding: '40px 20px', textAlign: 'center',
          border: '1px dashed #EFEAE0', borderRadius: 12,
          color: '#8A8A82', fontSize: 13,
        }}>
          Không tìm thấy kết quả nào khớp với "<strong>{search}</strong>"
        </div>
      ) : (
        <>
          <ResultsTable
            rows={rows}
            deletingId={deletingId}
            onView={(id) => navigate('/app/saved/' + id)}
            onAskDelete={(id, name) => setConfirmDelete({ id, name })}
          />

          {totalPages > 1 && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginTop: 16, padding: '0 4px',
              fontSize: 12, color: '#6B6B66',
            }}>
              <span>
                Hiển thị <strong>{rangeFrom}–{rangeTo}</strong> / <strong>{total}</strong> kết quả
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PageBtn disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
                  <ChevronLeft size={14} />
                </PageBtn>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  Trang <strong>{currentPage}</strong>/{totalPages}
                </span>
                <PageBtn disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)}>
                  <ChevronRight size={14} />
                </PageBtn>
              </div>
            </div>
          )}
        </>
      )}

      {confirmDelete && (
        <DeleteDialog
          name={confirmDelete.name}
          deleting={deletingId === confirmDelete.id}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={handleDelete}
        />
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div style={{
      padding: '60px 20px', textAlign: 'center',
      background: '#fff', border: '1px solid #EFEAE0', borderRadius: 16,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: '#FAF6E8',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 18px',
      }}>
        <Inbox size={28} color="#C99A0E" />
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#1A1A1A', marginBottom: 6 }}>
        Chưa có kết quả nào được lưu
      </div>
      <div style={{ fontSize: 13, color: '#6B6B66', marginBottom: 18 }}>
        Vào "Tính toán mới" để tạo và lưu kết quả đầu tiên.
      </div>
      <button onClick={onCreate} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '10px 20px', borderRadius: 8, border: 'none',
        background: '#F5B81C', color: '#1A1A1A',
        fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        boxShadow: '0 1px 0 rgba(255,255,255,0.4) inset, 0 2px 6px rgba(245,184,28,0.30)',
      }}>
        <Plus size={14} /> Tính toán mới
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────

interface RowsProps {
  rows: SavedResultRow[]
  deletingId: string | null
  onView: (id: string) => void
  onAskDelete: (id: string, displayName: string) => void
}

function ResultsTable({ rows, deletingId, onView, onAskDelete }: RowsProps) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #EFEAE0', borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1.2fr 0.7fr 1fr 0.9fr 0.9fr',
        padding: '11px 16px', background: '#FAFAF7',
        borderBottom: '1px solid #EFEAE0',
        fontSize: 11, fontWeight: 600, color: '#8A8A82',
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        <div>Tên kết quả</div>
        <div style={{ textAlign: 'right' }}>Giá bán</div>
        <div style={{ textAlign: 'right' }}>Lợi nhuận</div>
        <div style={{ textAlign: 'right' }}>LN %</div>
        <div>Ngày lưu</div>
        <div>Hết hạn</div>
        <div style={{ textAlign: 'right' }}>Action</div>
      </div>
      {rows.map(r => <Row key={r.id} r={r} deletingId={deletingId} onView={onView} onAskDelete={onAskDelete} />)}
    </div>
  )
}

function Row({ r, deletingId, onView, onAskDelete }: { r: SavedResultRow } & Omit<RowsProps, 'rows'>) {
  const sellPrice = Number((r.inputs as { sellPrice?: number }).sellPrice ?? 0)
  const profit = Number((r.results as { profit?: number }).profit ?? 0)
  const profitPct = Number((r.results as { profitPct?: number }).profitPct ?? 0)

  const profitColor = profit > 0 ? '#1D9E75' : profit < 0 ? '#A82928' : '#C99A0E'

  const days = daysUntil(r.expires_at)
  const expiryColor = days < 1 ? '#A82928' : days < 7 ? '#C2410C' : '#6B6B66'

  const displayName = r.product_name?.trim() || '(chưa đặt tên)'
  const isPlaceholder = !r.product_name?.trim()
  const isDeleting = deletingId === r.id

  return (
    <div
      onClick={() => !isDeleting && onView(r.id)}
      style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1.2fr 0.7fr 1fr 0.9fr 0.9fr',
        padding: '14px 16px', alignItems: 'center',
        borderBottom: '1px solid #F5F2EA',
        fontSize: 13, color: '#1A1A1A',
        cursor: isDeleting ? 'wait' : 'pointer',
        opacity: isDeleting ? 0.5 : 1,
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => { if (!isDeleting) (e.currentTarget as HTMLElement).style.background = '#FAFAF7' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      <div style={{
        fontWeight: 500,
        color: isPlaceholder ? '#A8A89E' : '#1A1A1A',
        fontStyle: isPlaceholder ? 'italic' : 'normal',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12,
      }}>{displayName}</div>
      <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtVND(sellPrice)}</div>
      <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: profitColor, fontWeight: 600 }}>
        {fmtVND(profit)}
      </div>
      <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: profitColor, fontWeight: 500 }}>
        {fmtPct(profitPct)}
      </div>
      <div style={{ color: '#6B6B66' }}>{relativeTime(r.created_at)}</div>
      <div style={{ color: expiryColor, fontWeight: days < 7 ? 600 : 400 }}>{expiryLabel(r.expires_at)}</div>
      <div
        onClick={e => e.stopPropagation()}
        style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}
      >
        <ActionBtn icon={<Eye size={13} />} label="Xem" onClick={() => onView(r.id)} />
        <ActionBtn
          icon={isDeleting ? <Loader2 size={13} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Trash2 size={13} />}
          label="Xóa"
          danger
          disabled={isDeleting}
          onClick={() => onAskDelete(r.id, displayName)}
        />
      </div>
    </div>
  )
}

function ActionBtn({ icon, label, onClick, danger, disabled }: {
  icon: React.ReactNode; label: string;
  onClick: () => void; danger?: boolean; disabled?: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '5px 10px', borderRadius: 6,
      border: '1px solid ' + (danger ? '#FCA5A5' : '#EFEAE0'),
      background: '#fff', color: danger ? '#A82928' : '#1A1A1A',
      fontSize: 12, fontWeight: 500,
      cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
      opacity: disabled ? 0.5 : 1,
    }}>
      {icon} {label}
    </button>
  )
}

function PageBtn({ children, onClick, disabled }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: 28, height: 28, padding: 0, borderRadius: 6,
      border: '1px solid #EFEAE0', background: disabled ? '#FAFAF7' : '#fff',
      color: disabled ? '#C9C5BA' : '#1A1A1A',
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'inherit',
    }}>
      {children}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────

function DeleteDialog({ name, deleting, onCancel, onConfirm }: {
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
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <button onClick={onCancel} disabled={deleting} style={{
            padding: '8px 16px', borderRadius: 8, border: '1px solid #EFEAE0',
            background: '#fff', fontSize: 13, fontWeight: 500, color: '#1A1A1A',
            cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          }}>Hủy</button>
          <button onClick={onConfirm} disabled={deleting} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: '#A82928', color: '#fff',
            fontSize: 13, fontWeight: 600,
            cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            opacity: deleting ? 0.7 : 1,
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
