import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Clock, XCircle, AlertTriangle, Lock, Trash2, LogOut, Home } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getZaloLink } from '@/lib/system-config'

type LockMode = 'feature_locked' | 'deleted' | 'pending' | 'rejected' | 'suspended'

interface LocationState {
  reason?: string
  feature?: string
  returnTo?: string
}

const MODE_CONFIG: Record<LockMode, {
  icon: typeof Lock
  iconBg: string
  iconColor: string
  title: string
  body: string
}> = {
  feature_locked: {
    icon: Lock,
    iconBg: '#FEF9E7',
    iconColor: '#C99A0E',
    title: 'TÍNH NĂNG ĐANG KHÓA',
    body: 'Tính năng này yêu cầu quyền truy cập đặc biệt. Vui lòng liên hệ admin qua Zalo để được mở khóa.',
  },
  deleted: {
    icon: Trash2,
    iconBg: '#F3F4F6',
    iconColor: '#4B5563',
    title: 'Tài khoản đã bị xóa',
    body: 'Tài khoản của bạn đã bị xóa khỏi hệ thống. Vui lòng liên hệ admin qua Zalo nếu bạn cho rằng đây là sự nhầm lẫn.',
  },
  pending: {
    icon: Clock,
    iconBg: '#FEF9E7',
    iconColor: '#C99A0E',
    title: 'Tài khoản đang chờ duyệt',
    body: 'Yêu cầu đăng ký của bạn đã được tiếp nhận. Admin sẽ xem xét và kích hoạt tài khoản trong thời gian sớm nhất. Vui lòng liên hệ Zalo để được hỗ trợ nhanh hơn.',
  },
  rejected: {
    icon: XCircle,
    iconBg: '#FEF2F2',
    iconColor: '#A82928',
    title: 'Yêu cầu đăng ký bị từ chối',
    body: 'Rất tiếc, yêu cầu đăng ký của bạn không được chấp thuận. Nếu bạn cho rằng đây là sự nhầm lẫn, vui lòng liên hệ qua Zalo để được hỗ trợ.',
  },
  suspended: {
    icon: AlertTriangle,
    iconBg: '#FFF7ED',
    iconColor: '#C2410C',
    title: 'Tài khoản bị tạm ngưng',
    body: 'Tài khoản của bạn đã bị tạm ngưng. Vui lòng liên hệ admin qua Zalo để được giải thích và hỗ trợ.',
  },
}

function resolveMode(state: LocationState | null, status: string | undefined): LockMode {
  if (state?.reason === 'feature_locked') return 'feature_locked'
  if (state?.reason === 'deleted' || status === 'deleted') return 'deleted'
  if (status === 'rejected') return 'rejected'
  if (status === 'suspended') return 'suspended'
  if (status === 'pending') return 'pending'
  // Active user landing on /locked directly with no state
  return 'feature_locked'
}

export function LockedPage() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state ?? null) as LocationState | null

  const mode = resolveMode(state, profile?.status)
  const config = MODE_CONFIG[mode]
  const Icon = config.icon

  const isFeatureLocked = mode === 'feature_locked'
  const isAdminUser = profile?.is_admin === true

  const [zaloLink, setZaloLink] = useState<string | null>(null)
  const [zaloError, setZaloError] = useState(false)

  useEffect(() => {
    let cancelled = false
    getZaloLink()
      .then(link => { if (!cancelled) setZaloLink(link) })
      .catch(() => { if (!cancelled) setZaloError(true) })
    return () => { cancelled = true }
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  const handleHome = () => {
    navigate(isAdminUser ? '/admin' : '/app', { replace: true })
  }

  const zaloDisabled = !zaloLink || zaloError

  return (
    <div style={{
      minHeight: '100vh', background: '#FAFAF7',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 480,
        background: '#fff', border: '1px solid #EFEAE0', borderRadius: 16,
        padding: '40px 32px', textAlign: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.05)',
      }}>
        {/* Icon */}
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: config.iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <Icon size={32} color={config.iconColor} />
        </div>

        {/* Title */}
        <div style={{
          fontSize: isFeatureLocked ? 22 : 20, fontWeight: 700,
          color: '#1A1A1A', marginBottom: 12, letterSpacing: isFeatureLocked ? '0.02em' : 0,
        }}>
          {config.title}
        </div>

        {/* Body */}
        <div style={{ fontSize: 14, color: '#6B6B66', lineHeight: 1.65, marginBottom: 8 }}>
          {config.body}
        </div>

        {/* Feature requested */}
        {isFeatureLocked && state?.feature && (
          <div style={{
            margin: '14px 0 4px', padding: '10px 14px', borderRadius: 8,
            background: '#FAF7EF', border: '1px solid #EFEAE0',
            fontSize: 13, color: '#6B6B66',
          }}>
            Tính năng yêu cầu: <strong style={{ color: '#1A1A1A' }}>{state.feature}</strong>
          </div>
        )}

        {/* Admin edge case note */}
        {isFeatureLocked && isAdminUser && (
          <div style={{
            margin: '14px 0 4px', padding: '10px 14px', borderRadius: 8,
            background: '#FEF2F2', border: '1px solid #FCA5A5',
            fontSize: 13, color: '#991B1B', textAlign: 'left',
          }}>
            Bạn là admin, không cần liên hệ ai. Có thể đây là lỗi hệ thống.
          </div>
        )}

        {/* Rejected reason */}
        {mode === 'rejected' && profile?.rejected_reason && (
          <div style={{
            margin: '14px 0', padding: '12px 16px', borderRadius: 8,
            background: '#FEF2F2', border: '1px solid #FCA5A5',
            fontSize: 13, color: '#991B1B', textAlign: 'left',
          }}>
            <strong>Lý do:</strong> {profile.rejected_reason}
          </div>
        )}

        {/* Suspended reason */}
        {mode === 'suspended' && profile?.suspended_reason && (
          <div style={{
            margin: '14px 0', padding: '12px 16px', borderRadius: 8,
            background: '#FFF7ED', border: '1px solid #FED7AA',
            fontSize: 13, color: '#9A3412', textAlign: 'left',
          }}>
            <strong>Lý do:</strong> {profile.suspended_reason}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
          <a
            href={zaloDisabled ? undefined : zaloLink!}
            target="_blank"
            rel="noreferrer"
            aria-disabled={zaloDisabled}
            onClick={e => { if (zaloDisabled) e.preventDefault() }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '12px 24px', borderRadius: 8,
              background: zaloDisabled ? '#E5E5E0' : '#0084FF',
              color: zaloDisabled ? '#A8A89E' : '#fff',
              fontSize: 14, fontWeight: 600, textDecoration: 'none',
              cursor: zaloDisabled ? 'not-allowed' : 'pointer',
              boxShadow: zaloDisabled ? 'none' : '0 1px 0 rgba(255,255,255,0.2) inset, 0 2px 6px rgba(0,132,255,0.3)',
            }}
          >
            {zaloLink === null && !zaloError ? 'Đang tải...' : zaloError ? 'Vui lòng thử lại sau' : 'Liên hệ Zalo của admin'}
          </a>

          {isFeatureLocked && (
            <button onClick={handleHome} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '11px 24px', borderRadius: 8,
              background: 'transparent', color: '#1A1A1A',
              border: '1px solid #EFEAE0', fontSize: 14, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <Home size={15} /> Quay về Trang chủ
            </button>
          )}

          {!isFeatureLocked && (
            <button onClick={handleSignOut} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '11px 24px', borderRadius: 8,
              background: 'transparent', color: '#6B6B66',
              border: '1px solid #EFEAE0', fontSize: 14, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <LogOut size={15} /> Đăng xuất
            </button>
          )}
        </div>

        {/* Footer note */}
        {isFeatureLocked && (
          <div style={{
            marginTop: 20, fontSize: 12, color: '#A8A89E',
            fontStyle: 'italic', lineHeight: 1.5,
          }}>
            Sau khi admin gán quyền, vui lòng đăng xuất và đăng nhập lại để cập nhật.
          </div>
        )}

        {/* Account info */}
        {!isFeatureLocked && profile?.email && (
          <div style={{ marginTop: 20, fontSize: 12, color: '#A8A89E' }}>
            Tài khoản: {profile.email}
          </div>
        )}
      </div>
    </div>
  )
}
