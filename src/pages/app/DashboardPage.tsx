import { useAuth } from '@/contexts/AuthContext'
import { Calculator } from 'lucide-react'
import { Link } from 'react-router-dom'

export function DashboardPage() {
  const { profile } = useAuth()

  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.12em',
          color: '#C99A0E', textTransform: 'uppercase', marginBottom: 8,
        }}>
          E-Dream Tools
        </div>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, color: '#1A1A1A' }}>
          Xin chào, {profile?.full_name?.split(' ').pop() ?? 'bạn'} 👋
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: 14, color: '#6B6B66' }}>
          Chọn một công cụ bên dưới để bắt đầu.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
        <Link to="/app/shopee-calculator" style={{ textDecoration: 'none' }}>
          <div style={{
            background: '#fff', border: '1px solid #EFEAE0', borderRadius: 12,
            padding: '20px 22px', cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            transition: 'all 0.18s ease',
          }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 4px rgba(245,184,28,0.08), 0 12px 32px rgba(245,184,28,0.12)'
              ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'
              ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'linear-gradient(135deg, #F5B81C 0%, #E8A60E 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 14,
            }}>
              <Calculator size={20} color="#1A1A1A" />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A', marginBottom: 4 }}>
              Shopee Calculator
            </div>
            <div style={{ fontSize: 12, color: '#8A8A82' }}>
              Tính phí & lợi nhuận sản phẩm
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
