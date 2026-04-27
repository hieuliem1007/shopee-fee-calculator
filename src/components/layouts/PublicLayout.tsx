import { Link, Outlet } from 'react-router-dom'

function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 7,
      background: 'linear-gradient(135deg, #F5B81C 0%, #E8A60E 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 1px 0 rgba(255,255,255,.4) inset, 0 2px 6px rgba(245,184,28,.3)',
      flexShrink: 0,
    }}>
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 20 20">
        <path d="M4 3 L16 3 L16 6 L7 6 L7 8.5 L14 8.5 L14 11.5 L7 11.5 L7 14 L16 14 L16 17 L4 17 Z"
          fill="#1A1A1A" />
      </svg>
    </div>
  )
}

export function PublicLayout() {
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF7', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        height: 56, padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #EFEAE0',
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <LogoMark size={28} />
          <span style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A' }}>E-Dream Tools</span>
        </Link>
        <Link to="/login" style={{
          fontSize: 13, fontWeight: 500, color: '#1A1A1A',
          textDecoration: 'none', padding: '7px 16px',
          border: '1px solid #EFEAE0', borderRadius: 8,
          background: '#fff', transition: 'border-color 0.15s',
        }}>
          Đăng nhập
        </Link>
      </header>
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <Outlet />
      </main>
    </div>
  )
}
