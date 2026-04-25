// Result hero card + gauge + alerts + scenarios modal + sticky bar

const { useState: useStateR, useMemo: useMemoR, useEffect: useEffectR, useRef: useRefR } = React;

// Icon helpers used in this file
const IconImage = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);
const IconColumns = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="9" y1="3" x2="9" y2="21" />
    <line x1="15" y1="3" x2="15" y2="21" />
  </svg>
);
const IconWarn = ({ color }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const IconCheckCircle = ({ color }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

// ────────────────────────────────────────────────────────────────
// Gauge segments (shared)
// ────────────────────────────────────────────────────────────────
const GAUGE_SEGMENTS = [
  { id: 0, label: 'Lỗ',        color: '#E24B4A', range: [-Infinity, 0] },
  { id: 1, label: 'Hòa vốn',   color: '#A8A89E', range: [0, 3] },
  { id: 2, label: 'Lãi mỏng',  color: '#F5B81C', range: [3, 10] },
  { id: 3, label: 'Lãi tốt',   color: '#3FB37D', range: [10, 20] },
  { id: 4, label: 'Rất tốt',   color: '#0A6B4E', range: [20, Infinity] },
];
const segmentForPct = (pct) => {
  for (let i = 0; i < GAUGE_SEGMENTS.length; i++) {
    const [lo, hi] = GAUGE_SEGMENTS[i].range;
    if (pct >= lo && pct < hi) return i;
  }
  return pct < 0 ? 0 : 4;
};

// ────────────────────────────────────────────────────────────────
// Auto alerts
// ────────────────────────────────────────────────────────────────
function computeAlerts({ revenue, profit, profitPct, fixedFees, varFees }) {
  const alerts = [];
  if (revenue <= 0) return alerts;

  // LOSS
  if (profit < 0) {
    const totalCost = revenue - profit; // = costPrice + fees
    const needRevenue = totalCost; // breakeven
    const pctIncrease = ((needRevenue - revenue) / revenue) * 100;
    alerts.push({
      tone: 'danger',
      msg: `Bạn đang lỗ — cần tăng giá bán thêm tối thiểu ${pctIncrease.toFixed(1).replace('.', ',')}% hoặc cắt giảm tổng phí xuống còn ${fmtVND(needRevenue)}`,
    });
  }

  // HIGH FEE (>12% revenue from a single fee)
  const allFees = [...fixedFees, ...varFees];
  for (const f of allFees) {
    if (!f.on) continue;
    const amt = computeFee(f, revenue);
    const pct = (amt / revenue) * 100;
    if (pct >= 12) {
      alerts.push({
        tone: 'warn',
        msg: `${f.name} đang chiếm ${pct.toFixed(1).replace('.', ',')}% doanh thu — cao bất thường, cân nhắc tắt để tăng lợi nhuận thêm ${fmtVND(amt)}/đơn`,
      });
    }
  }

  // GOOD (profit >= 15%)
  if (profitPct >= 15) {
    const headroom = Math.max(1, Math.floor((profitPct - 10) / 1.5));
    alerts.push({
      tone: 'good',
      msg: `Lợi nhuận tốt! Có thể tăng ngân sách quảng cáo thêm ~${headroom}% để scale đơn mà vẫn có lãi`,
    });
  }

  return alerts;
}

function AlertBadge({ tone, msg }) {
  const styles = {
    danger: { bg: '#FEF2F2', border: '#FCA5A5', icon: '#DC2626', text: '#991B1B' },
    warn:   { bg: '#FFFBEB', border: '#FCD34D', icon: '#D97706', text: '#92400E' },
    good:   { bg: '#F0FDF4', border: '#86EFAC', icon: '#16A34A', text: '#166534' },
  }[tone];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px', borderRadius: 8,
      background: styles.bg, border: `1px solid ${styles.border}`,
      fontSize: 13, color: styles.text, lineHeight: 1.45,
      minHeight: 40,
    }}>
      {tone === 'good' ? <IconCheckCircle color={styles.icon} /> : <IconWarn color={styles.icon} />}
      <span style={{ fontWeight: 500 }}>{msg}</span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Result Card
// ────────────────────────────────────────────────────────────────
function ResultCard({ revenue, costPrice, feeTotal, profit, profitPct,
  fixedFees, varFees, onSave }) {
  const [hover, setHover] = useStateR(false);
  const [saved, setSaved] = useStateR(false);
  const isProfit = profit >= 0;
  const profitColor = isProfit ? '#1D9E75' : '#E24B4A';

  const handleSave = () => {
    setSaved(true); onSave && onSave();
    setTimeout(() => setSaved(false), 1800);
  };

  const alerts = computeAlerts({ revenue, profit, profitPct, fixedFees, varFees });

  return (
    <div
      data-result-card
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        background: 'linear-gradient(135deg, #FFFBF0 0%, #FFFFFF 60%)',
        border: '1px solid #F5E5B8',
        borderRadius: 16, padding: 32,
        boxShadow: hover
          ? '0 2px 4px rgba(245,184,28,0.06), 0 16px 40px rgba(245,184,28,0.10)'
          : '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04)',
        transform: hover ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute', right: -80, top: -80, width: 240, height: 240,
        borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(245,184,28,0.10) 0%, transparent 70%)',
      }} />

      {/* Top row: live label */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, position: 'relative', gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            position: 'relative', width: 8, height: 8, borderRadius: '50%',
            background: '#1D9E75', display: 'inline-block',
          }}>
            <span style={{
              position: 'absolute', inset: -4, borderRadius: '50%',
              background: '#1D9E75', opacity: 0.3,
              animation: 'pulse 2s ease-in-out infinite',
            }} />
          </span>
          <span style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.14em',
            color: '#6B6B66', textTransform: 'uppercase',
          }}>Kết quả · cập nhật trực tiếp</span>
        </div>
      </div>

      {/* Big number */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap', position: 'relative' }}>
        <div>
          <div style={{ fontSize: 13, color: '#6B6B66', marginBottom: 6, fontWeight: 500 }}>Lợi nhuận</div>
          <div style={{
            fontSize: 52, fontWeight: 600, color: profitColor,
            letterSpacing: '-0.025em', lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            display: 'flex', alignItems: 'baseline', gap: 2,
          }}>
            {isProfit ? '' : '-'}
            <span>{fmtNum(Math.abs(profit))}</span>
            <span style={{ fontSize: 28, fontWeight: 500, marginLeft: 2 }}>đ</span>
          </div>
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '6px 12px', borderRadius: 999,
          background: isProfit ? '#E1F5EE' : '#FCE5E4',
          color: isProfit ? '#0F6E56' : '#A82928',
          fontSize: 13, fontWeight: 600,
          fontVariantNumeric: 'tabular-nums', marginBottom: 6,
        }}>
          <Icon name={isProfit ? 'arrowUp' : 'arrowDown'} size={13} />
          {fmtPct(profitPct, true)}
        </div>
      </div>

      <ProfitGauge pct={profitPct} />

      {/* Four metrics */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(0,0,0,0.06)',
        gap: 0,
      }}>
        <Metric label="Doanh thu" value={fmtVND(revenue)} />
        <Metric label="Giá vốn" value={fmtVND(costPrice)} divider />
        <Metric label="Tổng chi phí" value={fmtVND(feeTotal)} divider />
        <Metric label="% Phí / Doanh thu" value={fmtPct(revenue > 0 ? feeTotal / revenue * 100 : 0)} divider />
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{
          marginTop: 20, paddingTop: 20,
          borderTop: '1px solid rgba(0,0,0,0.06)',
          display: 'flex', flexDirection: 'column', gap: 8,
          position: 'relative',
        }}>
          {alerts.map((a, i) => <AlertBadge key={i} tone={a.tone} msg={a.msg} />)}
        </div>
      )}

      {/* Actions: 4 equal-width buttons */}
      <div className="result-actions" style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 10, marginTop: 24, position: 'relative',
      }}>
        <button onClick={handleSave} style={{
          padding: '12px 14px', borderRadius: 10,
          background: saved ? '#1D9E75' : '#F5B81C',
          color: saved ? '#fff' : '#1A1A1A',
          border: 0, fontSize: 13, fontWeight: 600,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 6, transition: 'all 0.2s', fontFamily: 'inherit',
          boxShadow: saved ? 'none' : '0 1px 0 rgba(255,255,255,0.4) inset, 0 2px 6px rgba(245,184,28,0.30)',
        }}
        onMouseEnter={(e) => { if (!saved) e.currentTarget.style.background = '#FFC83A'; }}
        onMouseLeave={(e) => { if (!saved) e.currentTarget.style.background = '#F5B81C'; }}
        >
          <Icon name={saved ? 'check' : 'bookmark'} size={14} />
          {saved ? 'Đã lưu' : 'Lưu kết quả'}
        </button>
        <button style={resBtnSec}><IconImage /> Tải ảnh</button>
        <button style={resBtnSec}><Icon name="download" size={14} /> Xuất PDF</button>
        <button style={resBtnSec}><Icon name="share" size={14} /> Chia sẻ</button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(2.2); opacity: 0; }
        }
        @media (max-width: 480px) {
          .result-actions { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}

const resBtnSec = {
  padding: '12px 12px', borderRadius: 10,
  background: '#FFFFFF', color: '#1A1A1A',
  border: '1px solid #E2DDD0', fontSize: 13, fontWeight: 500,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  gap: 6, fontFamily: 'inherit',
};
const btnSecondary = resBtnSec;

function Metric({ label, value, divider }) {
  return (
    <div style={{
      padding: '0 16px',
      borderLeft: divider ? '1px solid rgba(0,0,0,0.06)' : 'none',
    }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: '#8A8A82',
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: '#1A1A1A',
        fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>{value}</div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Profit gauge — fixed thresholds + correct highlight
// ────────────────────────────────────────────────────────────────
function ProfitGauge({ pct }) {
  const segments = GAUGE_SEGMENTS;
  const ai = segmentForPct(pct);

  // Visible domain & segment widths (these MUST stay in sync with the bar layout)
  // Visual ranges per segment in the bar:
  //   Lỗ: [-10, 0] → 10pp
  //   Hòa vốn: [0, 3] → 3pp
  //   Lãi mỏng: [3, 10] → 7pp
  //   Lãi tốt: [10, 20] → 10pp
  //   Rất tốt: [20, 30] → 10pp
  // Total = 40pp. We weight flex by these spans so each %-point has the same
  // pixel width across the whole bar — meaning the pointer maps linearly via
  // the same -10..30 range and always lands inside the highlighted segment.
  const flex = [10, 3, 7, 10, 10];

  const lo = -10, hi = 30;
  const clamped = Math.max(lo, Math.min(hi, pct));
  const pointer = ((clamped - lo) / (hi - lo)) * 100;

  return (
    <div style={{ marginTop: 24, position: 'relative' }}>
      <div style={{
        display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden',
        gap: 2, background: 'rgba(0,0,0,0.03)', padding: 2,
      }}>
        {segments.map((s, i) => {
          const active = i === ai;
          return (
            <div key={s.id} style={{
              flex: flex[i],
              background: s.color,
              opacity: active ? 1 : 0.22,
              borderRadius: 999,
              transition: 'opacity 0.25s, box-shadow 0.25s',
              boxShadow: active ? `0 0 0 2px ${s.color}33, 0 2px 8px ${s.color}66` : 'none',
              transform: active ? 'scaleY(1.15)' : 'scaleY(1)',
              transformOrigin: 'center',
            }} />
          );
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
        {segments.map((s, i) => (
          <div key={s.id} style={{
            flex: flex[i], textAlign: 'center',
            color: i === ai ? '#1A1A1A' : '#A8A89E',
            fontWeight: i === ai ? 600 : 500,
            transition: 'color 0.2s',
          }}>{s.label}</div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Sticky bar — visible when ResultCard scrolls out of view
// ────────────────────────────────────────────────────────────────
function StickyBar({ profit, profitPct, onSave }) {
  const [show, setShow] = useStateR(false);
  useEffectR(() => {
    const card = document.querySelector('[data-result-card]');
    if (!card) return;
    const io = new IntersectionObserver(([entry]) => {
      setShow(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    }, { threshold: 0 });
    io.observe(card);
    return () => io.disconnect();
  }, []);
  const isProfit = profit >= 0;
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
        <Icon name="bookmark" size={13} /> Lưu kết quả
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Compare scenarios modal
// ────────────────────────────────────────────────────────────────
function CompareModal({ open, onClose, scenarios, setScenarios, current, onApply }) {
  if (!open) return null;

  const profits = scenarios.map(s => s.profit);
  const maxP = profits.length ? Math.max(...profits) : null;
  const minP = profits.length > 1 ? Math.min(...profits) : null;

  const renameScenario = (id, name) => {
    setScenarios(scenarios.map(s => s.id === id ? { ...s, name } : s));
  };
  const removeScenario = (id) => {
    setScenarios(scenarios.filter(s => s.id !== id));
  };
  const addCurrent = () => {
    if (scenarios.length >= 3) return;
    const id = 'sc_' + Date.now();
    setScenarios([...scenarios, {
      id, name: `Kịch bản ${scenarios.length + 1}`,
      ...current,
    }]);
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(20,18,12,0.55)',
      backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: 680, maxHeight: '80vh',
        background: '#fff', borderRadius: 16, padding: 32,
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        display: 'flex', flexDirection: 'column', gap: 20, overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: '-0.015em' }}>
              So sánh kịch bản
            </h2>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6B6B66' }}>
              Lưu tối đa 3 kịch bản để so sánh lợi nhuận side-by-side
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, padding: 0,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#6B6B66', fontSize: 18, lineHeight: 1,
          }}>×</button>
        </div>

        <div style={{ overflow: 'auto', flex: 1, margin: '0 -8px', padding: '0 8px' }}>
          {scenarios.length === 0 ? (
            <div style={{
              padding: '40px 20px', textAlign: 'center',
              border: '1px dashed #E2DDD0', borderRadius: 12,
              color: '#8A8A82', fontSize: 13,
            }}>
              Chưa có kịch bản nào. Bấm "Lưu kịch bản hiện tại" bên dưới để thêm.
            </div>
          ) : (
            <CompareTable
              scenarios={scenarios} maxP={maxP} minP={minP}
              onRename={renameScenario} onRemove={removeScenario} onApply={onApply}
            />
          )}
        </div>

        <div>
          <button onClick={addCurrent}
            disabled={scenarios.length >= 3}
            style={{
              width: '100%', padding: '13px 16px', borderRadius: 10,
              background: scenarios.length >= 3 ? '#E2DDD0' : '#F5B81C',
              color: scenarios.length >= 3 ? '#8A8A82' : '#1A1A1A',
              border: 0, fontSize: 14, fontWeight: 600,
              cursor: scenarios.length >= 3 ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              boxShadow: scenarios.length >= 3 ? 'none' : '0 1px 0 rgba(255,255,255,0.4) inset, 0 2px 6px rgba(245,184,28,0.30)',
            }}>
            {scenarios.length >= 3 ? 'Đã đạt tối đa 3 kịch bản' : 'Lưu kịch bản hiện tại'}
          </button>
          <div style={{ fontSize: 12, color: '#8A8A82', textAlign: 'center', marginTop: 8 }}>
            Chỉnh thông số ở trang chính rồi quay lại đây để lưu kịch bản tiếp theo
          </div>
        </div>
      </div>
    </div>
  );
}

function CompareTable({ scenarios, maxP, minP, onRename, onRemove, onApply }) {
  const cols = scenarios.length;
  const labelColW = 160;
  const Row = ({ label, render, emphasis }) => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `${labelColW}px repeat(${cols}, 1fr)`,
      gap: 8, padding: '10px 12px',
      borderTop: '1px solid #F5F2EA',
      alignItems: 'center',
    }}>
      <div style={{
        fontSize: emphasis ? 13 : 12,
        fontWeight: emphasis ? 600 : 500,
        color: emphasis ? '#1A1A1A' : '#6B6B66',
      }}>{label}</div>
      {scenarios.map((s, i) => (
        <div key={s.id} style={{
          fontSize: emphasis ? 15 : 13,
          fontWeight: emphasis ? 700 : 500,
          color: '#1A1A1A',
          fontVariantNumeric: 'tabular-nums', textAlign: 'right',
          paddingRight: 8,
        }}>
          {render(s, i)}
        </div>
      ))}
    </div>
  );

  const colorFor = (p) => {
    if (cols < 2) return '#1A1A1A';
    if (p === maxP) return '#1D9E75';
    if (p === minP) return '#DC2626';
    return '#1A1A1A';
  };

  return (
    <div style={{
      border: '1px solid #EFEAE0', borderRadius: 12, overflow: 'hidden',
    }}>
      {/* Header row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `${labelColW}px repeat(${cols}, 1fr)`,
        gap: 8, padding: '12px',
        background: '#FAFAF7',
      }}>
        <div></div>
        {scenarios.map(s => (
          <div key={s.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 4,
          }}>
            <input value={s.name}
              onChange={(e) => onRename(s.id, e.target.value)}
              style={{
                width: '100%', padding: '4px 6px', borderRadius: 5,
                border: '1px solid transparent', background: 'transparent',
                fontSize: 13, fontWeight: 600, color: '#1A1A1A',
                outline: 'none', fontFamily: 'inherit',
                minWidth: 0,
              }}
              onFocus={(e) => { e.target.style.background = '#fff'; e.target.style.borderColor = '#E2DDD0'; }}
              onBlur={(e) => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'transparent'; }}
            />
            <button onClick={() => onRemove(s.id)} title="Xóa kịch bản" style={{
              width: 22, height: 22, borderRadius: 5, padding: 0,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: '#A8A89E', fontSize: 16, lineHeight: 1, flexShrink: 0,
            }}>×</button>
          </div>
        ))}
      </div>

      <Row label="Giá bán" render={(s) => fmtVND(s.revenue)} />
      <Row label="Giá vốn" render={(s) => fmtVND(s.costPrice)} />
      <Row label="Tổng chi phí" render={(s) => fmtVND(s.feeTotal)} />
      <Row label="Lợi nhuận" emphasis render={(s) => (
        <span style={{ color: colorFor(s.profit) }}>{fmtVND(s.profit)}</span>
      )} />
      <Row label="% Lợi nhuận" emphasis render={(s) => (
        <span style={{ color: colorFor(s.profit) }}>{fmtPct(s.profitPct, true)}</span>
      )} />
      <Row label="% Phí / Doanh thu" render={(s) =>
        fmtPct(s.revenue > 0 ? (s.feeTotal / s.revenue) * 100 : 0)
      } />

      {/* Apply row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `${labelColW}px repeat(${cols}, 1fr)`,
        gap: 8, padding: '12px',
        background: '#FAFAF7',
        borderTop: '1px solid #F5F2EA',
      }}>
        <div></div>
        {scenarios.map(s => (
          <button key={s.id} onClick={() => onApply(s)} style={{
            padding: '8px 10px', borderRadius: 7,
            background: '#fff', border: '1px solid #E2DDD0',
            color: '#1A1A1A', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>Áp dụng</button>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Section header (kept for compatibility)
// ────────────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle, right }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      gap: 16, flexWrap: 'wrap',
    }}>
      <div>
        <h2 style={{
          margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: '-0.015em',
          color: '#1A1A1A',
        }}>{title}</h2>
        {subtitle && <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6B6B66' }}>{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

Object.assign(window, { ResultCard, ProfitGauge, StickyBar, CompareModal,
  SectionHeader, Metric, btnSecondary, GAUGE_SEGMENTS, segmentForPct, AlertBadge });
