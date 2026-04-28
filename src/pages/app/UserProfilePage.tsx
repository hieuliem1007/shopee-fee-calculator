import { useState, useEffect, useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, Mail, Phone, Edit2, Save, Loader2, LogOut, AlertCircle, ShieldCheck, CheckCircle2,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  updateMyProfile, listAllFeatures, getUserFeatures,
} from '@/lib/auth'
import type { Feature, ProfileStatus } from '@/lib/supabase'

// ── Constants ───────────────────────────────────────────────────────

const STATUS_DOT: Record<ProfileStatus, { color: string; label: string }> = {
  pending: { color: '#F59E0B', label: 'Chờ duyệt' },
  active: { color: '#1D9E75', label: 'Đang hoạt động' },
  rejected: { color: '#A82928', label: 'Đã từ chối' },
  suspended: { color: '#9A3412', label: 'Đã khóa' },
  deleted: { color: '#6B7280', label: 'Đã xóa' },
}

// ── Helpers ─────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'Chưa đăng nhập'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'Vừa xong'
  if (mins < 60) return `${mins} phút trước`
  if (hrs < 24) return `${hrs} giờ trước`
  if (days === 1) return 'Hôm qua'
  if (days < 7) return `${days} ngày trước`
  return formatDate(iso)
}

// ── Card ────────────────────────────────────────────────────────────

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

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '160px 1fr',
      gap: 16, alignItems: 'flex-start',
      padding: '11px 0', borderBottom: '1px solid #F5F2EA',
    }}>
      <div style={{ fontSize: 12, color: '#6B6B66', fontWeight: 500, paddingTop: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: '#1A1A1A' }}>{children}</div>
    </div>
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

// ── Banner ──────────────────────────────────────────────────────────

function Banner({
  type = 'info', children,
}: { type?: 'info' | 'warning'; children: ReactNode }) {
  const palette = type === 'warning'
    ? { bg: '#FEF2F2', border: '#FCA5A5', color: '#991B1B' }
    : { bg: '#FAFAF7', border: '#EFEAE0', color: '#6B6B66' }
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 8,
      background: palette.bg, border: `1px solid ${palette.border}`,
      color: palette.color, fontSize: 13,
      display: 'flex', alignItems: 'flex-start', gap: 10,
      marginBottom: 18,
    }}>
      <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
      <div>{children}</div>
    </div>
  )
}

// ── Field input style ───────────────────────────────────────────────

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    width: '100%', maxWidth: 360, padding: '8px 10px', borderRadius: 7,
    border: `1.5px solid ${hasError ? '#FCA5A5' : '#EFEAE0'}`,
    background: '#FAFAF7', fontSize: 13, color: '#1A1A1A',
    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  }
}

// ── Page ────────────────────────────────────────────────────────────

interface FormState {
  full_name: string
  phone: string
}

export function UserProfilePage() {
  const navigate = useNavigate()
  const { profile, refreshProfile, signOut, loading: authLoading } = useAuth()

  const [features, setFeatures] = useState<Feature[]>([])
  const [userFeatureIds, setUserFeatureIds] = useState<string[]>([])
  const [loadingFeatures, setLoadingFeatures] = useState(true)

  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState<FormState>({ full_name: '', phone: '' })
  const [errors, setErrors] = useState<{ full_name?: string; phone?: string }>({})
  const [saving, setSaving] = useState(false)

  const [toast, setToast] = useState<ToastState>(null)
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  // Redirect deleted users
  useEffect(() => {
    if (!authLoading && profile?.status === 'deleted') {
      navigate('/locked', { replace: true })
    }
  }, [profile, authLoading, navigate])

  // Load features info
  useEffect(() => {
    if (!profile) return
    let cancelled = false
    setLoadingFeatures(true)
    Promise.all([listAllFeatures(), getUserFeatures(profile.id)]).then(([all, mine]) => {
      if (cancelled) return
      setFeatures(all)
      setUserFeatureIds(mine)
      setLoadingFeatures(false)
    })
    return () => { cancelled = true }
  }, [profile])

  // ── Edit handlers ─────────────────────────────────────────────────
  const startEdit = () => {
    if (!profile) return
    setForm({
      full_name: profile.full_name ?? '',
      phone: profile.phone ?? '',
    })
    setErrors({})
    setEditMode(true)
  }

  const cancelEdit = () => {
    setEditMode(false)
    setErrors({})
  }

  const handleSave = async () => {
    if (!profile) return
    const errs: { full_name?: string; phone?: string } = {}
    const fn = form.full_name.trim()
    const ph = form.phone.trim()
    if (!fn) errs.full_name = 'Tên không được rỗng'
    if (fn.length > 100) errs.full_name = 'Tên tối đa 100 ký tự'
    if (!ph) {
      errs.phone = 'Số điện thoại không được rỗng'
    } else if (!/^[0-9]{10,11}$/.test(ph.replace(/\s/g, ''))) {
      errs.phone = 'Số điện thoại không hợp lệ (10-11 chữ số)'
    }
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    // Delta — only changed fields
    const input: { full_name?: string; phone?: string } = {}
    if (fn !== (profile.full_name ?? '')) input.full_name = fn
    if (ph !== (profile.phone ?? '')) input.phone = ph

    if (Object.keys(input).length === 0) {
      setEditMode(false)
      return
    }

    setSaving(true)
    const { data, error } = await updateMyProfile(input)
    setSaving(false)
    if (error) {
      showToast('error', error)
      return
    }
    showToast('success', `Đã cập nhật (${data?.changed_count ?? 0} field thay đổi)`)
    setEditMode(false)
    await refreshProfile()
  }

  // ── Derived: feature tree by parent ───────────────────────────────
  const myFeatureTree = useMemo(() => {
    const userSet = new Set(userFeatureIds)
    const myChildren = features.filter(f => f.level === 2 && userSet.has(f.id))
    if (myChildren.length === 0) return []
    const parents = features.filter(f => f.level === 1)
    const groups: { parent: Feature; children: Feature[] }[] = []
    for (const p of parents) {
      const kids = myChildren
        .filter(c => c.parent_feature_id === p.id)
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      if (kids.length) groups.push({ parent: p, children: kids })
    }
    // Orphans (no parent or parent missing)
    const orphans = myChildren.filter(c => !groups.some(g => g.children.includes(c)))
    if (orphans.length) {
      groups.push({
        parent: { id: '_other', name: 'Khác', description: null, category: 'category', parent_feature_id: null, level: 1, display_order: 999, is_default_for_new_user: false, created_at: '' } as unknown as Feature,
        children: orphans,
      })
    }
    return groups.sort((a, b) => (a.parent.display_order ?? 0) - (b.parent.display_order ?? 0))
  }, [features, userFeatureIds])

  // ── Render guards ─────────────────────────────────────────────────
  if (authLoading || !profile) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <Loader2 size={28} color="#F5B81C" style={{ animation: 'spin 0.7s linear infinite' }} />
      </div>
    )
  }

  const status = profile.status
  const statusInfo = STATUS_DOT[status]

  return (
    <div style={{ padding: 32, maxWidth: 760 }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{
          margin: 0, fontSize: 22, fontWeight: 600, color: '#1A1A1A',
          textTransform: 'uppercase', letterSpacing: '0.02em',
        }}>
          Tài khoản của tôi
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B6B66' }}>
          Quản lý thông tin cá nhân và xem các tính năng được mở khóa.
        </p>
      </div>

      {profile.is_admin && (
        <Banner type="info">
          Bạn đang là <strong>admin</strong>. Để quản lý features của user khác, vào <a
            href="/admin/users" style={{ color: '#1A1A1A', fontWeight: 600 }}>trang admin</a>.
        </Banner>
      )}

      {status === 'suspended' && (
        <Banner type="warning">
          Tài khoản của bạn đang bị tạm khóa.
          {profile.suspended_reason ? <> Lý do: <strong>{profile.suspended_reason}</strong></> : null}
        </Banner>
      )}

      {/* Section 1: Thông tin cá nhân */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <SectionTitle>Thông tin cá nhân</SectionTitle>
          {!editMode && (
            <button onClick={startEdit} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', borderRadius: 8,
              border: '1px solid #EFEAE0', background: '#fff',
              fontSize: 13, fontWeight: 500, color: '#1A1A1A',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <Edit2 size={13} /> Chỉnh sửa
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: '#FAFAF7', border: '1px solid #EFEAE0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#8A8A82',
          }}>
            <User size={24} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1A1A1A' }}>{profile.full_name}</div>
            <div style={{ fontSize: 12, color: '#8A8A82' }}>{profile.email}</div>
          </div>
        </div>

        <form
          onSubmit={e => { e.preventDefault(); if (editMode) handleSave() }}
          style={{ marginTop: 6 }}
        >
          <FieldRow label="Họ tên">
            {editMode ? (
              <>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={e => {
                    setForm(f => ({ ...f, full_name: e.target.value }))
                    setErrors(p => ({ ...p, full_name: undefined }))
                  }}
                  style={inputStyle(!!errors.full_name)}
                />
                {errors.full_name && (
                  <div style={{ fontSize: 11, color: '#A82928', marginTop: 4 }}>{errors.full_name}</div>
                )}
              </>
            ) : profile.full_name}
          </FieldRow>

          <FieldRow label="Email">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Mail size={13} color="#8A8A82" />
              <span>{profile.email}</span>
              {editMode && (
                <span style={{ fontSize: 11, color: '#A8A89E', fontStyle: 'italic' }}>
                  (Email không sửa được)
                </span>
              )}
            </div>
          </FieldRow>

          <FieldRow label="Số điện thoại">
            {editMode ? (
              <>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => {
                    setForm(f => ({ ...f, phone: e.target.value }))
                    setErrors(p => ({ ...p, phone: undefined }))
                  }}
                  style={inputStyle(!!errors.phone)}
                />
                {errors.phone && (
                  <div style={{ fontSize: 11, color: '#A82928', marginTop: 4 }}>{errors.phone}</div>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Phone size={13} color="#8A8A82" />
                <span>{profile.phone || <span style={{ color: '#A8A89E' }}>—</span>}</span>
              </div>
            )}
          </FieldRow>

          <FieldRow label="Gói">
            {profile.package_label || <span style={{ color: '#A8A89E' }}>Chưa gán gói</span>}
          </FieldRow>

          <FieldRow label="Ghi chú gói">
            {profile.package_note
              ? <span style={{ whiteSpace: 'pre-wrap' }}>{profile.package_note}</span>
              : <span style={{ color: '#A8A89E' }}>—</span>}
          </FieldRow>

          <FieldRow label="Tham gia">
            {formatDate(profile.created_at)}
          </FieldRow>

          {editMode && (
            <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
              <button type="button" onClick={cancelEdit} disabled={saving} style={{
                padding: '9px 18px', borderRadius: 8, border: '1px solid #EFEAE0',
                background: '#fff', fontSize: 13, fontWeight: 500,
                cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              }}>Hủy</button>
              <button type="submit" disabled={saving} style={{
                padding: '9px 18px', borderRadius: 8, border: 'none',
                background: '#1D9E75', color: '#fff', fontSize: 13, fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.7 : 1,
              }}>
                {saving
                  ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} />
                  : <Save size={14} />}
                Lưu thay đổi
              </button>
            </div>
          )}
        </form>
      </Card>

      {/* Section 2: Quyền của tôi */}
      <Card>
        <SectionTitle>Quyền của tôi</SectionTitle>
        {loadingFeatures ? (
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <Loader2 size={20} color="#F5B81C" style={{ animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : myFeatureTree.length === 0 ? (
          <div style={{ padding: '20px 14px', textAlign: 'center' }}>
            <ShieldCheck size={32} color="#D1D5DB" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 13, color: '#6B6B66', marginBottom: 4 }}>
              Chưa được gán quyền nào
            </div>
            <div style={{ fontSize: 12, color: '#8A8A82' }}>
              Liên hệ admin để mở khóa tính năng.
            </div>
          </div>
        ) : (
          <div>
            {myFeatureTree.map(group => (
              <div key={group.parent.id} style={{
                padding: '8px 0 12px',
                borderBottom: '1px solid #F5F2EA',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <CheckCircle2 size={14} color="#1D9E75" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>
                    {group.parent.name}
                  </span>
                </div>
                <div style={{ paddingLeft: 22 }}>
                  {group.children.map(c => (
                    <div key={c.id} style={{ fontSize: 12, color: '#6B6B66', padding: '3px 0' }}>
                      • {c.name}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Section 3: Trạng thái tài khoản */}
      <Card>
        <SectionTitle>Trạng thái tài khoản</SectionTitle>
        <FieldRow label="Trạng thái">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: statusInfo.color,
              display: 'inline-block',
            }} />
            <span>{statusInfo.label}</span>
          </div>
        </FieldRow>
        <FieldRow label="Đăng nhập gần nhất">
          {formatRelative(profile.last_login_at)}
        </FieldRow>
      </Card>

      {/* Footer: Sign out */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={signOut} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '9px 16px', borderRadius: 8,
          border: '1px solid #FCA5A5', background: '#FEF2F2',
          color: '#A82928', fontSize: 13, fontWeight: 500,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          <LogOut size={14} /> Đăng xuất
        </button>
      </div>

      <Toast toast={toast} />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}

