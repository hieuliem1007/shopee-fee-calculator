import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Loader2, Save, RotateCcw, CheckSquare, Square, AlertCircle,
} from 'lucide-react'
import {
  getUserById, listAllFeatures, getUserFeatures, setUserFeatures,
} from '@/lib/auth'
import { useAuth } from '@/contexts/AuthContext'
import type { Profile, Feature } from '@/lib/supabase'

// ── Helpers ─────────────────────────────────────────────────────────

function arraysEqualSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const set = new Set(a)
  return b.every(x => set.has(x))
}

interface TreeNode {
  parent: Feature
  children: Feature[]
}

function buildTree(features: Feature[]): TreeNode[] {
  const parents = features
    .filter(f => f.level === 1)
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
  const childrenByParent = new Map<string, Feature[]>()
  for (const f of features) {
    if (f.level === 2 && f.parent_feature_id) {
      const arr = childrenByParent.get(f.parent_feature_id) ?? []
      arr.push(f)
      childrenByParent.set(f.parent_feature_id, arr)
    }
  }
  return parents.map(p => ({
    parent: p,
    children: (childrenByParent.get(p.id) ?? [])
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)),
  }))
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

// ── Tri-state checkbox (parent supports indeterminate) ──────────────

function TriCheckbox({
  checked, indeterminate = false, disabled = false, onClick,
}: {
  checked: boolean
  indeterminate?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !checked && indeterminate
  }, [checked, indeterminate])
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={() => { if (!disabled) onClick() }}
      style={{
        width: 16, height: 16, cursor: disabled ? 'not-allowed' : 'pointer',
        accentColor: '#1D9E75',
        flexShrink: 0,
      }}
    />
  )
}

// ── Card wrapper ────────────────────────────────────────────────────

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

// ── Banner ──────────────────────────────────────────────────────────

function Banner({
  type = 'warning', children,
}: { type?: 'warning' | 'info'; children: ReactNode }) {
  const palette = type === 'warning'
    ? { bg: '#FEF2F2', border: '#FCA5A5', color: '#991B1B' }
    : { bg: '#FAFAF7', border: '#EFEAE0', color: '#6B6B66' }
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 8,
      background: palette.bg, border: `1px solid ${palette.border}`,
      color: palette.color, fontSize: 13,
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
      <div>{children}</div>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────

export function UserPermissionsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user: authUser } = useAuth()

  const [user, setUser] = useState<Profile | null>(null)
  const [features, setFeatures] = useState<Feature[]>([])
  const [currentFeatures, setCurrentFeatures] = useState<string[]>([])
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  const load = async () => {
    if (!id) return
    setLoading(true)
    const [u, all, current] = await Promise.all([
      getUserById(id),
      listAllFeatures(),
      getUserFeatures(id),
    ])
    if (!u) {
      setNotFound(true)
    } else {
      setUser(u)
      setFeatures(all)
      setCurrentFeatures(current)
      setSelectedFeatures(current)
      setNotFound(false)
    }
    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id])

  const tree = useMemo(() => buildTree(features), [features])
  const allChildIds = useMemo(
    () => tree.flatMap(n => n.children.map(c => c.id)),
    [tree]
  )

  const selectedSet = useMemo(() => new Set(selectedFeatures), [selectedFeatures])
  const currentSet = useMemo(() => new Set(currentFeatures), [currentFeatures])

  const toGrant = useMemo(
    () => selectedFeatures.filter(f => !currentSet.has(f)),
    [selectedFeatures, currentSet]
  )
  const toRevoke = useMemo(
    () => currentFeatures.filter(f => !selectedSet.has(f)),
    [currentFeatures, selectedSet]
  )
  const hasChanges = !arraysEqualSet(currentFeatures, selectedFeatures)

  // ── Tree handlers ────────────────────────────────────────────────
  const toggleChild = (childId: string) => {
    setSelectedFeatures(prev =>
      prev.includes(childId) ? prev.filter(f => f !== childId) : [...prev, childId]
    )
  }

  const toggleParent = (node: TreeNode) => {
    const childIds = node.children.map(c => c.id)
    const allChecked = childIds.every(id => selectedSet.has(id))
    setSelectedFeatures(prev => {
      const filtered = prev.filter(f => !childIds.includes(f))
      return allChecked ? filtered : [...filtered, ...childIds]
    })
  }

  // ── Quick actions ────────────────────────────────────────────────
  const handleGrantAll = () => setSelectedFeatures([...allChildIds])
  const handleRevokeAll = () => setSelectedFeatures([])
  const handleReset = () => setSelectedFeatures([...currentFeatures])

  // ── Save ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user || !hasChanges) return
    setSaving(true)
    const { data, error } = await setUserFeatures(user.id, selectedFeatures)
    setSaving(false)
    if (error) {
      showToast('error', error)
      return
    }
    if (data) {
      showToast('success', `Đã cập nhật quyền (${data.granted_count} gán, ${data.revoked_count} thu hồi)`)
    }
    await load()
  }

  // ── Render guards ────────────────────────────────────────────────
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
        <BackButton onClick={() => navigate('/admin/users')} label="Quay lại danh sách" />
        <Card>
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🚫</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#1A1A1A', marginBottom: 6 }}>
              Không tìm thấy user
            </div>
          </div>
        </Card>
      </div>
    )
  }

  const isAdminTarget = user.is_admin
  const isDeleted = user.status === 'deleted'
  const editable = !isAdminTarget && !isDeleted && authUser?.id !== user.id

  return (
    <div style={{ padding: '28px 32px', maxWidth: 880 }}>
      <BackButton onClick={() => navigate(`/admin/users/${user.id}`)} label="Quay lại trang user" />

      <div style={{ marginBottom: 18 }}>
        <div style={{
          fontSize: 11, fontWeight: 600, color: '#8A8A82',
          letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6,
        }}>
          Quản lý quyền
        </div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: '#1A1A1A' }}>
          {user.full_name}
        </h1>
        <div style={{ fontSize: 13, color: '#6B6B66', marginTop: 2 }}>
          {user.email}
        </div>
      </div>

      {isAdminTarget && (
        <Banner type="warning">
          Không thể quản lý features của admin. Admin có toàn quyền truy cập mọi tính năng theo mặc định.
        </Banner>
      )}

      {!isAdminTarget && isDeleted && (
        <div style={{ marginBottom: 18 }}>
          <Banner type="warning">
            User này đã bị xóa. Bạn có thể xem cấu hình quyền hiện tại nhưng không thể chỉnh sửa.
          </Banner>
        </div>
      )}

      {!isAdminTarget && (
        <>
          {/* Quick actions + diff counter */}
          <Card padding={18}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              flexWrap: 'wrap', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={handleGrantAll}
                  disabled={!editable}
                  style={quickActionStyle(editable)}
                >
                  <CheckSquare size={13} /> Gán tất cả
                </button>
                <button
                  onClick={handleRevokeAll}
                  disabled={!editable}
                  style={quickActionStyle(editable)}
                >
                  <Square size={13} /> Thu hồi tất cả
                </button>
                <button
                  onClick={handleReset}
                  disabled={!editable || !hasChanges}
                  style={quickActionStyle(editable && hasChanges)}
                >
                  <RotateCcw size={13} /> Reset
                </button>
              </div>

              {hasChanges && (
                <div style={{ display: 'flex', gap: 14, fontSize: 12, fontWeight: 500 }}>
                  {toGrant.length > 0 && (
                    <span style={{ color: '#166534' }}>+{toGrant.length} sẽ gán</span>
                  )}
                  {toRevoke.length > 0 && (
                    <span style={{ color: '#A82928' }}>−{toRevoke.length} sẽ thu hồi</span>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Tree */}
          <Card padding={8}>
            {tree.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: '#8A8A82' }}>
                Chưa có feature nào trong hệ thống.
              </div>
            ) : tree.map(node => {
              const childIds = node.children.map(c => c.id)
              const checkedCount = childIds.filter(cid => selectedSet.has(cid)).length
              const allChecked = checkedCount === childIds.length && childIds.length > 0
              const indeterminate = checkedCount > 0 && checkedCount < childIds.length

              return (
                <div key={node.parent.id} style={{
                  borderBottom: '1px solid #F5F2EA', padding: '14px 16px',
                }}>
                  {/* Parent row */}
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 4 }}>
                    <TriCheckbox
                      checked={allChecked}
                      indeterminate={indeterminate}
                      disabled={!editable}
                      onClick={() => toggleParent(node)}
                    />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>
                        {node.parent.name}
                      </div>
                      {node.parent.description && (
                        <div style={{ fontSize: 12, color: '#8A8A82', marginTop: 1 }}>
                          {node.parent.description}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Children rows */}
                  <div style={{ paddingLeft: 32, marginTop: 8 }}>
                    {node.children.length === 0 ? (
                      <div style={{ fontSize: 12, color: '#A8A89E', padding: '4px 0' }}>
                        (Chưa có feature con)
                      </div>
                    ) : node.children.map(child => {
                      const checked = selectedSet.has(child.id)
                      return (
                        <label
                          key={child.id}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: 10,
                            padding: '6px 0',
                            cursor: editable ? 'pointer' : 'default',
                          }}
                        >
                          <TriCheckbox
                            checked={checked}
                            disabled={!editable}
                            onClick={() => toggleChild(child.id)}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, color: '#1A1A1A' }}>
                              {child.name}
                            </div>
                            {child.description && (
                              <div style={{ fontSize: 12, color: '#8A8A82', marginTop: 1 }}>
                                {child.description}
                              </div>
                            )}
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </Card>

          {/* Save bar */}
          {editable && (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={handleReset}
                disabled={saving || !hasChanges}
                style={{
                  padding: '9px 18px', borderRadius: 8, border: '1px solid #EFEAE0',
                  background: '#fff', fontSize: 13, fontWeight: 500,
                  cursor: (saving || !hasChanges) ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  opacity: (saving || !hasChanges) ? 0.5 : 1,
                }}
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                style={{
                  padding: '9px 18px', borderRadius: 8, border: 'none',
                  background: '#1D9E75', color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: (saving || !hasChanges) ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  opacity: (saving || !hasChanges) ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {saving
                  ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} />
                  : <Save size={14} />}
                Lưu thay đổi
              </button>
            </div>
          )}
        </>
      )}

      <Toast toast={toast} />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}

// ── Reusable bits ───────────────────────────────────────────────────

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '7px 12px', borderRadius: 8,
      border: '1px solid #EFEAE0', background: '#fff',
      fontSize: 13, fontWeight: 500, color: '#1A1A1A',
      cursor: 'pointer', fontFamily: 'inherit', marginBottom: 18,
    }}>
      <ArrowLeft size={14} /> {label}
    </button>
  )
}

function quickActionStyle(enabled: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '7px 12px', borderRadius: 8,
    border: '1px solid #EFEAE0', background: '#fff',
    fontSize: 12, fontWeight: 500, color: enabled ? '#1A1A1A' : '#A8A89E',
    cursor: enabled ? 'pointer' : 'not-allowed',
    fontFamily: 'inherit',
    opacity: enabled ? 1 : 0.6,
  }
}
