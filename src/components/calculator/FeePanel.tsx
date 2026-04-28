import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Plus, Trash2 } from 'lucide-react'
import { computeFee } from '@/lib/fees'
import { fmtVND, fmtNum, fmtPct } from '@/lib/utils'
import type { Fee, FeeKind } from '@/types/fees'

// ── Toggle ───────────────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  const w = 28, h = 16, k = h - 4
  return (
    <button onClick={() => onChange(!on)} style={{
      position: 'relative', width: w, height: h, borderRadius: 999,
      background: on ? '#1A1A1A' : '#D9D5C8', border: 0,
      cursor: 'pointer', padding: 0, transition: 'background 0.18s', flexShrink: 0,
    }}>
      <span style={{
        position: 'absolute', top: 2, left: on ? w - k - 2 : 2,
        width: k, height: k, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 2px rgba(0,0,0,0.18)', transition: 'left 0.18s',
      }} />
    </button>
  )
}

// ── EditableText ──────────────────────────────────────────────────
function EditableText({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [tmp, setTmp] = useState(value)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { if (editing) ref.current?.select() }, [editing])

  const commit = () => {
    onChange((tmp || '').trim() || 'Khoản phí mới')
    setEditing(false)
  }
  if (editing) {
    return (
      <input ref={ref} type="text" value={tmp}
        onChange={(e) => setTmp(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setTmp(value); setEditing(false) } }}
        style={{
          width: '100%', padding: '4px 6px', borderRadius: 5,
          border: '1.5px solid #1A1A1A', background: '#fff',
          fontSize: 13, fontWeight: 500, color: '#1A1A1A',
          outline: 'none', fontFamily: 'inherit',
        }} />
    )
  }
  return (
    <span onClick={() => { setTmp(value); setEditing(true) }} style={{
      cursor: 'text', borderBottom: '1px dashed #C9C5BA', paddingBottom: 1,
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    }} title="Nhấn để sửa tên">{value}</span>
  )
}

// ── EditableRate ──────────────────────────────────────────────────
function EditableRate({ fee, onRate, onKind, dim, accent }: {
  fee: Fee; onRate: (v: number) => void; onKind: (k: FeeKind) => void
  dim: boolean; accent: string
}) {
  const [editing, setEditing] = useState(false)
  const [tmp, setTmp] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (editing) { inputRef.current?.focus(); inputRef.current?.select() } }, [editing])
  useEffect(() => {
    const h = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMenuOpen(false) }
    if (menuOpen) document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [menuOpen])

  const startEdit = () => {
    const v = fee.kind === 'pct'
      ? (+(fee.rate * 100).toFixed(2)).toString().replace('.', ',')
      : fee.rate.toString()
    setTmp(v); setEditing(true)
  }
  const commit = () => {
    const cleaned = tmp.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '')
    const n = parseFloat(cleaned)
    if (!isNaN(n) && n >= 0) {
      fee.kind === 'pct' ? onRate(Math.min(100, n) / 100) : onRate(Math.round(n))
    }
    setEditing(false)
  }

  const chip: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center',
    padding: '4px 9px', borderRadius: 6,
    fontSize: 12, fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
    cursor: 'pointer', userSelect: 'none',
    background: '#F5F2EA', color: dim ? '#A8A89E' : '#1A1A1A',
    border: '1px solid transparent', transition: 'all 0.12s',
  }

  if (editing) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <input ref={inputRef} type="text" value={tmp}
          onChange={(e) => setTmp(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
          inputMode="decimal"
          style={{
            width: 60, padding: '3px 6px', borderRadius: 5,
            border: `1.5px solid ${accent}`, background: '#fff',
            fontSize: 12, fontWeight: 600, color: '#1A1A1A',
            outline: 'none', fontFamily: 'inherit', textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
          }} />
        <span style={{ fontSize: 11, color: '#6B6B66', fontWeight: 600 }}>
          {fee.kind === 'pct' ? '%' : 'đ'}
        </span>
      </div>
    )
  }

  const rateDisplay = fee.kind === 'pct'
    ? (() => {
        const p = +(fee.rate * 100).toFixed(2)
        return (p % 1 === 0 ? p.toFixed(0) : p.toString()).replace('.', ',') + '%'
      })()
    : fmtNum(fee.rate) + 'đ'

  return (
    <div ref={wrapRef} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, position: 'relative' }}>
      <span onClick={startEdit} title="Nhấn để sửa" style={chip}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#FAF6E8'; (e.currentTarget as HTMLElement).style.borderColor = `${accent}66` }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#F5F2EA'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent' }}
      >{rateDisplay}</span>
      {fee.custom && (
        <button onClick={() => setMenuOpen(!menuOpen)} title="Đổi loại" style={{
          width: 18, height: 18, padding: 0, borderRadius: 4,
          background: 'transparent', border: 'none',
          color: '#A8A89E', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ChevronDown size={12} />
        </button>
      )}
      {menuOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4,
          background: '#fff', border: '1px solid #EFEAE0', borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: 4, zIndex: 20,
          fontSize: 12, minWidth: 160,
        }}>
          {(['pct', 'flat'] as FeeKind[]).map(k => (
            <div key={k} onClick={() => { onKind(k); setMenuOpen(false) }} style={{
              padding: '7px 10px', borderRadius: 5, cursor: 'pointer',
              color: '#1A1A1A', background: k === fee.kind ? '#FAF6E8' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              {k === 'pct' ? '% theo doanh thu' : 'Số tiền cố định / đơn'}
              {k === fee.kind && <Check size={12} color="#A47408" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── FeeRow ────────────────────────────────────────────────────────
function FeeRow({ fee, dim, amt, isLast, onToggle, onRate, onKind, onName, onRemove, accent }: {
  fee: Fee; dim: boolean; amt: number; isLast: boolean
  onToggle: () => void; onRate: (v: number) => void; onKind: (k: FeeKind) => void
  onName: (n: string) => void; onRemove: () => void; accent: string
}) {
  const [hover, setHover] = useState(false)
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{
      display: 'grid', gridTemplateColumns: '1.2fr 0.85fr 1.55fr auto',
      gap: 12, padding: '14px 20px', alignItems: 'center',
      borderBottom: isLast ? 'none' : '1px solid #F5F2EA',
      background: dim ? '#FAFAF7' : '#fff', transition: 'background 0.15s',
    }}>
      <div style={{
        fontSize: 13, fontWeight: 500, color: dim ? '#A8A89E' : '#1A1A1A',
        display: 'flex', alignItems: 'center', gap: 6, minWidth: 0,
      }}>
        {fee.custom ? (
          <EditableText value={fee.name} onChange={onName} />
        ) : (
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {fee.name}
          </span>
        )}
        {fee.custom && hover && (
          <button onClick={onRemove} title="Xóa" style={{
            width: 20, height: 20, borderRadius: 5, padding: 0,
            background: 'transparent', border: 'none',
            color: '#E24B4A', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Trash2 size={13} />
          </button>
        )}
      </div>
      <div>
        <EditableRate fee={fee} onRate={onRate} onKind={onKind} dim={dim} accent={accent} />
      </div>
      <div style={{ textAlign: 'right', paddingRight: 10 }}>
        <div style={{
          fontSize: 14, fontWeight: 600,
          color: dim ? '#A8A89E' : '#1A1A1A',
          fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
        }}>{dim ? '0đ' : fmtVND(amt)}</div>
        <div style={{ fontSize: 11, color: '#8A8A82', marginTop: 2, lineHeight: 1.4 }}>
          {fee.hint}
        </div>
      </div>
      <Toggle on={fee.on} onChange={onToggle} />
    </div>
  )
}

// ── FeePanel ──────────────────────────────────────────────────────
interface FeePanelProps {
  title: string
  fees: Fee[]
  setFees: (f: Fee[]) => void
  revenue: number
  color: string
  accentBg: string
}

export function FeePanel({ title, fees, setFees, revenue, color, accentBg }: FeePanelProps) {
  const subtotal = fees.reduce((s, f) => s + computeFee(f, revenue), 0)
  const subPctRev = revenue > 0 ? (subtotal / revenue) * 100 : 0
  const [adding, setAdding] = useState(false)

  const toggle = (id: string) => setFees(fees.map(f => f.id === id ? { ...f, on: !f.on } : f))
  const updateRate = (id: string, rate: number) => setFees(fees.map(f => f.id === id ? { ...f, rate } : f))
  const updateName = (id: string, name: string) => setFees(fees.map(f => f.id === id ? { ...f, name } : f))
  const updateKind = (id: string, kind: FeeKind) => setFees(fees.map(f => {
    if (f.id !== id) return f
    return { ...f, kind, rate: kind === 'pct' ? 0.05 : 5000 }
  }))
  const removeFee = (id: string) => setFees(fees.filter(f => f.id !== id))
  const addFee = (kind: FeeKind) => {
    const id = 'custom_' + Date.now()
    setFees([...fees, { id, name: 'Khoản phí mới', kind, rate: kind === 'pct' ? 0.03 : 3000, on: true, hint: 'Tùy chỉnh', custom: true }])
    setAdding(false)
  }

  const isGold = color === '#F5B81C'

  return (
    <div style={{
      background: '#fff', border: '1px solid #EFEAE0', borderRadius: 14,
      overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
    }}>
      <div style={{
        background: accentBg, padding: '14px 20px',
        borderBottom: `1px solid ${color}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>{title}</h3>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#6B6B66', letterSpacing: '0.04em' }}>
          {fees.filter(f => f.on).length}/{fees.length} ÁP DỤNG
        </span>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1.2fr 0.85fr 1.55fr auto',
        gap: 12, padding: '8px 20px',
        fontSize: 10, fontWeight: 600, color: '#A8A89E',
        letterSpacing: '0.06em', textTransform: 'uppercase',
        borderBottom: '1px solid #F5F2EA',
      }}>
        <div>Khoản phí</div><div>Tỷ lệ</div>
        <div style={{ textAlign: 'right', paddingRight: 10 }}>Số tiền · Ghi chú</div>
        <div style={{ width: 30 }}></div>
      </div>

      <div>
        {fees.map((f, i) => (
          <FeeRow key={f.id} fee={f} dim={!f.on} amt={computeFee(f, revenue)}
            isLast={i === fees.length - 1}
            onToggle={() => toggle(f.id)}
            onRate={(v) => updateRate(f.id, v)}
            onKind={(k) => updateKind(f.id, k)}
            onName={(n) => updateName(f.id, n)}
            onRemove={() => removeFee(f.id)}
            accent={color} />
        ))}
      </div>

      {/* Add fee */}
      <div style={{ padding: '10px 20px 14px', background: '#FAFAF7', borderTop: '1px dashed #E2DDD0' }}>
        {!adding ? (
          <button onClick={() => setAdding(true)} style={{
            width: '100%', padding: '10px 14px', borderRadius: 8,
            background: '#fff', border: `1px dashed ${color}`,
            color: isGold ? '#A47408' : color,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, fontFamily: 'inherit', transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = accentBg }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#fff' }}
          >
            <Plus size={14} /> Thêm khoản phí
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            {(['pct', 'flat'] as FeeKind[]).map(k => (
              <button key={k} onClick={() => addFee(k)} style={{
                flex: 1, padding: '10px 12px', borderRadius: 8,
                background: accentBg, border: `1px solid ${color}66`,
                color: isGold ? '#A47408' : color,
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 6, fontFamily: 'inherit',
              }}>
                <Plus size={13} /> {k === 'pct' ? '% theo doanh thu' : 'Số tiền cố định / đơn'}
              </button>
            ))}
            <button onClick={() => setAdding(false)} style={{
              padding: '10px 12px', borderRadius: 8, background: 'transparent',
              border: '1px solid #E2DDD0', color: '#6B6B66',
              fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            }}>Hủy</button>
          </div>
        )}
      </div>

      {/* Subtotal */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        padding: '14px 20px',
        background: isGold ? '#FAF1D6' : '#DCEAF8',
        borderTop: `1.5px solid ${color}`,
      }}>
        <div>
          <div style={{
            fontSize: 13, fontWeight: 700,
            color: isGold ? '#7A5408' : '#1F4E80',
            letterSpacing: '0.02em', textTransform: 'uppercase',
          }}>Tổng cộng</div>
          <div style={{ fontSize: 11, color: isGold ? '#A47408' : '#3B6EA6', marginTop: 2, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
            {fmtPct(subPctRev)} so với doanh thu
          </div>
        </div>
        <div style={{
          fontSize: 22, fontWeight: 700,
          color: isGold ? '#7A5408' : '#1F4E80',
          fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
        }}>{fmtVND(subtotal)}</div>
      </div>
    </div>
  )
}
