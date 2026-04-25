// Scenarios section + comparison modal
// Lưu / xem / so sánh tối đa 3 kịch bản

const { useState: useStateSC, useEffect: useEffectSC, useMemo: useMemoSC, useRef: useRefSC } = React;

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────
const SHOP_TYPE_LABEL = { mall: 'Shop Mall', normal: 'Shop thường' };
const TAX_LABEL = { hokd: 'Hộ kinh doanh', company: 'Công ty', personal: 'Cá nhân' };
const categoryLabel = (id) => {
  const c = (window.CATEGORIES || []).find(x => x.id === id);
  return c ? c.name : id;
};
const fmtTime = (ts) => {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `Lưu lúc ${hh}:${mm}`;
};

// Compute everything we need from a snapshot to display in the modal
function deriveFromSnapshot(snap) {
  const revenue = snap.sellPrice;
  const fixedTotal = snap.fixedFees.reduce((s, f) => s + computeFee(f, revenue), 0);
  const varTotal = snap.varFees.reduce((s, f) => s + computeFee(f, revenue), 0);
  const feeTotal = fixedTotal + varTotal;
  const profit = revenue - snap.costPrice - feeTotal;
  const profitPct = revenue > 0 ? (profit / revenue) * 100 : 0;
  return { revenue, fixedTotal, varTotal, feeTotal, profit, profitPct };
}

// ────────────────────────────────────────────────────────────────
// Icons
// ────────────────────────────────────────────────────────────────
const ScColumns = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="9" y1="3" x2="9" y2="21" />
    <line x1="15" y1="3" x2="15" y2="21" />
  </svg>
);
const ScSave = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);
const ScX = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ────────────────────────────────────────────────────────────────
// Mini scenario card (preview)
// ────────────────────────────────────────────────────────────────
function ScenarioMiniCard({ s, isBest, onRename, onRemove }) {
  const [editing, setEditing] = useStateSC(false);
  const [name, setName] = useStateSC(s.name);
  useEffectSC(() => setName(s.name), [s.name]);
  const d = deriveFromSnapshot(s.snapshot);
  const isPositive = d.profit >= 0;

  const commit = () => {
    setEditing(false);
    if (name.trim() && name !== s.name) onRename(s.id, name.trim());
    else setName(s.name);
  };

  return (
    <div style={{
      flex: '1 1 220px', minWidth: 220, maxWidth: 320,
      background: '#F9FAFB',
      border: `1px solid ${isBest ? '#F5B81C' : '#E5E7EB'}`,
      borderRadius: 10,
      padding: '12px 16px',
      position: 'relative',
      transition: 'border-color 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        {editing ? (
          <input autoFocus value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setName(s.name); setEditing(false); } }}
            style={{
              flex: 1, minWidth: 0, padding: '2px 4px', borderRadius: 5,
              border: '1px solid #E5E7EB', background: '#fff',
              fontSize: 14, fontWeight: 600, color: '#1A1A1A',
              outline: 'none', fontFamily: 'inherit',
            }} />
        ) : (
          <button onClick={() => setEditing(true)} title="Đổi tên"
            style={{
              flex: 1, minWidth: 0, padding: 0, margin: 0,
              background: 'transparent', border: 'none', cursor: 'text',
              fontSize: 14, fontWeight: 600, color: '#1A1A1A',
              fontFamily: 'inherit', textAlign: 'left',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              borderBottom: '1px dashed transparent',
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderBottomColor = '#D1D5DB'}
            onMouseLeave={(e) => e.currentTarget.style.borderBottomColor = 'transparent'}
          >{s.name}</button>
        )}
        {isBest && (
          <span style={{
            padding: '2px 8px', borderRadius: 999,
            background: '#FEF3C7', color: '#92400E',
            fontSize: 11, fontWeight: 600, lineHeight: '16px',
            flexShrink: 0,
          }}>Tốt nhất</span>
        )}
        <button onClick={() => onRemove(s.id)} title="Xóa kịch bản"
          style={{
            width: 22, height: 22, borderRadius: 5, padding: 0,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#DC2626'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#9CA3AF'}
        ><ScX /></button>
      </div>
      <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6,
        fontVariantNumeric: 'tabular-nums' }}>
        Giá bán: {fmtVND(s.snapshot.sellPrice)} · Giá vốn: {fmtVND(s.snapshot.costPrice)}
      </div>
      <div style={{
        fontSize: 15, fontWeight: 600,
        color: isPositive ? '#16A34A' : '#DC2626',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.01em',
      }}>
        {fmtVND(d.profit)} <span style={{ fontSize: 13, fontWeight: 500 }}>
          ({fmtPct(d.profitPct, true)})
        </span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Section
// ────────────────────────────────────────────────────────────────
function ScenariosSection({ scenarios, setScenarios, current, onApply }) {
  const [modalOpen, setModalOpen] = useStateSC(false);

  const max = 3;
  const isFull = scenarios.length >= max;
  const isEmpty = scenarios.length === 0;

  // Identify best scenario by profit (only when 2+ exist)
  const bestId = useMemoSC(() => {
    if (scenarios.length < 2) return null;
    let best = scenarios[0], bestProfit = deriveFromSnapshot(best.snapshot).profit;
    for (const s of scenarios.slice(1)) {
      const p = deriveFromSnapshot(s.snapshot).profit;
      if (p > bestProfit) { best = s; bestProfit = p; }
    }
    return best.id;
  }, [scenarios]);

  const handleSave = () => {
    if (isFull) return;
    const id = 'sc_' + Date.now();
    const used = new Set(scenarios.map(s => s.name));
    let idx = scenarios.length + 1, name = `Kịch bản ${idx}`;
    while (used.has(name)) { idx++; name = `Kịch bản ${idx}`; }
    const next = {
      id, name, ts: Date.now(),
      snapshot: JSON.parse(JSON.stringify(current)),
    };
    setScenarios([...scenarios, next]);
  };

  const handleRename = (id, name) => {
    setScenarios(scenarios.map(s => s.id === id ? { ...s, name } : s));
  };
  const handleRemove = (id) => {
    setScenarios(scenarios.filter(s => s.id !== id));
  };

  return (
    <section style={{
      marginTop: 32, paddingTop: 32,
      borderTop: '1px solid #EFEAE0',
    }}>
      <h2 style={{
        margin: 0, fontSize: 22, fontWeight: 600,
        color: '#1A1A1A', letterSpacing: '-0.015em',
      }}>So sánh kịch bản</h2>
      <p style={{
        margin: '6px 0 20px', fontSize: 14, color: '#6B7280',
      }}>
        Lưu lại các cấu hình khác nhau và so sánh lợi nhuận side-by-side. Tối đa 3 kịch bản.
      </p>

      {/* Action row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button onClick={handleSave} disabled={isFull}
          title={isFull ? 'Đã đạt tối đa 3 kịch bản. Xóa bớt để thêm mới.' : ''}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            height: 40, padding: '0 20px', borderRadius: 8,
            background: isFull ? '#E5E7EB' : '#F5B81C',
            color: isFull ? '#9CA3AF' : '#1A1A1A',
            border: 'none', fontSize: 14, fontWeight: 500,
            cursor: isFull ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            boxShadow: isFull ? 'none' : '0 1px 0 rgba(255,255,255,0.4) inset, 0 2px 6px rgba(245,184,28,0.3)',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { if (!isFull) e.currentTarget.style.background = '#FFC83A'; }}
          onMouseLeave={(e) => { if (!isFull) e.currentTarget.style.background = '#F5B81C'; }}
        >
          <ScSave /> Lưu kịch bản hiện tại
        </button>

        {!isEmpty && (
          <span style={{
            padding: '4px 12px', borderRadius: 999,
            background: '#F3F4F6', color: '#6B7280',
            fontSize: 12, fontWeight: 500,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {scenarios.length}/{max} kịch bản
          </span>
        )}

        <button onClick={() => setModalOpen(true)} disabled={isEmpty}
          title={isEmpty ? 'Lưu ít nhất 1 kịch bản để xem so sánh' : ''}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            height: 40, padding: '0 20px', borderRadius: 8,
            background: '#fff',
            color: isEmpty ? '#9CA3AF' : '#374151',
            border: '1px solid #E5E7EB',
            fontSize: 14, fontWeight: 500,
            cursor: isEmpty ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { if (!isEmpty) e.currentTarget.style.background = '#F9FAFB'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
        >
          <ScColumns /> Xem so sánh{!isEmpty ? ` (${scenarios.length})` : ''}
        </button>
      </div>

      {/* Mini preview cards */}
      {!isEmpty && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16,
        }}>
          {scenarios.map(s => (
            <ScenarioMiniCard key={s.id} s={s} isBest={s.id === bestId}
              onRename={handleRename} onRemove={handleRemove} />
          ))}
        </div>
      )}

      <ScenarioCompareModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        scenarios={scenarios}
        bestId={bestId}
        onRename={handleRename}
        onRemove={handleRemove}
        onApply={(s) => { onApply(s); setModalOpen(false); }}
      />
    </section>
  );
}

// ────────────────────────────────────────────────────────────────
// Comparison modal
// ────────────────────────────────────────────────────────────────
function ScenarioCompareModal({ open, onClose, scenarios, bestId, onRename, onRemove, onApply }) {
  const [mounted, setMounted] = useStateSC(false);
  const [visible, setVisible] = useStateSC(false);

  // Mount/unmount with animation
  useEffectSC(() => {
    if (open) {
      setMounted(true);
      // next tick → trigger transition
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else if (mounted) {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 180);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Esc key
  useEffectSC(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  // Derive numbers per scenario
  const data = scenarios.map(s => ({ ...s, ...deriveFromSnapshot(s.snapshot) }));

  return (
    <div onClick={onClose} className="sc-modal-overlay" style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
      opacity: visible ? 1 : 0,
      transition: 'opacity 180ms ease-out',
    }}>
      <div onClick={(e) => e.stopPropagation()} className="sc-modal-panel" style={{
        width: 720, maxWidth: '92vw', maxHeight: '85vh',
        background: '#fff', borderRadius: 16,
        padding: '28px 32px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        display: 'flex', flexDirection: 'column',
        opacity: visible ? 1 : 0,
        '--sc-scale': visible ? 1 : 0.96,
        '--sc-translate': visible ? '0' : '100%',
        transform: 'scale(var(--sc-scale))',
        transition: 'opacity 180ms ease-out, transform 180ms ease-out',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', gap: 16,
          paddingBottom: 16, borderBottom: '1px solid #F3F4F6',
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600,
              color: '#1A1A1A', letterSpacing: '-0.01em' }}>
              So sánh kịch bản
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>
              Bấm "Áp dụng" để load kịch bản vào form chính
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, padding: 0,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#6B7280',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><ScX size={18} /></button>
        </div>

        {/* Body */}
        <div className="sc-modal-body" style={{
          flex: 1, marginTop: 16,
          overflowX: 'auto', overflowY: 'auto',
        }}>
          <CompareTable data={data} bestId={bestId}
            onRename={onRename} onRemove={onRemove} onApply={onApply} />
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .sc-modal-overlay {
            align-items: flex-end !important;
            padding: 0 !important;
          }
          .sc-modal-panel {
            max-width: 100vw !important;
            width: 100vw !important;
            border-radius: 16px 16px 0 0 !important;
            transform: translateY(var(--sc-translate)) !important;
          }
        }
        @keyframes sc-col-in {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .sc-col-anim { animation: sc-col-in 200ms ease-out; }
      `}</style>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Compare table (label column + N scenario columns, grouped rows)
// ────────────────────────────────────────────────────────────────
function CompareTable({ data, bestId, onRename, onRemove, onApply }) {
  const cols = data.length;
  const labelW = 160;

  if (cols === 0) {
    return (
      <div style={{
        padding: '40px 20px', textAlign: 'center',
        border: '1px dashed #E5E7EB', borderRadius: 12,
        color: '#9CA3AF', fontSize: 13,
      }}>
        Chưa có kịch bản nào.
      </div>
    );
  }

  // Helper: are all values in a row equal? (used for diff highlight)
  const allSame = (vals) => vals.every(v => String(v) === String(vals[0]));

  const valuesFor = (key) => data.map(s => {
    switch (key) {
      case 'costPrice':   return s.snapshot.costPrice;
      case 'sellPrice':   return s.snapshot.sellPrice;
      case 'shopType':    return s.snapshot.shopType;
      case 'category':    return s.snapshot.category;
      case 'fixedTotal':  return Math.round(s.fixedTotal);
      case 'varTotal':    return Math.round(s.varTotal);
      case 'feeTotal':    return Math.round(s.feeTotal);
      case 'feePct':      return s.revenue > 0 ? +((s.feeTotal / s.revenue) * 100).toFixed(2) : 0;
      case 'revenue':     return s.revenue;
      default: return null;
    }
  });

  // Generic data row
  const Row = ({ label, valKey, render, last }) => {
    const vals = valuesFor(valKey);
    const same = allSame(vals);
    return (
      <div style={{
        display: 'grid', gridTemplateColumns: `${labelW}px repeat(${cols}, 1fr)`,
        borderBottom: last ? 'none' : '1px solid #F3F4F6',
      }}>
        <div style={{
          padding: '10px 12px', fontSize: 13, color: '#6B7280',
          fontWeight: 500,
          background: '#fff', position: 'sticky', left: 0, zIndex: 1,
        }}>{label}</div>
        {data.map((s, i) => (
          <div key={s.id} style={{
            padding: '10px 12px', fontSize: 13, color: '#1A1A1A',
            fontVariantNumeric: 'tabular-nums', textAlign: 'right',
            background: !same ? '#FFFBEB' : 'transparent',
            fontWeight: 500,
          }}>{render(s, i)}</div>
        ))}
      </div>
    );
  };

  // Group header
  const GroupHeader = ({ label }) => (
    <div style={{
      display: 'grid', gridTemplateColumns: `${labelW}px repeat(${cols}, 1fr)`,
      background: '#F9FAFB',
    }}>
      <div style={{
        padding: '8px 12px', fontSize: 11, fontWeight: 600,
        color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em',
        position: 'sticky', left: 0, background: '#F9FAFB',
      }}>{label}</div>
      {data.map(s => <div key={s.id} style={{ background: '#F9FAFB' }}></div>)}
    </div>
  );

  return (
    <div style={{
      minWidth: Math.max(560, labelW + cols * 180),
      border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden',
    }}>
      {/* Top header: scenario names */}
      <div style={{
        display: 'grid', gridTemplateColumns: `${labelW}px repeat(${cols}, 1fr)`,
        borderBottom: '1px solid #E5E7EB',
      }}>
        <div style={{
          padding: '14px 12px', background: '#fff',
          position: 'sticky', left: 0, zIndex: 2,
        }}></div>
        {data.map(s => (
          <ScenarioColHeader key={s.id} s={s} isBest={s.id === bestId}
            onRename={onRename} onRemove={onRemove} />
        ))}
      </div>

      {/* INPUTS */}
      <GroupHeader label="Đầu vào" />
      <Row label="Giá vốn" valKey="costPrice" render={(s) => fmtVND(s.snapshot.costPrice)} />
      <Row label="Giá bán" valKey="sellPrice" render={(s) => fmtVND(s.snapshot.sellPrice)} />
      <Row label="Loại shop" valKey="shopType" render={(s) => SHOP_TYPE_LABEL[s.snapshot.shopType] || s.snapshot.shopType} />
      <Row label="Ngành hàng" valKey="category" render={(s) => categoryLabel(s.snapshot.category)} last />

      {/* COSTS */}
      <GroupHeader label="Chi phí" />
      <Row label="Tổng phí cố định" valKey="fixedTotal" render={(s) => fmtVND(s.fixedTotal)} />
      <Row label="Tổng phí biến đổi" valKey="varTotal" render={(s) => fmtVND(s.varTotal)} />
      <Row label="Tổng chi phí" valKey="feeTotal" render={(s) => fmtVND(s.feeTotal)} />
      <Row label="% Phí / Doanh thu" valKey="feePct" render={(s) =>
        fmtPct(s.revenue > 0 ? (s.feeTotal / s.revenue) * 100 : 0)
      } last />

      {/* RESULTS */}
      <GroupHeader label="Kết quả" />
      <Row label="Doanh thu" valKey="revenue" render={(s) => fmtVND(s.revenue)} />
      {/* Lợi nhuận — emphasized, no diff highlight */}
      <ResultRow data={data} labelW={labelW} cols={cols}
        label="Lợi nhuận" big
        render={(s) => (
          <span style={{ color: s.profit >= 0 ? '#16A34A' : '#DC2626' }}>
            {fmtVND(s.profit)}
          </span>
        )} />
      <ResultRow data={data} labelW={labelW} cols={cols}
        label="% Lợi nhuận" mid
        render={(s) => {
          const isPos = s.profit >= 0;
          return (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              color: isPos ? '#16A34A' : '#DC2626',
            }}>
              {fmtPct(s.profitPct, true)}
              <span style={{
                padding: '2px 8px', borderRadius: 999,
                background: isPos ? '#DCFCE7' : '#FEE2E2',
                color: isPos ? '#15803D' : '#B91C1C',
                fontSize: 11, fontWeight: 600,
              }}>{isPos ? 'Lãi' : 'Lỗ'}</span>
            </span>
          );
        }}
        last />

      {/* Apply buttons */}
      <div style={{
        display: 'grid', gridTemplateColumns: `${labelW}px repeat(${cols}, 1fr)`,
        borderTop: '1px solid #E5E7EB', background: '#FAFAF7', padding: '12px',
        gap: 8,
      }}>
        <div style={{ background: 'transparent' }}></div>
        {data.map(s => (
          <button key={s.id} onClick={() => onApply(s)}
            style={{
              width: '100%', height: 36, padding: '0 12px',
              background: '#fff', border: '1px solid #E5E7EB',
              borderRadius: 8, fontSize: 13, fontWeight: 500,
              color: '#1A1A1A', cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#F5B81C'; e.currentTarget.style.borderColor = '#F5B81C'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#E5E7EB'; }}
          >Áp dụng kịch bản này</button>
        ))}
      </div>
    </div>
  );
}

function ResultRow({ data, labelW, cols, label, render, big, mid, last }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: `${labelW}px repeat(${cols}, 1fr)`,
      borderBottom: last ? 'none' : '1px solid #F3F4F6',
    }}>
      <div style={{
        padding: '12px', fontSize: 13, color: '#1A1A1A',
        fontWeight: 600,
        background: '#fff', position: 'sticky', left: 0, zIndex: 1,
      }}>{label}</div>
      {data.map(s => (
        <div key={s.id} style={{
          padding: '12px', textAlign: 'right',
          fontSize: big ? 18 : (mid ? 16 : 13),
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.01em',
        }}>{render(s)}</div>
      ))}
    </div>
  );
}

function ScenarioColHeader({ s, isBest, onRename, onRemove }) {
  const [editing, setEditing] = useStateSC(false);
  const [name, setName] = useStateSC(s.name);
  useEffectSC(() => setName(s.name), [s.name]);
  const commit = () => {
    setEditing(false);
    if (name.trim() && name !== s.name) onRename(s.id, name.trim());
    else setName(s.name);
  };
  return (
    <div className="sc-col-anim" style={{
      padding: '10px 12px',
      borderLeft: isBest ? '2px solid #F5B81C' : 'none',
      background: isBest ? '#FFFBEB' : 'transparent',
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        {editing ? (
          <input autoFocus value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setName(s.name); setEditing(false); } }}
            style={{
              flex: 1, minWidth: 0, padding: '2px 4px', borderRadius: 5,
              border: '1px solid #E5E7EB', background: '#fff',
              fontSize: 13, fontWeight: 600, color: '#1A1A1A',
              outline: 'none', fontFamily: 'inherit',
            }} />
        ) : (
          <button onClick={() => setEditing(true)} style={{
            flex: 1, padding: 0, margin: 0,
            background: 'transparent', border: 'none',
            fontSize: 13, fontWeight: 600, color: '#1A1A1A',
            cursor: 'text', textAlign: 'left',
            fontFamily: 'inherit',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{s.name}</button>
        )}
        <button onClick={() => onRemove(s.id)}
          style={{
            width: 20, height: 20, padding: 0,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><ScX size={12} /></button>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 11, color: '#9CA3AF' }}>{fmtTime(s.ts)}</span>
        {isBest && (
          <span style={{
            padding: '2px 8px', borderRadius: 999,
            background: '#FEF3C7', color: '#92400E',
            fontSize: 11, fontWeight: 600, lineHeight: '14px',
          }}>Tốt nhất</span>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { ScenariosSection, ScenarioCompareModal, deriveFromSnapshot });
