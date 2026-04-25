import { GAUGE_SEGMENTS, segmentForPct } from '@/lib/fees'

const FLEX = [10, 3, 7, 10, 10]

export function ProfitGauge({ pct }: { pct: number }) {
  const ai = segmentForPct(pct)
  const lo = -10, hi = 30
  const clamped = Math.max(lo, Math.min(hi, pct))
  const pointer = ((clamped - lo) / (hi - lo)) * 100

  return (
    <div style={{ marginTop: 24, position: 'relative' }}>
      <div style={{
        display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden',
        gap: 2, background: 'rgba(0,0,0,0.03)', padding: 2,
      }}>
        {GAUGE_SEGMENTS.map((s, i) => {
          const active = i === ai
          return (
            <div key={s.id} style={{
              flex: FLEX[i],
              background: s.color,
              opacity: active ? 1 : 0.22,
              borderRadius: 999,
              transition: 'opacity 0.25s, box-shadow 0.25s',
              boxShadow: active ? `0 0 0 2px ${s.color}33, 0 2px 8px ${s.color}66` : 'none',
              transform: active ? 'scaleY(1.15)' : 'scaleY(1)',
              transformOrigin: 'center',
            }} />
          )
        })}
      </div>
      <div style={{
        position: 'absolute', top: -6, left: `calc(${pointer}% - 9px)`,
        width: 18, height: 22, transition: 'left 0.4s cubic-bezier(0.2,0.8,0.2,1)',
        pointerEvents: 'none',
      }}>
        <svg viewBox="0 0 18 22" width="18" height="22">
          <path d="M9 22 L0 6 A9 9 0 1 1 18 6 Z" fill="#1A1A1A" />
          <circle cx="9" cy="9" r="3" fill="#F5B81C" />
        </svg>
      </div>
      <div style={{
        display: 'flex', marginTop: 14, fontSize: 11, fontWeight: 500,
        color: '#8A8A82', gap: 2,
      }}>
        {GAUGE_SEGMENTS.map((s, i) => (
          <div key={s.id} style={{
            flex: FLEX[i], textAlign: 'center',
            color: i === ai ? '#1A1A1A' : '#A8A89E',
            fontWeight: i === ai ? 600 : 500,
            transition: 'color 0.2s',
          }}>{s.label}</div>
        ))}
      </div>
    </div>
  )
}
