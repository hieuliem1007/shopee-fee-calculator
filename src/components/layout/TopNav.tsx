import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: 8,
        background: 'linear-gradient(135deg, #F5B81C 0%, #E8A60E 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 1px 0 rgba(255,255,255,.4) inset, 0 2px 6px rgba(245,184,28,.35)',
        flexShrink: 0,
      }}
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 20 20">
        <path d="M4 3 L16 3 L16 6 L7 6 L7 8.5 L14 8.5 L14 11.5 L7 11.5 L7 14 L16 14 L16 17 L4 17 Z"
          fill="#1A1A1A" />
      </svg>
    </div>
  )
}

export function TopNav() {
  const [open, setOpen] = useState(false)

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 30, height: 60,
      background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid #EFEAE0',
    }}>
      <div style={{
        maxWidth: 1240, margin: '0 auto', height: '100%',
        padding: '0 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LogoMark size={30} />
          <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>E-Dream</span>
          <span style={{
            marginLeft: 8, fontSize: 11, fontWeight: 500, color: '#6B6B66',
            padding: '3px 8px', borderRadius: 999, background: '#F5F2EA',
            letterSpacing: '0.02em',
          }}>SHOPEE TOOLKIT</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
          <button onClick={() => setOpen(!open)} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'transparent', border: 0, padding: '6px 8px',
            borderRadius: 999, cursor: 'pointer',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%)',
              color: '#F5B81C', fontSize: 12, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>HL</div>
            <span style={{ fontSize: 13, color: '#1A1A1A', fontWeight: 500 }}>hieuliem@…</span>
            <ChevronDown size={14} color="#6B6B66" />
          </button>
          {open && (
            <div onClick={() => setOpen(false)} style={{
              position: 'absolute', top: 44, right: 0, minWidth: 220,
              background: '#fff', border: '1px solid #EFEAE0',
              borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
              padding: 6, fontSize: 13,
            }}>
              {['Tài khoản', 'Lịch sử tính', 'Cài đặt', 'Đăng xuất'].map((x, i) => (
                <div key={i} style={{
                  padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
                  color: i === 3 ? '#E24B4A' : '#1A1A1A',
                }}>{x}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export { LogoMark }
