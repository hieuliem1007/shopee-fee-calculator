import { useEffect, useState } from 'react'
import { Bookmark } from 'lucide-react'
import { fmtVND, fmtPct } from '@/lib/utils'

interface Props {
  profit: number
  profitPct: number
  onSave: () => void
}

export function StickyBar({ profit, profitPct, onSave }: Props) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const card = document.querySelector('[data-result-card]')
    if (!card) return
    const io = new IntersectionObserver(([entry]) => {
      setShow(!entry.isIntersecting && entry.boundingClientRect.top < 0)
    }, { threshold: 0 })
    io.observe(card)
    return () => io.disconnect()
  }, [])

  const isProfit = profit >= 0

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
      background: '#fff', borderBottom: '1px solid #EFEAE0',
      height: 52, padding: '0 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      transform: show ? 'translateY(0)' : 'translateY(-100%)',
      opacity: show ? 1 : 0,
      transition: 'transform 200ms ease, opacity 200ms ease',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      pointerEvents: show ? 'auto' : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 12, color: '#8A8A82', fontWeight: 500 }}>Lợi nhuận</span>
        <span style={{
          fontSize: 16, fontWeight: 600,
          color: isProfit ? '#1D9E75' : '#DC2626',
          fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
        }}>{fmtVND(profit)}</span>
        <span style={{
          padding: '3px 8px', borderRadius: 999,
          background: isProfit ? '#E1F5EE' : '#FCE5E4',
          color: isProfit ? '#0F6E56' : '#A82928',
          fontSize: 11, fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
        }}>{fmtPct(profitPct, true)}</span>
      </div>
      <button onClick={onSave} style={{
        height: 36, padding: '0 14px', borderRadius: 8,
        background: '#F5B81C', color: '#1A1A1A', border: 0,
        fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        display: 'inline-flex', alignItems: 'center', gap: 6,
        boxShadow: '0 1px 0 rgba(255,255,255,0.4) inset',
      }}>
        <Bookmark size={13} /> Lưu kết quả
      </button>
    </div>
  )
}
