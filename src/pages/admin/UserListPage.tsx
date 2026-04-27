import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Search, Filter, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { listUsers } from '@/lib/auth'
import type { Profile, ProfileStatus } from '@/lib/supabase'

const PAGE_SIZE = 50

type StatusFilter = ProfileStatus | 'all'

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'active', label: 'Đang hoạt động' },
  { value: 'rejected', label: 'Đã từ chối' },
  { value: 'suspended', label: 'Đã khóa' },
  { value: 'deleted', label: 'Đã xóa' },
]

const STATUS_LABEL: Record<ProfileStatus, string> = {
  pending: 'Chờ duyệt',
  active: 'Hoạt động',
  rejected: 'Từ chối',
  suspended: 'Đã khóa',
  deleted: 'Đã xóa',
}

const STATUS_BADGE: Record<ProfileStatus, { bg: string; text: string }> = {
  pending: { bg: '#FCD34D', text: '#92400E' },
  active: { bg: '#86EFAC', text: '#166534' },
  rejected: { bg: '#FCA5A5', text: '#991B1B' },
  suspended: { bg: '#FDBA74', text: '#9A3412' },
  deleted: { bg: '#D1D5DB', text: '#4B5563' },
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'Chưa đăng nhập'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (days >= 30) return `${Math.floor(days / 30)} tháng trước`
  if (days > 0) return `${days} ngày trước`
  if (hrs > 0) return `${hrs} giờ trước`
  if (mins > 0) return `${mins} phút trước`
  return 'Vừa xong'
}

function StatusBadge({ status }: { status: ProfileStatus }) {
  const { bg, text } = STATUS_BADGE[status]
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 999,
      background: bg, color: text, fontSize: 11, fontWeight: 600,
      letterSpacing: '0.02em', whiteSpace: 'nowrap',
    }}>
      {STATUS_LABEL[status]}
    </span>
  )
}

function UserRow({ user, onClick }: { user: Profile; onClick: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '40px minmax(140px, 1.2fr) minmax(160px, 1.4fr) 130px 110px minmax(120px, 1fr) 110px 130px',
        gap: 14, alignItems: 'center',
        padding: '12px 20px', borderBottom: '1px solid #F5F2EA',
        background: hover ? '#FAFAF7' : '#fff', cursor: 'pointer',
        transition: 'background 0.15s',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: 'linear-gradient(135deg, #F5B81C 0%, #E8A60E 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#1A1A1A',
      }}>
        <User size={16} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {user.full_name}
      </div>
      <div style={{ fontSize: 12, color: '#6B6B66', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {user.email}
      </div>
      <div style={{ fontSize: 12, color: '#6B6B66' }}>
        {user.phone || '—'}
      </div>
      <div>
        <StatusBadge status={user.status} />
      </div>
      <div style={{ fontSize: 12, color: '#6B6B66', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {user.package_label || <span style={{ color: '#A8A89E' }}>—</span>}
      </div>
      <div style={{ fontSize: 12, color: '#6B6B66' }}>
        {formatDate(user.created_at)}
      </div>
      <div style={{ fontSize: 12, color: '#A8A89E' }}>
        {formatRelative(user.last_login_at)}
      </div>
    </div>
  )
}

export function UserListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [page, setPage] = useState(0)
  const [users, setUsers] = useState<Profile[]>([])
  const [total, setTotal] = useState(0)
  const [fetching, setFetching] = useState(true)

  // Debounce search input → 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  // Reset page when filters change
  useEffect(() => {
    setPage(0)
  }, [debouncedSearch, status])

  // Fetch list
  useEffect(() => {
    let cancelled = false
    setFetching(true)
    listUsers({
      status,
      search: debouncedSearch,
      page,
      pageSize: PAGE_SIZE,
    }).then(res => {
      if (cancelled) return
      setUsers(res.users)
      setTotal(res.total)
      setFetching(false)
    })
    return () => { cancelled = true }
  }, [status, debouncedSearch, page])

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total]
  )

  const hasPrev = page > 0
  const hasNext = page < totalPages - 1

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1280 }}>
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: '#1A1A1A' }}>
          Tất cả user
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B6B66' }}>
          {fetching ? 'Đang tải…' : `${total} user${debouncedSearch || status !== 'all' ? ' khớp bộ lọc' : ''}`}
        </p>
      </div>

      {/* Filter bar */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center',
      }}>
        {/* Search */}
        <div style={{
          position: 'relative', flex: '1 1 280px', maxWidth: 420,
        }}>
          <Search
            size={14}
            color="#8A8A82"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tên, email, số điện thoại…"
            style={{
              width: '100%', padding: '9px 12px 9px 34px', borderRadius: 8,
              border: '1px solid #EFEAE0', background: '#fff',
              fontSize: 13, color: '#1A1A1A', outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Status filter */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '0 12px 0 12px', borderRadius: 8,
          border: '1px solid #EFEAE0', background: '#fff', height: 36,
        }}>
          <Filter size={13} color="#8A8A82" />
          <select
            value={status}
            onChange={e => setStatus(e.target.value as StatusFilter)}
            style={{
              border: 'none', background: 'transparent', outline: 'none',
              fontSize: 13, color: '#1A1A1A', fontFamily: 'inherit',
              cursor: 'pointer', paddingRight: 4,
            }}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{
        background: '#fff', border: '1px solid #EFEAE0', borderRadius: 12,
        overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '40px minmax(140px, 1.2fr) minmax(160px, 1.4fr) 130px 110px minmax(120px, 1fr) 110px 130px',
          gap: 14, alignItems: 'center',
          padding: '11px 20px', background: '#FAFAF7',
          borderBottom: '1px solid #EFEAE0',
          fontSize: 11, fontWeight: 600, color: '#8A8A82',
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          <span></span>
          <span>Họ tên</span>
          <span>Email</span>
          <span>Số ĐT</span>
          <span>Trạng thái</span>
          <span>Gói</span>
          <span>Đăng ký</span>
          <span>Đăng nhập</span>
        </div>

        {fetching ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <Loader2 size={24} color="#F5B81C" style={{ animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '56px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#1A1A1A', marginBottom: 6 }}>
              Không tìm thấy user nào
            </div>
            <div style={{ fontSize: 13, color: '#8A8A82' }}>
              Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.
            </div>
          </div>
        ) : (
          users.map(u => (
            <UserRow
              key={u.id}
              user={u}
              onClick={() => navigate(`/admin/users/${u.id}`)}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {!fetching && users.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 14, marginTop: 18,
        }}>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={!hasPrev}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '7px 12px', borderRadius: 8,
              border: '1px solid #EFEAE0', background: '#fff',
              fontSize: 13, color: hasPrev ? '#1A1A1A' : '#A8A89E',
              cursor: hasPrev ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
            }}
          >
            <ChevronLeft size={14} /> Trước
          </button>
          <span style={{ fontSize: 13, color: '#6B6B66', minWidth: 90, textAlign: 'center' }}>
            Trang {page + 1}/{totalPages}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={!hasNext}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '7px 12px', borderRadius: 8,
              border: '1px solid #EFEAE0', background: '#fff',
              fontSize: 13, color: hasNext ? '#1A1A1A' : '#A8A89E',
              cursor: hasNext ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
            }}
          >
            Sau <ChevronRight size={14} />
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
