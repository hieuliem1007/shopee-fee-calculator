import { Link } from 'react-router-dom'
import { LogoMark } from '@/components/layout/TopNav'

interface Props {
  title: string
  subtitle?: string
  children: React.ReactNode
}

export function LegalLayout({ title, subtitle, children }: Props) {
  return (
    <div style={{
      minHeight: '100vh', background: '#fff', color: '#1A1A1A',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif',
    }}>
      <header style={{
        borderBottom: '1px solid #EFEAE0', background: '#fff',
      }}>
        <div style={{
          maxWidth: 720, margin: '0 auto',
          padding: '18px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Link to="/" style={{
            display: 'flex', alignItems: 'center', gap: 10,
            textDecoration: 'none', color: 'inherit',
          }}>
            <LogoMark size={28} />
            <span style={{ fontSize: 15, fontWeight: 600 }}>E-Dream Tools</span>
          </Link>
          <Link to="/" style={{
            fontSize: 13, color: '#6B6B66', textDecoration: 'none',
          }}>
            ← Trang chủ
          </Link>
        </div>
      </header>

      <main style={{
        maxWidth: 720, margin: '0 auto',
        padding: '32px 24px 48px',
      }}>
        <h1 style={{
          fontSize: 28, fontWeight: 700, margin: 0,
          letterSpacing: '-0.02em',
        }}>
          {title}
        </h1>
        {subtitle && (
          <div style={{
            fontSize: 13, color: '#8A8A82', marginTop: 6,
          }}>
            {subtitle}
          </div>
        )}
        {children}
      </main>

      <footer style={{
        borderTop: '1px solid #EFEAE0', background: '#FAFAF7',
        padding: '24px 24px 32px',
      }}>
        <div style={{
          maxWidth: 720, margin: '0 auto',
          display: 'flex', flexWrap: 'wrap', gap: 12,
          alignItems: 'center', justifyContent: 'space-between',
          fontSize: 13, color: '#6B6B66',
        }}>
          <div>© E-Dream — edream.vn</div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <a href="https://zalo.me/0901234567" target="_blank" rel="noopener noreferrer"
              style={{ color: '#1D9E75', textDecoration: 'none', fontWeight: 500 }}>
              Zalo hỗ trợ
            </a>
            <a href="https://edream.vn" target="_blank" rel="noopener noreferrer"
              style={{ color: '#6B6B66', textDecoration: 'none' }}>
              edream.vn
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
