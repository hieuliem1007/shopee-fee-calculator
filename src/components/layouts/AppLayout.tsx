import { Link, Outlet, useLocation } from 'react-router-dom'
import { Calculator, LayoutDashboard, User, LogOut, Lock } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const NAV = [
  { path: '/app', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { path: '/app/shopee-calculator', icon: Calculator, label: 'Shopee Calculator' },
]

function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 7,
      background: 'linear-gradient(135deg, #F5B81C 0%, #E8A60E 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 20 20">
        <path d="M4 3 L16 3 L16 6 L7 6 L7 8.5 L14 8.5 L14 11.5 L7 11.5 L7 14 L16 14 L16 17 L4 17 Z" fill="#1A1A1A" />
      </svg>
    </div>
  )
}

export function AppLayout() {
  const { profile, signOut } = useAuth()
  const location = useLocation()

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path)

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#FAFAF7', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, flexShrink: 0,
        background: '#fff', borderRight: '1px solid #EFEAE0',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #EFEAE0' }}>
          <Link to="/app" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <LogoMark size={26} />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>E-Dream Tools</span>
          </Link>
        </div>

        <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
          {NAV.map(({ path, icon: Icon, label, exact }) => {
            const active = isActive(path, exact)
            return (
              <Link key={path} to={path} style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '9px 10px', borderRadius: 8, marginBottom: 2,
                textDecoration: 'none',
                background: active ? '#FAF6E8' : 'transparent',
                color: active ? '#A47408' : '#6B6B66',
                fontSize: 13, fontWeight: active ? 600 : 500,
                transition: 'all 0.15s',
              }}>
                <Icon size={16} />
                {label}
              </Link>
            )
          })}

          {/* Locked tools placeholder */}
          <div style={{ marginTop: 12, padding: '0 10px 6px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#C9C5BA', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
              Sắp ra mắt
            </div>
            {['TikTok Calculator', 'Banner Maker'].map(name => (
              <div key={name}
                title="Sắp ra mắt — chúng tôi sẽ thông báo qua email khi tính năng sẵn sàng"
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '9px 0px', color: '#C9C5BA', fontSize: 13,
                  cursor: 'not-allowed',
                }}>
                <Lock size={14} />
                {name}
              </div>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div style={{ padding: '10px 8px', borderTop: '1px solid #EFEAE0' }}>
          <Link to="/app/profile" style={{
            display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
            borderRadius: 8, textDecoration: 'none', color: '#6B6B66',
            fontSize: 13, fontWeight: 500, marginBottom: 2,
          }}>
            <User size={15} />
            {profile?.full_name ?? 'Tài khoản'}
          </Link>
          <button onClick={signOut} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 9,
            padding: '8px 10px', borderRadius: 8,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#A82928', fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
          }}>
            <LogOut size={15} /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}
