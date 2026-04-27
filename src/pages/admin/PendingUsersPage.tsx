import { useState, useEffect, useCallback } from 'react'
import { CheckCircle, XCircle, Loader2, User, Phone, Mail, Clock, RefreshCw } from 'lucide-react'
import { getPendingUsers, approveUser, rejectUser } from '@/lib/auth'
import { useAuth } from '@/contexts/AuthContext'
import type { Profile } from '@/lib/supabase'

// ── RejectDialog ───────────────────────────────────────────────────
function RejectDialog({ user, onConfirm, onCancel }: {
  user: Profile
  onConfirm: (reason: string) => Promise<void>
  onCancel: () => void
}) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const handle = async () => {
    if (!reason.trim()) { setErr('Vui lòng nhập lý do từ chối'); return }
    setLoading(true)
    await onConfirm(reason.trim())
    setLoading(false)
  }

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 14, padding: '28px 28px',
        width: '100%', maxWidth: 440,
        boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
      }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#1A1A1A', marginBottom: 6 }}>
          Từ chối yêu cầu
        </div>
        <div style={{ fontSize: 13, color: '#6B6B66', marginBottom: 18 }}>
          Từ chối <strong>{user.full_name}</strong> ({user.email}). Lý do sẽ được hiển thị cho user.
        </div>
        <textarea
          value={reason}
          onChange={e => { setReason(e.target.value); setErr('') }}
          placeholder="VD: Không đủ điều kiện tham gia, vui lòng liên hệ lại sau..."
          rows={3}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8,
            border: `1.5px solid ${err ? '#FCA5A5' : '#EFEAE0'}`,
            background: '#FAFAF7', fontSize: 13, color: '#1A1A1A',
            outline: 'none', resize: 'vertical', fontFamily: 'inherit',
          }}
        />
        {err && <div style={{ fontSize: 12, color: '#A82928', marginTop: 5 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{
            padding: '9px 18px', borderRadius: 8, border: '1px solid #EFEAE0',
            background: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}>Hủy</button>
          <button onClick={handle} disabled={loading} style={{
            padding: '9px 18px', borderRadius: 8, border: 'none',
            background: '#E24B4A', color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 6, opacity: loading ? 0.7 : 1,
          }}>
            {loading && <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} />}
            Xác nhận từ chối
          </button>
        </div>
      </div>
    </div>
  )
}

// ── UserRow ────────────────────────────────────────────────────────
function UserRow({ user, onApprove, onReject, loadingId }: {
  user: Profile
  onApprove: (id: string) => void
  onReject: (user: Profile) => void
  loadingId: string | null
}) {
  const isLoading = loadingId === user.id
  const joinedAgo = (() => {
    const diff = Date.now() - new Date(user.created_at).getTime()
    const mins = Math.floor(diff / 60000)
    const hrs = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (days > 0) return `${days} ngày trước`
    if (hrs > 0) return `${hrs} giờ trước`
    return `${mins} phút trước`
  })()

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center',
      padding: '16px 20px', borderBottom: '1px solid #F5F2EA',
      background: '#fff', transition: 'background 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {/* Avatar */}
        <div style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #F5B81C 0%, #E8A60E 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 600, color: '#1A1A1A',
        }}>
          {user.full_name[0]?.toUpperCase()}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A', marginBottom: 4 }}>
            {user.full_name}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6B6B66' }}>
              <Mail size={11} /> {user.email}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6B6B66' }}>
              <Phone size={11} /> {user.phone}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#A8A89E' }}>
              <Clock size={11} /> {joinedAgo}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button onClick={() => onReject(user)} disabled={!!loadingId} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '8px 14px', borderRadius: 8, border: '1px solid #FCA5A5',
          background: '#FEF2F2', color: '#A82928', fontSize: 13, fontWeight: 500,
          cursor: loadingId ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          opacity: loadingId && !isLoading ? 0.5 : 1,
        }}>
          <XCircle size={14} /> Từ chối
        </button>
        <button onClick={() => onApprove(user.id)} disabled={!!loadingId} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '8px 14px', borderRadius: 8, border: 'none',
          background: '#1D9E75', color: '#fff', fontSize: 13, fontWeight: 600,
          cursor: loadingId ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          opacity: loadingId && !isLoading ? 0.5 : 1,
        }}>
          {isLoading
            ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} />
            : <CheckCircle size={14} />}
          Duyệt
        </button>
      </div>
    </div>
  )
}

// ── PendingUsersPage ──────────────────────────────────────────────
export function PendingUsersPage() {
  const { user: adminUser } = useAuth()
  const [users, setUsers] = useState<Profile[]>([])
  const [fetching, setFetching] = useState(true)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<Profile | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setFetching(true)
    const data = await getPendingUsers()
    setUsers(data)
    setFetching(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleApprove = async (userId: string) => {
    if (!adminUser) return
    setLoadingId(userId)
    const { error } = await approveUser(userId, adminUser.id)
    if (error) {
      showToast('Lỗi: ' + error, false)
    } else {
      setUsers(prev => prev.filter(u => u.id !== userId))
      showToast('Đã duyệt tài khoản thành công')
    }
    setLoadingId(null)
  }

  const handleReject = async (reason: string) => {
    if (!rejectTarget) return
    setLoadingId(rejectTarget.id)
    const { error } = await rejectUser(rejectTarget.id, reason)
    if (error) {
      showToast('Lỗi: ' + error, false)
    } else {
      setUsers(prev => prev.filter(u => u.id !== rejectTarget.id))
      showToast('Đã từ chối tài khoản')
    }
    setRejectTarget(null)
    setLoadingId(null)
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 860 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: '#1A1A1A' }}>
            User chờ duyệt
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B6B66' }}>
            {fetching ? 'Đang tải…' : `${users.length} yêu cầu đang chờ xét duyệt`}
          </p>
        </div>
        <button onClick={load} disabled={fetching} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
          borderRadius: 8, border: '1px solid #EFEAE0', background: '#fff',
          fontSize: 13, fontWeight: 500, cursor: fetching ? 'not-allowed' : 'pointer',
          color: '#1A1A1A', fontFamily: 'inherit',
        }}>
          <RefreshCw size={14} style={fetching ? { animation: 'spin 0.7s linear infinite' } : {}} />
          Làm mới
        </button>
      </div>

      {/* List */}
      <div style={{
        background: '#fff', border: '1px solid #EFEAE0', borderRadius: 12,
        overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        {/* Table header */}
        <div style={{
          padding: '11px 20px', background: '#FAFAF7',
          borderBottom: '1px solid #EFEAE0',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <User size={13} color="#8A8A82" />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#8A8A82', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Thông tin người dùng
          </span>
        </div>

        {fetching ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Loader2 size={24} color="#F5B81C" style={{ animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#1A1A1A', marginBottom: 6 }}>
              Không có yêu cầu nào chờ duyệt
            </div>
            <div style={{ fontSize: 13, color: '#8A8A82' }}>
              Khi có user đăng ký mới, họ sẽ xuất hiện ở đây.
            </div>
          </div>
        ) : (
          users.map(u => (
            <UserRow
              key={u.id} user={u}
              onApprove={handleApprove}
              onReject={setRejectTarget}
              loadingId={loadingId}
            />
          ))
        )}
      </div>

      {/* Reject dialog */}
      {rejectTarget && (
        <RejectDialog
          user={rejectTarget}
          onConfirm={handleReject}
          onCancel={() => setRejectTarget(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 100,
          padding: '12px 18px', borderRadius: 10,
          background: toast.ok ? '#1D9E75' : '#E24B4A',
          color: '#fff', fontSize: 13, fontWeight: 500,
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          animation: 'fadeIn 0.2s ease',
        }}>
          {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
