import { Link } from 'react-router-dom'

const ZALO_LINK = 'https://zalo.me/0901234567'

export function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid #E5E5E0',
      padding: '20px 28px',
      background: 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 12,
      fontSize: 13, color: '#6B6B65',
    }}>
      <div>
        Powered by <strong style={{ color: '#1A1A1A', fontWeight: 600 }}>E-Dream Tools</strong>
        {' · '}
        <a
          href="https://edream.vn" target="_blank" rel="noopener noreferrer"
          style={{ color: '#6B6B65', textDecoration: 'none' }}
        >
          edream.vn
        </a>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <Link to="/terms" style={linkStyle}>Điều khoản sử dụng</Link>
        <span style={{ color: '#D9D5C8' }}>·</span>
        <Link to="/privacy" style={linkStyle}>Chính sách bảo mật</Link>
        <span style={{ color: '#D9D5C8' }}>·</span>
        <a href={ZALO_LINK} target="_blank" rel="noopener noreferrer" style={linkStyle}>
          Liên hệ Zalo
        </a>
      </div>
    </footer>
  )
}

const linkStyle: React.CSSProperties = {
  color: '#6B6B65', textDecoration: 'none',
}
