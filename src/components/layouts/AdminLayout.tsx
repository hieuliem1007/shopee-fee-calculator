import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Users, Clock, DollarSign, Settings, LogOut, LayoutDashboard, Eye, Activity } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Footer } from '@/components/layout/Footer'

const NAV = [
  { path: '/admin', icon: LayoutDashboard, label: 'Tổng quan', exact: true },
  { path: '/admin/users/pending', icon: Clock, label: 'Chờ duyệt' },
  { path: '/admin/users', icon: Users, label: 'Tất cả user' },
  { path: '/admin/fees', icon: DollarSign, label: 'Cấu hình phí' },
  { path: '/admin/settings', icon: Settings, label: 'Cấu hình hệ thống' },
  { path: '/admin/activity-log', icon: Activity, label: 'Hoạt động hệ thống' },
]

export function AdminLayout() {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path)

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F5F5F3', overflow: 'hidden' }}>
      <aside style={{
        width: 224, flexShrink: 0,
        background: '#1A1A1A', color: '#fff',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 2 }}>E-Dream Tools</div>
          <span style={{
            display: 'inline-block', padding: '2px 8px', borderRadius: 999,
            background: '#F5B81C', color: '#1A1A1A', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.06em',
          }}>ADMIN</span>
        </div>

        <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
          {NAV.map(({ path, icon: Icon, label, exact }) => {
            const active = isActive(path, exact)
            return (
              <Link key={path} to={path} style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '9px 10px', borderRadius: 8, marginBottom: 2,
                textDecoration: 'none',
                background: active ? 'rgba(245,184,28,0.15)' : 'transparent',
                color: active ? '#F5B81C' : 'rgba(255,255,255,0.55)',
                fontSize: 13, fontWeight: active ? 600 : 400,
                transition: 'all 0.15s',
              }}>
                <Icon size={15} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: '10px 8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={() => navigate('/app')} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 9,
            padding: '8px 10px', borderRadius: 8, marginBottom: 2,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.55)', fontSize: 13, fontFamily: 'inherit',
          }}>
            <Eye size={15} /> Xem như user
          </button>
          <div style={{ padding: '6px 10px', fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>
            {profile?.full_name}
          </div>
          <button onClick={signOut} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 9,
            padding: '8px 10px', borderRadius: 8,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#E24B4A', fontSize: 13, fontFamily: 'inherit',
          }}>
            <LogOut size={15} /> Đăng xuất
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1 }}>
          <Outlet />
        </div>
        <Footer />
      </main>
    </div>
  )
}
