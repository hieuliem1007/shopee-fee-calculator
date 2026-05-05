import { useState, useEffect, useMemo } from 'react'
import {
  Search, Filter, ChevronLeft, ChevronRight, Loader2,
  Activity, AlertCircle,
} from 'lucide-react'
import { listActivityLog, type ActivityLogRow } from '@/lib/activity-log'

const PAGE_SIZE = 50

// ── Action group filter (theo prefix) ────────────────────────────
const ACTION_GROUPS: { value: string; label: string }[] = [
  { value: 'all',            label: 'Tất cả' },
  { value: 'admin.',         label: 'Admin actions' },
  { value: 'user.',          label: 'User actions' },
  { value: 'profile.',       label: 'Profile' },
  { value: 'fee.',           label: 'Phí' },
  { value: 'category.',      label: 'Ngành hàng' },
  { value: 'system_config.', label: 'Hệ thống' },
]

// ── Action label + icon (19 action có sẵn) ───────────────────────
const ACTION_LABELS: Record<string, { label: string; icon: string }> = {
  'admin.approve_user':            { label: 'Duyệt user',                 icon: '✅' },
  'admin.reject_user':             { label: 'Từ chối user',               icon: '❌' },
  'user.suspended':                { label: 'Tạm khóa user',              icon: '🔒' },
  'user.unsuspended':              { label: 'Mở khóa user',               icon: '🔓' },
  'user.soft_deleted':             { label: 'Xóa user',                   icon: '🗑️' },
  'user.features_granted':         { label: 'Cấp quyền',                  icon: '🛡️' },
  'user.features_revoked':         { label: 'Thu hồi quyền',              icon: '🚫' },
  'user.features_replaced':        { label: 'Thay đổi quyền',             icon: '🔄' },
  'user.profile_updated_by_admin': { label: 'Admin cập nhật profile',     icon: '✏️' },
  'profile.self_updated':          { label: 'User cập nhật profile',      icon: '✏️' },
  'fee.created':                   { label: 'Tạo phí',                    icon: '💰' },
  'fee.updated':                   { label: 'Cập nhật phí',               icon: '💵' },
  'fee.soft_deleted':              { label: 'Xóa phí',                    icon: '🗑️' },
  'category.created':              { label: 'Tạo ngành hàng',             icon: '📦' },
  'category.updated':              { label: 'Cập nhật ngành hàng',        icon: '📝' },
  'category.bulk_imported':        { label: 'Import ngành hàng',          icon: '📥' },
  'category.soft_deleted':         { label: 'Xóa ngành hàng',             icon: '🗑️' },
  'system_config.updated':         { label: 'Cập nhật hệ thống',          icon: '⚙️' },
}

function getActionLabel(action: string): { label: string; icon: string } {
  return ACTION_LABELS[action] ?? { label: action, icon: '•' }
}

// ── Format DD/MM/YYYY HH:mm:ss (đến giây — yêu cầu user) ─────────
function formatDateTimeFull(iso: string): string {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`
}

// ── Render metadata jsonb thành text chi tiết cho admin ──────────
function metadataToText(action: string, metadata: Record<string, unknown> | null): string {
  if (!metadata) return ''
  const m = metadata as Record<string, unknown>
  const target = (m.target_user_id as string) || ''

  switch (action) {
    case 'user.features_granted':
    case 'user.features_revoked':
    case 'user.features_replaced': {
      const granted = (m.granted as string[]) || (m.newly_granted as string[]) || []
      const revoked = (m.revoked as string[]) || []
      const finalList = (m.final_features as string[]) || []
      const parts: string[] = []
      if (granted.length) parts.push(`Cấp: ${granted.join(', ')}`)
      if (revoked.length) parts.push(`Thu hồi: ${revoked.join(', ')}`)
      if (!parts.length && finalList.length) parts.push(`Bộ quyền hiện tại: ${finalList.join(', ')}`)
      return `${parts.join(' · ')}${target ? ` — Target: ${target.slice(0, 8)}…` : ''}`
    }

    case 'admin.approve_user': {
      const featuresGranted = (m.features_granted as string[]) || []
      const featStr = featuresGranted.length ? ` · Cấp default: ${featuresGranted.join(', ')}` : ''
      return `Target: ${target.slice(0, 8) || '—'}${featStr}`
    }

    case 'admin.reject_user': {
      const reason = (m.reason as string) || ''
      return `Target: ${target.slice(0, 8) || '—'}${reason ? ` — Lý do: ${reason}` : ''}`
    }

    case 'user.suspended':
    case 'user.unsuspended':
    case 'user.soft_deleted': {
      const reason = (m.reason as string) || ''
      return `Target: ${target.slice(0, 8) || '—'}${reason ? ` — Lý do: ${reason}` : ''}`
    }

    case 'user.profile_updated_by_admin': {
      const fields = (m.changed_fields as string[]) || []
      const count = (m.change_count as number) ?? fields.length
      return `Target: ${target.slice(0, 8) || '—'}${fields.length ? ` — Đổi: ${fields.join(', ')}` : ''}${count ? ` (${count} field)` : ''}`
    }

    case 'profile.self_updated': {
      const fields = (m.changed_fields as string[]) || []
      return fields.length ? `Đổi: ${fields.join(', ')}` : ''
    }

    case 'fee.created': {
      const key = (m.fee_key as string) || ''
      const label = (m.fee_label as string) || ''
      const value = m.fee_value
      const unit = (m.fee_unit as string) || ''
      const cat = (m.category as string) || ''
      return `"${key}" (${label}) — ${value}${unit === 'percent' ? '%' : 'đ'}${cat ? ` · ${cat}` : ''}`
    }

    case 'fee.updated': {
      const key = (m.fee_key as string) || ''
      const oldVal = m.old_value
      const newVal = m.new_value
      const reason = (m.reason as string) || ''
      const change = oldVal !== undefined && newVal !== undefined ? ` ${oldVal} → ${newVal}` : ''
      const fields = (m.changed_fields as string[]) || []
      const fieldStr = fields.length ? ` · Đổi: ${fields.join(', ')}` : ''
      return `"${key}"${change}${fieldStr}${reason ? ` — Lý do: ${reason}` : ''}`
    }

    case 'fee.soft_deleted': {
      const key = (m.fee_key as string) || ''
      const label = (m.fee_label as string) || ''
      const reason = (m.reason as string) || ''
      return `"${key}"${label ? ` (${label})` : ''}${reason ? ` — Lý do: ${reason}` : ''}`
    }

    case 'category.created': {
      const name = (m.category_name as string) || ''
      const value = m.fee_value
      const unit = (m.fee_unit as string) || ''
      const shop = (m.shop_type as string) || ''
      return `"${name}" — ${value}${unit === 'percent' ? '%' : 'đ'}${shop ? ` · Shop: ${shop}` : ''}`
    }

    case 'category.updated': {
      const name = (m.category_name as string) || ''
      const fields = (m.changed_fields as string[]) || []
      const reason = (m.reason as string) || ''
      const shop = (m.shop_type as string) || ''
      return `"${name}"${fields.length ? ` — Đổi: ${fields.join(', ')}` : ''}${shop ? ` · Shop: ${shop}` : ''}${reason ? ` — Lý do: ${reason}` : ''}`
    }

    case 'category.soft_deleted': {
      const name = (m.category_name as string) || (m.name as string) || ''
      const reason = (m.reason as string) || ''
      return `"${name}"${reason ? ` — Lý do: ${reason}` : ''}`
    }

    case 'category.bulk_imported': {
      const mode = (m.mode as string) || ''
      const shop = (m.shop_type as string) || ''
      const imported = (m.imported as number) ?? 0
      const updated = (m.updated as number) ?? 0
      const skipped = (m.skipped as number) ?? 0
      return `Mode: ${mode}${shop ? ` · Shop: ${shop}` : ''} — Thêm: ${imported}, Cập nhật: ${updated}, Bỏ qua: ${skipped}`
    }

    case 'system_config.updated': {
      const key = (m.key as string) || ''
      const oldVal = m.old_value
      const newVal = m.new_value
      const change = oldVal !== undefined && newVal !== undefined
        ? ` ${JSON.stringify(oldVal)} → ${JSON.stringify(newVal)}`
        : ''
      return `"${key}"${change}`
    }

    default: {
      try {
        const s = JSON.stringify(metadata)
        return s.length > 200 ? s.slice(0, 200) + '…' : s
      } catch {
        return String(metadata)
      }
    }
  }
}

// ── Convert YYYY-MM-DD (date input) → ISO timestamp ──────────────
function dateInputToISOFrom(d: string): string | undefined {
  if (!d) return undefined
  return new Date(`${d}T00:00:00`).toISOString()
}
function dateInputToISOTo(d: string): string | undefined {
  if (!d) return undefined
  return new Date(`${d}T23:59:59.999`).toISOString()
}

// ── ActionBadge ──────────────────────────────────────────────────
function ActionBadge({ action }: { action: string }) {
  const { label, icon } = getActionLabel(action)
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px', borderRadius: 999,
      background: '#F5F2EA', color: '#1A1A1A',
      fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
    }}>
      <span>{icon}</span>
      {label}
    </span>
  )
}

// ── Row ──────────────────────────────────────────────────────────
function ActivityRow({ entry }: { entry: ActivityLogRow }) {
  const detail = metadataToText(entry.action, entry.metadata)
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '180px minmax(180px, 1.2fr) minmax(180px, 220px) minmax(280px, 2fr)',
      gap: 14, alignItems: 'center',
      padding: '12px 20px', borderBottom: '1px solid #F5F2EA',
      background: '#fff',
    }}>
      <div style={{ fontSize: 12, color: '#6B6B66', fontVariantNumeric: 'tabular-nums' }}>
        {formatDateTimeFull(entry.created_at)}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 13, color: '#1A1A1A', fontWeight: 500,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {entry.user_full_name || '—'}
        </div>
        <div style={{
          fontSize: 11, color: '#8A8A82',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {entry.user_email ?? <span style={{ color: '#A8A89E', fontStyle: 'italic' }}>— (user đã xóa)</span>}
        </div>
      </div>
      <div>
        <ActionBadge action={entry.action} />
      </div>
      <div style={{
        fontSize: 12, color: '#4B4B45', lineHeight: 1.5,
        overflow: 'hidden', textOverflow: 'ellipsis',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
      }} title={detail}>
        {detail || <span style={{ color: '#A8A89E' }}>—</span>}
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────
export function ActivityLogPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [actionGroup, setActionGroup] = useState<string>('all')
  const [from, setFrom] = useState('')  // YYYY-MM-DD
  const [to, setTo] = useState('')
  const [page, setPage] = useState(0)
  const [rows, setRows] = useState<ActivityLogRow[]>([])
  const [total, setTotal] = useState(0)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Debounce search 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  // Reset page when filters change
  useEffect(() => {
    setPage(0)
  }, [debouncedSearch, actionGroup, from, to])

  // Fetch
  useEffect(() => {
    let cancelled = false
    setFetching(true)
    setError(null)
    listActivityLog({
      search: debouncedSearch || undefined,
      actionPrefix: actionGroup === 'all' ? undefined : actionGroup,
      from: dateInputToISOFrom(from),
      to: dateInputToISOTo(to),
      offset: page * PAGE_SIZE,
      limit: PAGE_SIZE,
    }).then(res => {
      if (cancelled) return
      if (res.error) {
        setError(res.error)
        setRows([])
        setTotal(0)
      } else if (res.data) {
        setRows(res.data.rows)
        setTotal(res.data.total)
      }
      setFetching(false)
    })
    return () => { cancelled = true }
  }, [debouncedSearch, actionGroup, from, to, page])

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total]
  )
  const hasPrev = page > 0
  const hasNext = page < totalPages - 1
  const fromIdx = total === 0 ? 0 : page * PAGE_SIZE + 1
  const toIdx = Math.min((page + 1) * PAGE_SIZE, total)

  const filtered = !!(debouncedSearch || actionGroup !== 'all' || from || to)

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1400 }}>
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: '#1A1A1A' }}>
          Hoạt động hệ thống
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B6B66' }}>
          {fetching ? 'Đang tải…' : `${total.toLocaleString('vi-VN')} hoạt động${filtered ? ' khớp bộ lọc' : ''}`}
        </p>
      </div>

      {/* Filter bar */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 320 }}>
          <Search
            size={14} color="#8A8A82"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm email/tên user…"
            style={{
              width: '100%', padding: '9px 12px 9px 34px', borderRadius: 8,
              border: '1px solid #EFEAE0', background: '#fff',
              fontSize: 13, color: '#1A1A1A', outline: 'none',
              fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Action group */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '0 12px', borderRadius: 8,
          border: '1px solid #EFEAE0', background: '#fff', height: 36,
        }}>
          <Filter size={13} color="#8A8A82" />
          <select
            value={actionGroup}
            onChange={e => setActionGroup(e.target.value)}
            style={{
              border: 'none', background: 'transparent', outline: 'none',
              fontSize: 13, color: '#1A1A1A', fontFamily: 'inherit',
              cursor: 'pointer', paddingRight: 4,
            }}
          >
            {ACTION_GROUPS.map(g => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </div>

        {/* Date range */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#6B6B66' }}>Từ</span>
          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            style={{
              padding: '8px 10px', borderRadius: 8,
              border: '1px solid #EFEAE0', background: '#fff',
              fontSize: 12, color: '#1A1A1A', outline: 'none',
              fontFamily: 'inherit', height: 36, boxSizing: 'border-box',
            }}
          />
          <span style={{ fontSize: 12, color: '#6B6B66' }}>đến</span>
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            style={{
              padding: '8px 10px', borderRadius: 8,
              border: '1px solid #EFEAE0', background: '#fff',
              fontSize: 12, color: '#1A1A1A', outline: 'none',
              fontFamily: 'inherit', height: 36, boxSizing: 'border-box',
            }}
          />
        </div>

        {filtered && (
          <button
            onClick={() => { setSearch(''); setActionGroup('all'); setFrom(''); setTo('') }}
            style={{
              padding: '8px 14px', borderRadius: 8,
              border: '1px solid #EFEAE0', background: '#fff',
              fontSize: 12, color: '#6B6B66', cursor: 'pointer',
              fontFamily: 'inherit', height: 36,
            }}
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{
        background: '#fff', border: '1px solid #EFEAE0', borderRadius: 12,
        overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        {/* Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '180px minmax(180px, 1.2fr) minmax(180px, 220px) minmax(280px, 2fr)',
          gap: 14, alignItems: 'center',
          padding: '11px 20px', background: '#FAFAF7',
          borderBottom: '1px solid #EFEAE0',
          fontSize: 11, fontWeight: 600, color: '#8A8A82',
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          <span>Thời gian</span>
          <span>User</span>
          <span>Action</span>
          <span>Chi tiết</span>
        </div>

        {fetching ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <Loader2 size={24} color="#F5B81C" style={{ animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : error ? (
          <div style={{ padding: '56px 20px', textAlign: 'center' }}>
            <AlertCircle size={28} color="#A82928" style={{ marginBottom: 10 }} />
            <div style={{ fontSize: 14, fontWeight: 500, color: '#991B1B', marginBottom: 6 }}>
              {error.includes('Unauthorized') ? 'Bạn không có quyền truy cập trang này' : 'Lỗi tải dữ liệu'}
            </div>
            <div style={{ fontSize: 12, color: '#8A8A82' }}>
              {error.includes('Unauthorized') ? 'Chỉ admin mới được xem hoạt động hệ thống.' : error}
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '56px 20px', textAlign: 'center' }}>
            <Activity size={28} color="#D1D5DB" style={{ marginBottom: 10 }} />
            <div style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A', marginBottom: 6 }}>
              {filtered ? 'Không có hoạt động khớp bộ lọc' : 'Chưa có hoạt động nào'}
            </div>
            <div style={{ fontSize: 12, color: '#8A8A82' }}>
              {filtered ? 'Thử thay đổi từ khóa hoặc khoảng thời gian.' : 'Khi admin/user thực hiện thao tác, log sẽ hiện ở đây.'}
            </div>
          </div>
        ) : (
          rows.map(entry => <ActivityRow key={entry.id} entry={entry} />)
        )}
      </div>

      {/* Pagination */}
      {!fetching && !error && rows.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 14, marginTop: 18,
        }}>
          <div style={{ fontSize: 12, color: '#6B6B66' }}>
            Hiển thị {fromIdx.toLocaleString('vi-VN')}–{toIdx.toLocaleString('vi-VN')} / {total.toLocaleString('vi-VN')} hoạt động
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
