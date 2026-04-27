import { useNavigate } from 'react-router-dom'
import { Clock, XCircle, AlertTriangle, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    iconBg: '#FEF9E7',
    iconColor: '#C99A0E',
    title: 'Tài khoản đang chờ duyệt',
    body: 'Yêu cầu đăng ký của bạn đã được tiếp nhận. Admin sẽ xem xét và kích hoạt tài khoản trong thời gian sớm nhất. Vui lòng liên hệ Zalo để được hỗ trợ nhanh hơn.',
    showZalo: true,
  },
  rejected: {
    icon: XCircle,
    iconBg: '#FEF2F2',
    iconColor: '#A82928',
    title: 'Yêu cầu đăng ký bị từ chối',
    body: 'Rất tiếc, yêu cầu đăng ký của bạn không được chấp thuận. Nếu bạn cho rằng đây là sự nhầm lẫn, vui lòng liên hệ qua Zalo để được hỗ trợ.',
    showZalo: true,
  },
  suspended: {
    icon: AlertTriangle,
    iconBg: '#FFF7ED',
    iconColor: '#C2410C',
    title: 'Tài khoản bị tạm ngưng',
    body: 'Tài khoản của bạn đã bị tạm ngưng. Vui lòng liên hệ admin qua Zalo để được giải thích và hỗ trợ.',
    showZalo: true,
  },
}

export function LockedPage() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const status = profile?.status ?? 'pending'
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending
  const Icon = config.icon

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#FAFAF7',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 440,
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
          <Icon size={30} color={config.iconColor} />
        </div>

        {/* Title */}
        <div style={{ fontSize: 20, fontWeight: 600, color: '#1A1A1A', marginBottom: 10 }}>
          {config.title}
        </div>

        {/* Body */}
        <div style={{ fontSize: 14, color: '#6B6B66', lineHeight: 1.65, marginBottom: 8 }}>
          {config.body}
        </div>

        {/* Rejected reason */}
        {status === 'rejected' && profile?.rejected_reason && (
          <div style={{
            margin: '14px 0', padding: '12px 16px', borderRadius: 8,
            background: '#FEF2F2', border: '1px solid #FCA5A5',
            fontSize: 13, color: '#991B1B', textAlign: 'left',
          }}>
            <strong>Lý do:</strong> {profile.rejected_reason}
          </div>
        )}

        {/* Suspended reason */}
        {status === 'suspended' && profile?.suspended_reason && (
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
          {config.showZalo && (
            <a
              href="https://zalo.me/0000000000"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '12px 24px', borderRadius: 8,
                background: '#F5B81C', color: '#1A1A1A',
                fontSize: 14, fontWeight: 600, textDecoration: 'none',
                boxShadow: '0 1px 0 rgba(255,255,255,0.4) inset, 0 2px 6px rgba(245,184,28,0.3)',
              }}
            >
              Liên hệ hỗ trợ qua Zalo
            </a>
          )}
          <button onClick={handleSignOut} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '11px 24px', borderRadius: 8,
            background: 'transparent', color: '#6B6B66',
            border: '1px solid #EFEAE0', fontSize: 14, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <LogOut size={15} /> Đăng xuất
          </button>
        </div>

        {/* Account info */}
        {profile?.email && (
          <div style={{ marginTop: 20, fontSize: 12, color: '#A8A89E' }}>
            Tài khoản: {profile.email}
          </div>
        )}
      </div>
    </div>
  )
}
