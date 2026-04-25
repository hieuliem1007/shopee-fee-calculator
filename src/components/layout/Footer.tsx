import { LogoMark } from './TopNav'

export function Footer() {
  return (
    <footer style={{
      marginTop: 48, padding: '28px 0 40px',
      borderTop: '1px solid #EFEAE0', textAlign: 'center',
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <LogoMark size={22} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>E-Dream</span>
      </div>
      <div style={{ fontSize: 12, color: '#8A8A82' }}>
        Bản quyền © Nguyễn Hiếu Liêm — edream.vn
      </div>
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 18,
        fontSize: 12, color: '#6B6B66', marginTop: 10,
      }}>
        <a href="#" style={{ color: '#6B6B66', textDecoration: 'none' }}>Về E-Dream</a>
        <span style={{ color: '#D9D5C8' }}>·</span>
        <a href="#" style={{ color: '#6B6B66', textDecoration: 'none' }}>Khóa học vận hành Shopee</a>
        <span style={{ color: '#D9D5C8' }}>·</span>
        <a href="#" style={{ color: '#6B6B66', textDecoration: 'none' }}>Liên hệ</a>
      </div>
    </footer>
  )
}
