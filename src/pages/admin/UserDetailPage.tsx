import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, User, Mail, Phone, Edit2, CheckCircle, XCircle,
  Pause, Play, Trash2, Plus, Minus, Activity, Loader2, AlertCircle,
} from 'lucide-react'
import {
  getUserById, getUserActivityLog,
  approveUser, rejectUser,
  suspendUser, unsuspendUser, softDeleteUser, updateUserProfileAdmin,
  type ActivityLogEntry,
} from '@/lib/auth'
import { useAuth } from '@/contexts/AuthContext'
import type { Profile, ProfileStatus } from '@/lib/supabase'

// ── Constants & helpers ─────────────────────────────────────────────

const STATUS_LABEL: Record<ProfileStatus, string> = {
  pending: 'Chờ duyệt',
  active: 'Đang hoạt động',
  rejected: 'Đã từ chối',
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

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`
}

function formatRelativeShort(iso: string): string {
  const t = new Date(iso).getTime()
  const diff = Date.now() - t
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'Vừa xong'
  if (mins < 60) return `${mins} phút trước`
  if (hrs < 24) return `${hrs} giờ trước`
  if (days === 1) return 'Hôm qua'
  if (days < 7) return `${days} ngày trước`
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

// ── Section / Card wrapper ──────────────────────────────────────────

function Card({ children, padding = 24 }: { children: ReactNode; padding?: number }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #EFEAE0', borderRadius: 12,
      padding, marginBottom: 18,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, color: '#8A8A82',
      letterSpacing: '0.06em', textTransform: 'uppercase',
      marginBottom: 14,
    }}>
      {children}
    </div>
  )
}

// ── Status badge ────────────────────────────────────────────────────

function StatusBadge({ status, large = false }: { status: ProfileStatus; large?: boolean }) {
  const { bg, text } = STATUS_BADGE[status]
  return (
    <span style={{
      display: 'inline-block',
      padding: large ? '5px 14px' : '3px 10px',
      borderRadius: 999,
      background: bg, color: text,
      fontSize: large ? 13 : 11, fontWeight: 600,
      letterSpacing: '0.02em',
    }}>
      {STATUS_LABEL[status]}
    </span>
  )
}

// ── Toast ───────────────────────────────────────────────────────────

type ToastState = { type: 'success' | 'error'; message: string } | null

function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null
  const success = toast.type === 'success'
  return (
    <div style={{
      position: 'fixed', top: 24, right: 24, zIndex: 200,
      padding: '12px 18px', borderRadius: 10,
      background: success ? '#DCFCE7' : '#FEE2E2',
      color: success ? '#166534' : '#991B1B',
      border: `1px solid ${success ? '#86EFAC' : '#FCA5A5'}`,
      fontSize: 13, fontWeight: 500,
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      animation: 'fadeIn 0.2s ease',
      maxWidth: 360,
    }}>
      {toast.message}
    </div>
  )
}

// ── Generic dialog shell ────────────────────────────────────────────

function DialogShell({
  onClose, children,
}: { onClose: () => void; children: ReactNode }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 14, padding: '28px',
        width: '100%', maxWidth: 460,
        boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
      }}>
        {children}
      </div>
    </div>
  )
}

// ── Reason dialog (Reject + Suspend share this) ─────────────────────

function ReasonDialog({
  title, description, confirmLabel, danger = false,
  onConfirm, onCancel,
}: {
  title: string
  description: ReactNode
  confirmLabel: string
  danger?: boolean
  onConfirm: (reason: string) => Promise<void>
  onCancel: () => void
}) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const handle = async () => {
    if (!reason.trim()) {
      setErr('Vui lòng nhập lý do')
      return
    }
    setLoading(true)
    await onConfirm(reason.trim())
    setLoading(false)
  }

  return (
    <DialogShell onClose={onCancel}>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#1A1A1A', marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: '#6B6B66', marginBottom: 18 }}>
        {description}
      </div>
      <textarea
        value={reason}
        onChange={e => { setReason(e.target.value); setErr('') }}
        placeholder="Nhập lý do..."
        rows={3}
        style={{
          width: '100%', padding: '10px 12px', borderRadius: 8,
          border: `1.5px solid ${err ? '#FCA5A5' : '#EFEAE0'}`,
          background: '#FAFAF7', fontSize: 13, color: '#1A1A1A',
          outline: 'none', resize: 'vertical', fontFamily: 'inherit',
          boxSizing: 'border-box',
        }}
      />
      {err && <div style={{ fontSize: 12, color: '#A82928', marginTop: 5 }}>{err}</div>}
      <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} disabled={loading} style={{
          padding: '9px 18px', borderRadius: 8, border: '1px solid #EFEAE0',
          background: '#fff', fontSize: 13, fontWeight: 500,
          cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
        }}>Hủy</button>
        <button onClick={handle} disabled={loading} style={{
          padding: '9px 18px', borderRadius: 8, border: 'none',
          background: danger ? '#A82928' : '#E24B4A',
          color: '#fff', fontSize: 13, fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 6, opacity: loading ? 0.7 : 1,
        }}>
          {loading && <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} />}
          {confirmLabel}
        </button>
      </div>
    </DialogShell>
  )
}

// ── Confirm dialog (Unsuspend + Delete) ─────────────────────────────

function ConfirmDialog({
  title, description, warning, confirmLabel, danger = false,
  onConfirm, onCancel,
}: {
  title: string
  description: ReactNode
  warning?: ReactNode
  confirmLabel: string
  danger?: boolean
  onConfirm: () => Promise<void>
  onCancel: () => void
}) {
  const [loading, setLoading] = useState(false)
  const handle = async () => {
    setLoading(true)
    await onConfirm()
    setLoading(false)
  }
  return (
    <DialogShell onClose={onCancel}>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#1A1A1A', marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: '#6B6B66', marginBottom: warning ? 12 : 18 }}>
        {description}
      </div>
      {warning && (
        <div style={{
          padding: '10px 12px', borderRadius: 8,
          background: '#FEF2F2', border: '1px solid #FCA5A5',
          fontSize: 12, color: '#991B1B', marginBottom: 18,
          display: 'flex', alignItems: 'flex-start', gap: 8,
        }}>
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{warning}</span>
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} disabled={loading} style={{
          padding: '9px 18px', borderRadius: 8, border: '1px solid #EFEAE0',
          background: '#fff', fontSize: 13, fontWeight: 500,
          cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
        }}>Hủy</button>
        <button onClick={handle} disabled={loading} style={{
          padding: '9px 18px', borderRadius: 8, border: 'none',
          background: danger ? '#A82928' : '#1D9E75',
          color: '#fff', fontSize: 13, fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 6, opacity: loading ? 0.7 : 1,
        }}>
          {loading && <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} />}
          {confirmLabel}
        </button>
      </div>
    </DialogShell>
  )
}

// ── Activity log entry rendering ────────────────────────────────────

function activityIcon(action: string) {
  const size = 14
  switch (action) {
    case 'user.approved':
      return { node: <CheckCircle size={size} color="#1D9E75" />, bg: '#DCFCE7' }
    case 'user.rejected':
      return { node: <XCircle size={size} color="#A82928" />, bg: '#FEE2E2' }
    case 'user.suspended':
      return { node: <Pause size={size} color="#9A3412" />, bg: '#FFEDD5' }
    case 'user.unsuspended':
      return { node: <Play size={size} color="#1D9E75" />, bg: '#DCFCE7' }
    case 'user.soft_deleted':
      return { node: <Trash2 size={size} color="#4B5563" />, bg: '#E5E7EB' }
    case 'user.profile_updated_by_admin':
      return { node: <Edit2 size={size} color="#1D4ED8" />, bg: '#DBEAFE' }
    case 'user.features_granted':
      return { node: <Plus size={size} color="#1D9E75" />, bg: '#DCFCE7' }
    case 'user.features_revoked':
      return { node: <Minus size={size} color="#A82928" />, bg: '#FEE2E2' }
    default:
      return { node: <Activity size={size} color="#8A8A82" />, bg: '#F3F4F6' }
  }
}

function activityText(entry: ActivityLogEntry): string {
  const m = entry.metadata || {}
  switch (entry.action) {
    case 'user.approved':
      return 'Đã được duyệt'
    case 'user.rejected': {
      const reason = (m.reason as string) || ''
      return reason ? `Bị từ chối: ${reason}` : 'Bị từ chối'
    }
    case 'user.suspended': {
      const reason = (m.reason as string) || ''
      return reason ? `Bị tạm khóa: ${reason}` : 'Bị tạm khóa'
    }
    case 'user.unsuspended':
      return 'Được mở khóa'
    case 'user.soft_deleted':
      return 'Bị xóa'
    case 'user.profile_updated_by_admin': {
      const n = (m.change_count as number) || 0
      return `Thông tin được cập nhật (${n} field)`
    }
    case 'user.features_granted': {
      const list = (m.newly_granted as string[]) || []
      return list.length ? `Được cấp quyền: ${list.join(', ')}` : 'Được cấp quyền'
    }
    case 'user.features_revoked': {
      const list = (m.revoked as string[]) || []
      return list.length ? `Bị thu hồi quyền: ${list.join(', ')}` : 'Bị thu hồi quyền'
    }
    default:
      return entry.action
  }
}

// ── Profile field row (display + edit modes) ────────────────────────

function FieldRow({
  label, children,
}: { label: string; children: ReactNode }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '160px 1fr',
      gap: 16, alignItems: 'flex-start',
      padding: '12px 0', borderBottom: '1px solid #F5F2EA',
    }}>
      <div style={{ fontSize: 12, color: '#6B6B66', fontWeight: 500, paddingTop: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: '#1A1A1A' }}>
        {children}
      </div>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────

interface EditForm {
  full_name: string
  phone: string
  package_label: string
  package_note: string
}

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user: authUser } = useAuth()

  const [user, setUser] = useState<Profile | null>(null)
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState<EditForm>({
    full_name: '', phone: '', package_label: '', package_note: '',
  })
  const [editErrors, setEditErrors] = useState<{ full_name?: string; phone?: string }>({})
  const [saveLoading, setSaveLoading] = useState(false)

  const [activeDialog, setActiveDialog] = useState<'reject' | 'suspend' | 'unsuspend' | 'delete' | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [toast, setToast] = useState<ToastState>(null)
  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }, [])

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const [u, log] = await Promise.all([
      getUserById(id),
      getUserActivityLog(id, 20),
    ])
    if (!u) {
      setNotFound(true)
    } else {
      setUser(u)
      setActivityLog(log)
      setNotFound(false)
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  // ── Edit handlers ─────────────────────────────────────────────────
  const startEdit = () => {
    if (!user) return
    setEditForm({
      full_name: user.full_name ?? '',
      phone: user.phone ?? '',
      package_label: user.package_label ?? '',
      package_note: user.package_note ?? '',
    })
    setEditErrors({})
    setEditMode(true)
  }

  const cancelEdit = () => {
    setEditMode(false)
    setEditErrors({})
  }

  const handleSave = async () => {
    if (!user) return
    const errs: { full_name?: string; phone?: string } = {}
    if (!editForm.full_name.trim()) errs.full_name = 'Tên không được rỗng'
    if (!editForm.phone.trim()) errs.phone = 'Số điện thoại không được rỗng'
    if (Object.keys(errs).length) {
      setEditErrors(errs)
      return
    }

    // Build delta — only changed fields
    const data: Parameters<typeof updateUserProfileAdmin>[1] = {}
    const norm = (s: string): string | null => {
      const t = s.trim()
      return t === '' ? null : t
    }
    if (editForm.full_name.trim() !== (user.full_name ?? '')) {
      data.full_name = editForm.full_name.trim()
    }
    if (editForm.phone.trim() !== (user.phone ?? '')) {
      data.phone = editForm.phone.trim()
    }
    const newLabel = norm(editForm.package_label)
    if (newLabel !== user.package_label) {
      data.package_label = newLabel
    }
    const newNote = norm(editForm.package_note)
    if (newNote !== user.package_note) {
      data.package_note = newNote
    }

    if (Object.keys(data).length === 0) {
      setEditMode(false)
      return
    }

    setSaveLoading(true)
    const { error } = await updateUserProfileAdmin(user.id, data)
    setSaveLoading(false)
    if (error) {
      showToast('error', error)
      return
    }
    showToast('success', 'Đã lưu thay đổi')
    setEditMode(false)
    await load()
  }

  // ── Status actions ────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!user) return
    setActionLoading(true)
    const { error } = await approveUser(user.id)
    setActionLoading(false)
    if (error) {
      showToast('error', error)
      return
    }
    showToast('success', 'Đã duyệt user')
    await load()
  }

  const handleReject = async (reason: string) => {
    if (!user) return
    const { error } = await rejectUser(user.id, reason)
    if (error) {
      showToast('error', error)
      return
    }
    setActiveDialog(null)
    showToast('success', 'Đã từ chối user')
    setTimeout(() => navigate('/admin/users'), 600)
  }

  const handleSuspend = async (reason: string) => {
    if (!user) return
    const { error } = await suspendUser(user.id, reason)
    if (error) {
      showToast('error', error)
      return
    }
    setActiveDialog(null)
    showToast('success', 'Đã tạm khóa user')
    await load()
  }

  const handleUnsuspend = async () => {
    if (!user) return
    const { error } = await unsuspendUser(user.id)
    if (error) {
      showToast('error', error)
      return
    }
    setActiveDialog(null)
    showToast('success', 'Đã mở khóa user')
    await load()
  }

  const handleDelete = async () => {
    if (!user) return
    const { error } = await softDeleteUser(user.id)
    if (error) {
      showToast('error', error)
      return
    }
    setActiveDialog(null)
    showToast('success', 'Đã xóa user')
    setTimeout(() => navigate('/admin/users'), 600)
  }

  // ── Render guards ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <Loader2 size={28} color="#F5B81C" style={{ animation: 'spin 0.7s linear infinite' }} />
      </div>
    )
  }

  if (notFound || !user) {
    return (
      <div style={{ padding: '28px 32px', maxWidth: 720 }}>
        <button onClick={() => navigate('/admin/users')} style={backButtonStyle}>
          <ArrowLeft size={14} /> Quay lại danh sách
        </button>
        <Card>
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🚫</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#1A1A1A', marginBottom: 6 }}>
              Không tìm thấy user
            </div>
            <div style={{ fontSize: 13, color: '#8A8A82' }}>
              User ID không tồn tại hoặc đã bị xóa.
            </div>
          </div>
        </Card>
      </div>
    )
  }

  const isSelf = authUser?.id === user.id

  return (
    <div style={{ padding: '28px 32px', maxWidth: 880 }}>
      {/* Back */}
      <button onClick={() => navigate('/admin/users')} style={backButtonStyle}>
        <ArrowLeft size={14} /> Quay lại danh sách
      </button>

      {/* Section 1: Thông tin */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <SectionTitle>Thông tin</SectionTitle>
          {!editMode && (
            <button onClick={startEdit} style={editButtonStyle}>
              <Edit2 size={13} /> Chỉnh sửa
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: '#FAFAF7', border: '1px solid #EFEAE0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#8A8A82', flexShrink: 0,
          }}>
            <User size={28} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: '#1A1A1A', marginBottom: 4 }}>
              {user.full_name}
            </div>
            <div style={{ fontSize: 12, color: '#8A8A82' }}>
              Tham gia {formatDateTime(user.created_at)}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 6 }}>
          <FieldRow label="Họ tên">
            {editMode ? (
              <>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={e => {
                    setEditForm(f => ({ ...f, full_name: e.target.value }))
                    setEditErrors(p => ({ ...p, full_name: undefined }))
                  }}
                  style={inputStyle(!!editErrors.full_name)}
                />
                {editErrors.full_name && (
                  <div style={errorTextStyle}>{editErrors.full_name}</div>
                )}
              </>
            ) : user.full_name}
          </FieldRow>

          <FieldRow label="Email">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Mail size={13} color="#8A8A82" />
              <span>{user.email}</span>
              {editMode && (
                <span style={{ fontSize: 11, color: '#A8A89E', fontStyle: 'italic' }}>
                  (Email không đổi được)
                </span>
              )}
            </div>
          </FieldRow>

          <FieldRow label="Số điện thoại">
            {editMode ? (
              <>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={e => {
                    setEditForm(f => ({ ...f, phone: e.target.value }))
                    setEditErrors(p => ({ ...p, phone: undefined }))
                  }}
                  style={inputStyle(!!editErrors.phone)}
                />
                {editErrors.phone && (
                  <div style={errorTextStyle}>{editErrors.phone}</div>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Phone size={13} color="#8A8A82" />
                <span>{user.phone || <span style={{ color: '#A8A89E' }}>—</span>}</span>
              </div>
            )}
          </FieldRow>

          <FieldRow label="Gói">
            {editMode ? (
              <input
                type="text"
                value={editForm.package_label}
                onChange={e => setEditForm(f => ({ ...f, package_label: e.target.value }))}
                placeholder="VD: Free / Pro / Enterprise"
                style={inputStyle(false)}
              />
            ) : (
              user.package_label || <span style={{ color: '#A8A89E' }}>Chưa gán gói</span>
            )}
          </FieldRow>

          <FieldRow label="Ghi chú gói">
            {editMode ? (
              <textarea
                value={editForm.package_note}
                onChange={e => setEditForm(f => ({ ...f, package_note: e.target.value }))}
                rows={3}
                placeholder="Ghi chú nội bộ về gói của user này..."
                style={{
                  ...inputStyle(false),
                  resize: 'vertical', fontFamily: 'inherit',
                }}
              />
            ) : (
              user.package_note
                ? <span style={{ whiteSpace: 'pre-wrap' }}>{user.package_note}</span>
                : <span style={{ color: '#A8A89E' }}>—</span>
            )}
          </FieldRow>
        </div>

        {editMode && (
          <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
            <button onClick={cancelEdit} disabled={saveLoading} style={{
              padding: '9px 18px', borderRadius: 8, border: '1px solid #EFEAE0',
              background: '#fff', fontSize: 13, fontWeight: 500,
              cursor: saveLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}>Hủy</button>
            <button onClick={handleSave} disabled={saveLoading} style={{
              padding: '9px 18px', borderRadius: 8, border: 'none',
              background: '#1D9E75', color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: saveLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 6, opacity: saveLoading ? 0.7 : 1,
            }}>
              {saveLoading && <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} />}
              Lưu thay đổi
            </button>
          </div>
        )}
      </Card>

      {/* Section 2: Trạng thái */}
      <Card>
        <SectionTitle>Trạng thái</SectionTitle>

        <div style={{ marginBottom: 14 }}>
          <StatusBadge status={user.status} large />
        </div>

        {user.status === 'rejected' && user.rejected_reason && (
          <ReasonBlock label="Lý do từ chối:" text={user.rejected_reason} />
        )}
        {user.status === 'suspended' && user.suspended_reason && (
          <ReasonBlock label="Lý do khóa:" text={user.suspended_reason} />
        )}

        {!isSelf && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {user.status === 'pending' && (
              <>
                <button onClick={handleApprove} disabled={actionLoading} style={primaryButtonStyle('#1D9E75')}>
                  {actionLoading
                    ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} />
                    : <CheckCircle size={14} />}
                  Duyệt
                </button>
                <button onClick={() => setActiveDialog('reject')} disabled={actionLoading} style={outlineButtonStyle('#A82928', '#FCA5A5', '#FEF2F2')}>
                  <XCircle size={14} /> Từ chối
                </button>
              </>
            )}
            {user.status === 'active' && (
              <>
                <button onClick={() => setActiveDialog('suspend')} style={outlineButtonStyle('#9A3412', '#FDBA74', '#FFF7ED')}>
                  <Pause size={14} /> Tạm khóa
                </button>
                <button onClick={() => setActiveDialog('delete')} style={outlineButtonStyle('#A82928', '#FCA5A5', '#FEF2F2')}>
                  <Trash2 size={14} /> Xóa user
                </button>
              </>
            )}
            {user.status === 'suspended' && (
              <>
                <button onClick={() => setActiveDialog('unsuspend')} style={primaryButtonStyle('#1D9E75')}>
                  <Play size={14} /> Mở khóa
                </button>
                <button onClick={() => setActiveDialog('delete')} style={outlineButtonStyle('#A82928', '#FCA5A5', '#FEF2F2')}>
                  <Trash2 size={14} /> Xóa user
                </button>
              </>
            )}
          </div>
        )}

        {isSelf && (
          <div style={{
            padding: '10px 12px', borderRadius: 8,
            background: '#FAFAF7', border: '1px solid #EFEAE0',
            fontSize: 12, color: '#6B6B66',
          }}>
            Đây là tài khoản của bạn — không thể tự khóa hoặc tự xóa.
          </div>
        )}
      </Card>

      {/* Section 3: Lịch sử hoạt động */}
      <Card>
        <SectionTitle>Lịch sử hoạt động</SectionTitle>
        {activityLog.length === 0 ? (
          <div style={{ padding: '30px 0', textAlign: 'center' }}>
            <Activity size={28} color="#D1D5DB" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 13, color: '#8A8A82' }}>Chưa có hoạt động nào</div>
          </div>
        ) : (
          <div>
            {activityLog.map(entry => {
              const { node, bg } = activityIcon(entry.action)
              return (
                <div key={entry.id} style={{
                  display: 'flex', gap: 12, padding: '10px 0',
                  borderBottom: '1px solid #F5F2EA',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: bg, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {node}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: '#1A1A1A' }}>
                      {activityText(entry)}
                    </div>
                    <div style={{ fontSize: 11, color: '#A8A89E', marginTop: 2 }}>
                      {formatRelativeShort(entry.created_at)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Section 4: Quyền truy cập */}
      <Card>
        <SectionTitle>Quyền truy cập</SectionTitle>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', gap: 14, flexWrap: 'wrap',
        }}>
          <div style={{ fontSize: 13, color: '#6B6B66' }}>
            Quản lý features được cấp cho user này.
          </div>
          <button
            onClick={() => navigate(`/admin/users/${user.id}/permissions`)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 16px', borderRadius: 8,
              border: '1px solid #EFEAE0', background: '#fff',
              fontSize: 13, fontWeight: 500, color: '#1A1A1A',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Mở trang quản lý quyền →
          </button>
        </div>
      </Card>

      {/* Dialogs */}
      {activeDialog === 'reject' && (
        <ReasonDialog
          title="Từ chối yêu cầu"
          description={<>Từ chối <strong>{user.full_name}</strong> ({user.email}). Lý do sẽ được hiển thị cho user.</>}
          confirmLabel="Xác nhận từ chối"
          onConfirm={handleReject}
          onCancel={() => setActiveDialog(null)}
        />
      )}
      {activeDialog === 'suspend' && (
        <ReasonDialog
          title="Tạm khóa user"
          description={<>Tạm khóa <strong>{user.full_name}</strong> ({user.email}). User sẽ không login được.</>}
          confirmLabel="Xác nhận tạm khóa"
          onConfirm={handleSuspend}
          onCancel={() => setActiveDialog(null)}
        />
      )}
      {activeDialog === 'unsuspend' && (
        <ConfirmDialog
          title="Mở khóa user"
          description={<>Mở khóa <strong>{user.full_name}</strong>? User sẽ login lại được.</>}
          confirmLabel="Xác nhận mở khóa"
          onConfirm={handleUnsuspend}
          onCancel={() => setActiveDialog(null)}
        />
      )}
      {activeDialog === 'delete' && (
        <ConfirmDialog
          title="Xóa user"
          description={<>Xóa <strong>{user.full_name}</strong>? Hành động này KHÔNG thể hoàn tác qua UI (cần admin can thiệp DB trực tiếp).</>}
          warning="User sẽ không login được. Dữ liệu vẫn giữ trong DB cho audit."
          confirmLabel="Tôi hiểu, xóa user"
          danger
          onConfirm={handleDelete}
          onCancel={() => setActiveDialog(null)}
        />
      )}

      <Toast toast={toast} />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}

// ── Reason block (display rejected/suspended reason) ────────────────

function ReasonBlock({ label, text }: { label: string; text: string }) {
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 8,
      background: '#FAFAF7', border: '1px solid #EFEAE0',
      fontSize: 13, marginBottom: 14,
    }}>
      <div style={{ fontSize: 11, color: '#8A8A82', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ color: '#1A1A1A', whiteSpace: 'pre-wrap' }}>{text}</div>
    </div>
  )
}

// ── Shared button / input styles ────────────────────────────────────

const backButtonStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '7px 12px', borderRadius: 8,
  border: '1px solid #EFEAE0', background: '#fff',
  fontSize: 13, fontWeight: 500, color: '#1A1A1A',
  cursor: 'pointer', fontFamily: 'inherit', marginBottom: 18,
}

const editButtonStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '7px 12px', borderRadius: 8,
  border: '1px solid #EFEAE0', background: '#fff',
  fontSize: 13, fontWeight: 500, color: '#1A1A1A',
  cursor: 'pointer', fontFamily: 'inherit',
}

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    width: '100%', padding: '8px 10px', borderRadius: 7,
    border: `1.5px solid ${hasError ? '#FCA5A5' : '#EFEAE0'}`,
    background: '#FAFAF7', fontSize: 13, color: '#1A1A1A',
    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  }
}

const errorTextStyle: React.CSSProperties = {
  fontSize: 11, color: '#A82928', marginTop: 4,
}

function primaryButtonStyle(bg: string): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', borderRadius: 8, border: 'none',
    background: bg, color: '#fff', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  }
}

function outlineButtonStyle(text: string, border: string, bg: string): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', borderRadius: 8,
    border: `1px solid ${border}`, background: bg,
    color: text, fontSize: 13, fontWeight: 500,
    cursor: 'pointer', fontFamily: 'inherit',
  }
}
