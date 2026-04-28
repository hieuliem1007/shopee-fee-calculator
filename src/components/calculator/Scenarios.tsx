import { useState, useEffect, useMemo } from 'react'
import { Bookmark, LayoutGrid, X } from 'lucide-react'
import { derive } from '@/lib/fees'
import { fmtVND, fmtPct } from '@/lib/utils'
import type { Scenario, CalculatorState, FeeSnapshot, Category } from '@/types/fees'

const SHOP_TYPE_LABEL: Record<string, string> = { mall: 'Shop Mall', normal: 'Shop thường' }
const makeCategoryLabel = (categories: Category[]) =>
  (id: string) => categories.find(x => x.id === id)?.name ?? id
const fmtTime = (ts: number) => {
  const d = new Date(ts)
  return `Lưu lúc ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function deriveFromSnapshot(snap: FeeSnapshot) {
  return derive(snap.costPrice, snap.sellPrice, snap.fixedFees, snap.varFees)
}

// ── ScenarioMiniCard ──────────────────────────────────────────────
function ScenarioMiniCard({ s, isBest, onRename, onRemove }: {
  s: Scenario; isBest: boolean
  onRename: (id: string, name: string) => void
  onRemove: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(s.name)
  useEffect(() => setName(s.name), [s.name])
  const d = deriveFromSnapshot(s.snapshot)
  const isPos = d.profit >= 0

  const commit = () => {
    setEditing(false)
    if (name.trim() && name !== s.name) onRename(s.id, name.trim())
    else setName(s.name)
  }

  return (
    <div style={{
      flex: '1 1 220px', minWidth: 220, maxWidth: 320,
      background: '#F9FAFB', border: `1px solid ${isBest ? '#F5B81C' : '#E5E7EB'}`,
      borderRadius: 10, padding: '12px 16px', position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        {editing ? (
          <input autoFocus value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setName(s.name); setEditing(false) } }}
            style={{ flex: 1, minWidth: 0, padding: '2px 4px', borderRadius: 5, border: '1px solid #E5E7EB', background: '#fff', fontSize: 14, fontWeight: 600, outline: 'none', fontFamily: 'inherit' }} />
        ) : (
          <button onClick={() => setEditing(true)}
            style={{ flex: 1, minWidth: 0, padding: 0, background: 'transparent', border: 'none', cursor: 'text', fontSize: 14, fontWeight: 600, color: '#1A1A1A', fontFamily: 'inherit', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {s.name}
          </button>
        )}
        {isBest && (
          <span style={{ padding: '2px 8px', borderRadius: 999, background: '#FEF3C7', color: '#92400E', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>Tốt nhất</span>
        )}
        <button onClick={() => onRemove(s.id)}
          style={{ width: 22, height: 22, borderRadius: 5, padding: 0, background: 'transparent', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#DC2626' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#9CA3AF' }}
        ><X size={14} /></button>
      </div>
      <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6, fontVariantNumeric: 'tabular-nums' }}>
        Giá bán: {fmtVND(s.snapshot.sellPrice)} · Giá vốn: {fmtVND(s.snapshot.costPrice)}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: isPos ? '#16A34A' : '#DC2626', fontVariantNumeric: 'tabular-nums' }}>
        {fmtVND(d.profit)} <span style={{ fontSize: 13, fontWeight: 500 }}>({fmtPct(d.profitPct, true)})</span>
      </div>
    </div>
  )
}

// ── CompareModal ──────────────────────────────────────────────────
function ScenarioColHeader({ s, isBest, onRename, onRemove }: {
  s: Scenario & ReturnType<typeof deriveFromSnapshot>; isBest: boolean
  onRename: (id: string, name: string) => void; onRemove: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(s.name)
  useEffect(() => setName(s.name), [s.name])
  const commit = () => {
    setEditing(false)
    if (name.trim() && name !== s.name) onRename(s.id, name.trim())
    else setName(s.name)
  }
  return (
    <div style={{
      padding: '10px 12px',
      borderLeft: isBest ? '2px solid #F5B81C' : 'none',
      background: isBest ? '#FFFBEB' : 'transparent',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        {editing ? (
          <input autoFocus value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setName(s.name); setEditing(false) } }}
            style={{ flex: 1, minWidth: 0, padding: '2px 4px', borderRadius: 5, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 600, outline: 'none', fontFamily: 'inherit' }} />
        ) : (
          <button onClick={() => setEditing(true)} style={{ flex: 1, padding: 0, background: 'transparent', border: 'none', fontSize: 13, fontWeight: 600, color: '#1A1A1A', cursor: 'text', fontFamily: 'inherit' }}>{s.name}</button>
        )}
        <button onClick={() => onRemove(s.id)} style={{ width: 20, height: 20, padding: 0, background: 'transparent', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} /></button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: '#9CA3AF' }}>{fmtTime(s.ts)}</span>
        {isBest && <span style={{ padding: '2px 8px', borderRadius: 999, background: '#FEF3C7', color: '#92400E', fontSize: 11, fontWeight: 600 }}>Tốt nhất</span>}
      </div>
    </div>
  )
}

type ScData = Scenario & ReturnType<typeof deriveFromSnapshot>

function CompareTable({ data, bestId, onRename, onRemove, onApply, categoryLabel }: {
  data: ScData[]; bestId: string | null
  onRename: (id: string, name: string) => void
  onRemove: (id: string) => void
  onApply: (s: ScData) => void
  categoryLabel: (id: string) => string
}) {
  const cols = data.length
  const labelW = 160
  if (cols === 0) return (
    <div style={{ padding: '40px 20px', textAlign: 'center', border: '1px dashed #E5E7EB', borderRadius: 12, color: '#9CA3AF', fontSize: 13 }}>
      Chưa có kịch bản nào.
    </div>
  )

  const allSame = (vals: unknown[]) => vals.every(v => String(v) === String(vals[0]))

  const Row = ({ label, valKey, render, last }: { label: string; valKey: string; render: (s: ScData) => React.ReactNode; last?: boolean }) => {
    const vals = data.map(s => {
      switch (valKey) {
        case 'costPrice': return s.snapshot.costPrice
        case 'sellPrice': return s.snapshot.sellPrice
        case 'shopType':  return s.snapshot.shopType
        case 'category':  return s.snapshot.category
        case 'fixedTotal': return Math.round(s.fixedTotal)
        case 'varTotal':   return Math.round(s.varTotal)
        case 'feeTotal':   return Math.round(s.feeTotal)
        case 'feePct':     return s.revenue > 0 ? +((s.feeTotal / s.revenue) * 100).toFixed(2) : 0
        case 'revenue':    return s.revenue
        default: return null
      }
    })
    const same = allSame(vals)
    return (
      <div style={{ display: 'grid', gridTemplateColumns: `${labelW}px repeat(${cols}, 1fr)`, borderBottom: last ? 'none' : '1px solid #F3F4F6' }}>
        <div style={{ padding: '10px 12px', fontSize: 13, color: '#6B7280', fontWeight: 500, background: '#fff', position: 'sticky', left: 0, zIndex: 1 }}>{label}</div>
        {data.map((s) => (
          <div key={s.id} style={{ padding: '10px 12px', fontSize: 13, color: '#1A1A1A', fontVariantNumeric: 'tabular-nums', textAlign: 'right', background: !same ? '#FFFBEB' : 'transparent', fontWeight: 500 }}>{render(s)}</div>
        ))}
      </div>
    )
  }

  const GroupHeader = ({ label }: { label: string }) => (
    <div style={{ display: 'grid', gridTemplateColumns: `${labelW}px repeat(${cols}, 1fr)`, background: '#F9FAFB' }}>
      <div style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', position: 'sticky', left: 0, background: '#F9FAFB' }}>{label}</div>
      {data.map(s => <div key={s.id} style={{ background: '#F9FAFB' }}></div>)}
    </div>
  )

  const ResultRow = ({ label, render, big, mid, last }: { label: string; render: (s: ScData) => React.ReactNode; big?: boolean; mid?: boolean; last?: boolean }) => (
    <div style={{ display: 'grid', gridTemplateColumns: `${labelW}px repeat(${cols}, 1fr)`, borderBottom: last ? 'none' : '1px solid #F3F4F6' }}>
      <div style={{ padding: '12px', fontSize: 13, color: '#1A1A1A', fontWeight: 600, background: '#fff', position: 'sticky', left: 0, zIndex: 1 }}>{label}</div>
      {data.map(s => (
        <div key={s.id} style={{ padding: '12px', textAlign: 'right', fontSize: big ? 18 : (mid ? 16 : 13), fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {render(s)}
        </div>
      ))}
    </div>
  )

  return (
    <div style={{ minWidth: Math.max(560, labelW + cols * 180), border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `${labelW}px repeat(${cols}, 1fr)`, borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ padding: '14px 12px', background: '#fff', position: 'sticky', left: 0, zIndex: 2 }}></div>
        {data.map(s => (
          <ScenarioColHeader key={s.id} s={s} isBest={s.id === bestId} onRename={onRename} onRemove={onRemove} />
        ))}
      </div>

      <GroupHeader label="Đầu vào" />
      <Row label="Giá vốn"    valKey="costPrice" render={(s) => fmtVND(s.snapshot.costPrice)} />
      <Row label="Giá bán"    valKey="sellPrice" render={(s) => fmtVND(s.snapshot.sellPrice)} />
      <Row label="Loại shop"  valKey="shopType"  render={(s) => SHOP_TYPE_LABEL[s.snapshot.shopType] || s.snapshot.shopType} />
      <Row label="Ngành hàng" valKey="category"  render={(s) => categoryLabel(s.snapshot.category)} last />

      <GroupHeader label="Chi phí" />
      <Row label="Tổng phí cố định"  valKey="fixedTotal" render={(s) => fmtVND(s.fixedTotal)} />
      <Row label="Tổng phí biến đổi" valKey="varTotal"   render={(s) => fmtVND(s.varTotal)} />
      <Row label="Tổng chi phí"      valKey="feeTotal"   render={(s) => fmtVND(s.feeTotal)} />
      <Row label="% Phí / Doanh thu" valKey="feePct"     render={(s) => fmtPct(s.revenue > 0 ? (s.feeTotal / s.revenue) * 100 : 0)} last />

      <GroupHeader label="Kết quả" />
      <Row label="Doanh thu" valKey="revenue" render={(s) => fmtVND(s.revenue)} />
      <ResultRow label="Lợi nhuận" big render={(s) => (
        <span style={{ color: s.profit >= 0 ? '#16A34A' : '#DC2626' }}>{fmtVND(s.profit)}</span>
      )} />
      <ResultRow label="% Lợi nhuận" mid render={(s) => {
        const isPos = s.profit >= 0
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: isPos ? '#16A34A' : '#DC2626' }}>
            {fmtPct(s.profitPct, true)}
            <span style={{ padding: '2px 8px', borderRadius: 999, background: isPos ? '#DCFCE7' : '#FEE2E2', color: isPos ? '#15803D' : '#B91C1C', fontSize: 11, fontWeight: 600 }}>{isPos ? 'Lãi' : 'Lỗ'}</span>
          </span>
        )
      }} last />

      <div style={{ display: 'grid', gridTemplateColumns: `${labelW}px repeat(${cols}, 1fr)`, borderTop: '1px solid #E5E7EB', background: '#FAFAF7', padding: '12px', gap: 8 }}>
        <div></div>
        {data.map(s => (
          <button key={s.id} onClick={() => onApply(s)} style={{
            width: '100%', height: 36, padding: '0 12px',
            background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8,
            fontSize: 13, fontWeight: 500, color: '#1A1A1A', cursor: 'pointer', fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F5B81C'; (e.currentTarget as HTMLElement).style.borderColor = '#F5B81C' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#fff'; (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB' }}
          >Áp dụng kịch bản này</button>
        ))}
      </div>
    </div>
  )
}

function ScenarioCompareModal({ open, onClose, scenarios, bestId, onRename, onRemove, onApply, categoryLabel }: {
  open: boolean; onClose: () => void
  scenarios: Scenario[]; bestId: string | null
  onRename: (id: string, name: string) => void
  onRemove: (id: string) => void
  onApply: (s: ScData) => void
  categoryLabel: (id: string) => string
}) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else if (mounted) {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 180)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!mounted) return null

  const data: ScData[] = scenarios.map(s => ({ ...s, ...deriveFromSnapshot(s.snapshot) }))

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
      opacity: visible ? 1 : 0,
      transition: 'opacity 180ms ease-out',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 720, maxWidth: '92vw', maxHeight: '85vh',
        background: '#fff', borderRadius: 16, padding: '28px 32px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        display: 'flex', flexDirection: 'column',
        transform: `scale(${visible ? 1 : 0.96})`,
        transition: 'opacity 180ms ease-out, transform 180ms ease-out',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, paddingBottom: 16, borderBottom: '1px solid #F3F4F6' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#1A1A1A' }}>So sánh kịch bản</h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>Bấm "Áp dụng" để load kịch bản vào form chính</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, padding: 0, background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ flex: 1, marginTop: 16, overflowX: 'auto', overflowY: 'auto' }}>
          <CompareTable data={data} bestId={bestId} onRename={onRename} onRemove={onRemove} onApply={onApply} categoryLabel={categoryLabel} />
        </div>
      </div>
    </div>
  )
}

// ── ScenariosSection ──────────────────────────────────────────────
interface Props {
  scenarios: Scenario[]
  setScenarios: (s: Scenario[]) => void
  current: CalculatorState
  onApply: (s: ScData) => void
  categories: Category[]
}

export function ScenariosSection({ scenarios, setScenarios, current, onApply, categories }: Props) {
  const categoryLabel = useMemo(() => makeCategoryLabel(categories), [categories])
  const [modalOpen, setModalOpen] = useState(false)
  const max = 3
  const isFull = scenarios.length >= max
  const isEmpty = scenarios.length === 0

  const bestId = useMemo(() => {
    if (scenarios.length < 2) return null
    let best = scenarios[0], bestP = deriveFromSnapshot(best.snapshot).profit
    for (const s of scenarios.slice(1)) {
      const p = deriveFromSnapshot(s.snapshot).profit
      if (p > bestP) { best = s; bestP = p }
    }
    return best.id
  }, [scenarios])

  const handleSave = () => {
    if (isFull) return
    const id = 'sc_' + Date.now()
    const used = new Set(scenarios.map(s => s.name))
    let idx = scenarios.length + 1, name = `Kịch bản ${idx}`
    while (used.has(name)) { idx++; name = `Kịch bản ${idx}` }
    setScenarios([...scenarios, { id, name, ts: Date.now(), snapshot: JSON.parse(JSON.stringify(current)) }])
  }

  const handleRename = (id: string, name: string) => setScenarios(scenarios.map(s => s.id === id ? { ...s, name } : s))
  const handleRemove = (id: string) => setScenarios(scenarios.filter(s => s.id !== id))

  return (
    <section style={{ marginTop: 32, paddingTop: 32, borderTop: '1px solid #EFEAE0' }}>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: '#1A1A1A' }}>So sánh kịch bản</h2>
      <p style={{ margin: '6px 0 20px', fontSize: 14, color: '#6B7280' }}>
        Lưu lại các cấu hình khác nhau và so sánh lợi nhuận side-by-side. Tối đa 3 kịch bản.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button onClick={handleSave} disabled={isFull}
          title={isFull ? 'Đã đạt tối đa 3 kịch bản' : ''}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            height: 40, padding: '0 20px', borderRadius: 8,
            background: isFull ? '#E5E7EB' : '#F5B81C',
            color: isFull ? '#9CA3AF' : '#1A1A1A',
            border: 'none', fontSize: 14, fontWeight: 500,
            cursor: isFull ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            boxShadow: isFull ? 'none' : '0 1px 0 rgba(255,255,255,0.4) inset, 0 2px 6px rgba(245,184,28,0.3)',
          }}
        >
          <Bookmark size={15} /> Lưu kịch bản hiện tại
        </button>

        {!isEmpty && (
          <span style={{ padding: '4px 12px', borderRadius: 999, background: '#F3F4F6', color: '#6B7280', fontSize: 12, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
            {scenarios.length}/{max} kịch bản
          </span>
        )}

        <button onClick={() => setModalOpen(true)} disabled={isEmpty}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            height: 40, padding: '0 20px', borderRadius: 8,
            background: '#fff', color: isEmpty ? '#9CA3AF' : '#374151',
            border: '1px solid #E5E7EB', fontSize: 14, fontWeight: 500,
            cursor: isEmpty ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          }}
        >
          <LayoutGrid size={15} /> Xem so sánh{!isEmpty ? ` (${scenarios.length})` : ''}
        </button>
      </div>

      {!isEmpty && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
          {scenarios.map(s => (
            <ScenarioMiniCard key={s.id} s={s} isBest={s.id === bestId}
              onRename={handleRename} onRemove={handleRemove} />
          ))}
        </div>
      )}

      <ScenarioCompareModal
        open={modalOpen} onClose={() => setModalOpen(false)}
        scenarios={scenarios} bestId={bestId}
        onRename={handleRename} onRemove={handleRemove}
        onApply={(s) => { onApply(s); setModalOpen(false) }}
        categoryLabel={categoryLabel}
      />
    </section>
  )
}

export type { ScData }
