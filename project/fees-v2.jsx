// Fee panels v2 — editable rates, add custom fees, delete custom fees

const { useState: useStateFP, useRef: useRefFP, useEffect: useEffectFP } = React;

const FEE_EXPLAIN = {
  fixed: 'Mặc định cho tất cả đơn hàng',
  payment: 'Mặc định cho tất cả đơn hàng',
  freeship: 'Tối đa 50.000đ — áp dụng cho Shop Mall',
  content: 'Shop thường không giới hạn, Shop Mall tối đa 50k',
  voucher_x: 'Tối đa 50.000đ giá trị đơn hàng',
  pi_ship: 'Phí tính trên tất cả đơn hàng đã bàn giao đơn vị vận chuyển',
  infra: 'Phí tính trên tất cả đơn hàng thành công',
  tax: 'Nếu là công ty thì tự khai và điền mức thuế khác',
  ads: 'Quảng cáo trên Shopee, thường nằm 5–10% so với tổng doanh số',
  voucher_shop: 'Voucher Shopee tài trợ — % so với doanh số shop',
  ops: 'Mặt bằng, nhân viên, điện nước, nguyên vật liệu đóng gói…',
  aff: 'Chi phí chương trình Tiếp Thị Liên Kết',
  other: 'Các chi phí khác dự kiến — % theo doanh số',
};

function FeePanelV2({ title, fees, setFees, revenue, color, accentBg }) {
  const subtotal = fees.reduce((s, f) => s + computeFee(f, revenue), 0);
  const subPctRev = revenue > 0 ? (subtotal / revenue) * 100 : 0;
  const [adding, setAdding] = useStateFP(false);

  const toggle = (id) => setFees(fees.map(f => f.id === id ? { ...f, on: !f.on } : f));
  const updateRate = (id, rate) => setFees(fees.map(f => f.id === id ? { ...f, rate } : f));
  const updateName = (id, name) => setFees(fees.map(f => f.id === id ? { ...f, name } : f));
  const updateKind = (id, kind) => setFees(fees.map(f => {
    if (f.id !== id) return f;
    // Convert sensibly when switching kind
    if (kind === f.kind) return f;
    return { ...f, kind, rate: kind === 'pct' ? 0.05 : 5000 };
  }));
  const removeFee = (id) => setFees(fees.filter(f => f.id !== id));
  const addFee = (kind) => {
    const id = 'custom_' + Date.now();
    const newFee = {
      id, name: 'Khoản phí mới',
      kind, rate: kind === 'pct' ? 0.03 : 3000,
      on: true, hint: 'Tùy chỉnh', custom: true,
    };
    setFees([...fees, newFee]);
    setAdding(false);
  };

  return (
    <div style={{
      background: '#fff', border: '1px solid #EFEAE0', borderRadius: 14,
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
    }}>
      {/* Header bar */}
      <div style={{
        background: accentBg, padding: '14px 20px',
        borderBottom: `1px solid ${color}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
          <h3 style={{
            margin: 0, fontSize: 14, fontWeight: 600,
            color: '#1A1A1A', letterSpacing: '-0.01em',
          }}>{title}</h3>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 600, color: '#6B6B66',
          letterSpacing: '0.04em',
        }}>{fees.filter(f => f.on).length}/{fees.length} ÁP DỤNG</span>
      </div>

      {/* Header row */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1.2fr 0.85fr 1.55fr auto',
        gap: 12, padding: '8px 20px',
        fontSize: 10, fontWeight: 600, color: '#A8A89E',
        letterSpacing: '0.06em', textTransform: 'uppercase',
        borderBottom: '1px solid #F5F2EA',
      }}>
        <div>Khoản phí</div>
        <div>Tỷ lệ</div>
        <div style={{ textAlign: 'right', paddingRight: 10 }}>Số tiền · Ghi chú</div>
        <div style={{ width: 30 }}></div>
      </div>

      {/* Rows */}
      <div>
        {fees.map((f, i) => {
          const amt = computeFee(f, revenue);
          const dim = !f.on;
          return (
            <FeeRow key={f.id} fee={f} dim={dim} amt={amt} isLast={i === fees.length - 1}
              onToggle={() => toggle(f.id)}
              onRate={(v) => updateRate(f.id, v)}
              onKind={(k) => updateKind(f.id, k)}
              onName={(n) => updateName(f.id, n)}
              onRemove={() => removeFee(f.id)}
              accent={color} />
          );
        })}
      </div>

      {/* Add row */}
      <div style={{ padding: '10px 20px 14px', background: '#FAFAF7',
        borderTop: '1px dashed #E2DDD0' }}>
        {!adding ? (
          <button onClick={() => setAdding(true)} style={{
            width: '100%', padding: '10px 14px', borderRadius: 8,
            background: '#fff', border: `1px dashed ${color}`,
            color: color === '#F5B81C' ? '#A47408' : color,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = accentBg; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
          >
            <Plus /> Thêm khoản phí
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => addFee('pct')} style={addBtn(color, accentBg)}>
              <Plus /> % theo doanh thu
            </button>
            <button onClick={() => addFee('flat')} style={addBtn(color, accentBg)}>
              <Plus /> Số tiền cố định / đơn
            </button>
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
        background: color === '#F5B81C' ? '#FAF1D6' : '#DCEAF8',
        borderTop: `1.5px solid ${color}`,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700,
            color: color === '#F5B81C' ? '#7A5408' : '#1F4E80',
            letterSpacing: '0.02em', textTransform: 'uppercase',
          }}>Tổng cộng</div>
          <div style={{ fontSize: 11,
            color: color === '#F5B81C' ? '#A47408' : '#3B6EA6',
            marginTop: 2, fontWeight: 500,
            fontVariantNumeric: 'tabular-nums' }}>
            {fmtPct(subPctRev)} so với doanh thu
          </div>
        </div>
        <div style={{
          fontSize: 22, fontWeight: 700,
          color: color === '#F5B81C' ? '#7A5408' : '#1F4E80',
          fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
        }}>{fmtVND(subtotal)}</div>
      </div>
    </div>
  );
}

const addBtn = (color, bg) => ({
  flex: 1, padding: '10px 12px', borderRadius: 8,
  background: bg, border: `1px solid ${color}66`,
  color: color === '#F5B81C' ? '#A47408' : color,
  fontSize: 12, fontWeight: 600, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  gap: 6, fontFamily: 'inherit',
});

function Plus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function Trash() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" /><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

// ────────────────────────────────────────────────────────────────
// Fee row — editable name (custom only) + editable rate
// ────────────────────────────────────────────────────────────────
function FeeRow({ fee, dim, amt, isLast, onToggle, onRate, onKind, onName, onRemove, accent }) {
  const [hover, setHover] = useStateFP(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid', gridTemplateColumns: '1.2fr 0.85fr 1.55fr auto',
        gap: 12, padding: '14px 20px',
        alignItems: 'center',
        borderBottom: isLast ? 'none' : '1px solid #F5F2EA',
        background: dim ? '#FAFAF7' : '#fff',
        transition: 'background 0.15s',
      }}
    >
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
            opacity: 0.7, flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#FCE5E4'; e.currentTarget.style.opacity = 1; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.opacity = 0.7; }}
          >
            <Trash />
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
        }}>
          {dim ? '0đ' : fmtVND(amt)}
        </div>
        <div style={{
          fontSize: 11, color: '#8A8A82', marginTop: 2,
          lineHeight: 1.4, fontWeight: 400,
        }}>{FEE_EXPLAIN[fee.id] || fee.hint}</div>
      </div>

      <Toggle on={fee.on} onChange={onToggle} size="sm" />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Editable text — name field (for custom fees)
// ────────────────────────────────────────────────────────────────
function EditableText({ value, onChange }) {
  const [editing, setEditing] = useStateFP(false);
  const [tmp, setTmp] = useStateFP(value);
  const inputRef = useRefFP();
  useEffectFP(() => { if (editing && inputRef.current) inputRef.current.select(); }, [editing]);
  const commit = () => {
    onChange((tmp || '').trim() || 'Khoản phí mới');
    setEditing(false);
  };
  if (editing) {
    return (
      <input ref={inputRef} type="text" value={tmp}
        onChange={(e) => setTmp(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setTmp(value); setEditing(false); } }}
        style={{
          width: '100%', padding: '4px 6px', borderRadius: 5,
          border: '1.5px solid #1A1A1A', background: '#fff',
          fontSize: 13, fontWeight: 500, color: '#1A1A1A',
          outline: 'none', fontFamily: 'inherit',
        }} />
    );
  }
  return (
    <span onClick={() => { setTmp(value); setEditing(true); }} style={{
      cursor: 'text',
      borderBottom: '1px dashed #C9C5BA',
      paddingBottom: 1,
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    }} title="Nhấn để sửa tên">
      {value}
    </span>
  );
}

// ────────────────────────────────────────────────────────────────
// Editable rate chip — click to edit %, supports kind switch via dropdown menu
// ────────────────────────────────────────────────────────────────
function EditableRate({ fee, onRate, onKind, dim, accent }) {
  const [editing, setEditing] = useStateFP(false);
  const [tmp, setTmp] = useStateFP('');
  const [menuOpen, setMenuOpen] = useStateFP(false);
  const inputRef = useRefFP();
  const wrapRef = useRefFP();

  useEffectFP(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);
  useEffectFP(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setMenuOpen(false); };
    if (menuOpen) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [menuOpen]);

  const startEdit = () => {
    const v = fee.kind === 'pct'
      ? (+(fee.rate * 100).toFixed(2)).toString().replace('.', ',')
      : fee.rate.toString();
    setTmp(v);
    setEditing(true);
  };
  const commit = () => {
    const cleaned = tmp.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
    const n = parseFloat(cleaned);
    if (!isNaN(n) && n >= 0) {
      if (fee.kind === 'pct') {
        const capped = Math.min(100, n);
        onRate(capped / 100);
      } else {
        onRate(Math.round(n));
      }
    }
    setEditing(false);
  };

  const baseChip = {
    display: 'inline-flex', alignItems: 'center',
    padding: '4px 9px', borderRadius: 6,
    fontSize: 12, fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
    cursor: 'pointer', userSelect: 'none',
    background: '#F5F2EA', color: dim ? '#A8A89E' : '#1A1A1A',
    border: '1px solid transparent',
    transition: 'all 0.12s',
  };

  if (editing) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <input ref={inputRef} type="text" value={tmp}
          onChange={(e) => setTmp(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') setEditing(false);
          }}
          inputMode="decimal"
          style={{
            width: 60, padding: '3px 6px', borderRadius: 5,
            border: `1.5px solid ${accent}`, background: '#fff',
            fontSize: 12, fontWeight: 600, color: '#1A1A1A',
            outline: 'none', fontFamily: 'inherit',
            fontVariantNumeric: 'tabular-nums', textAlign: 'right',
          }} />
        <span style={{ fontSize: 11, color: '#6B6B66', fontWeight: 600 }}>
          {fee.kind === 'pct' ? '%' : 'đ'}
        </span>
      </div>
    );
  }

  return (
    <div ref={wrapRef} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, position: 'relative' }}>
      <span onClick={startEdit}
        title="Nhấn để sửa"
        style={baseChip}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#FAF6E8'; e.currentTarget.style.borderColor = `${accent}66`; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = '#F5F2EA'; e.currentTarget.style.borderColor = 'transparent'; }}
      >
        {fee.kind === 'pct' ? (
          <>
            {(() => {
              const p = +(fee.rate * 100).toFixed(2);
              return (p % 1 === 0 ? p.toFixed(0) : p.toString()).replace('.', ',');
            })()}%
          </>
        ) : (
          <>{fmtNum(fee.rate)}đ</>
        )}
      </span>
      {fee.custom && (
        <button onClick={() => setMenuOpen(!menuOpen)}
          title="Đổi loại"
          style={{
            width: 18, height: 18, padding: 0, borderRadius: 4,
            background: 'transparent', border: 'none',
            color: '#A8A89E', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <Icon name="chevronDown" size={12} />
        </button>
      )}
      {menuOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4,
          background: '#fff', border: '1px solid #EFEAE0', borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: 4, zIndex: 20,
          fontSize: 12, minWidth: 160,
        }}>
          {[
            { id: 'pct', label: '% theo doanh thu' },
            { id: 'flat', label: 'Số tiền cố định / đơn' },
          ].map(o => (
            <div key={o.id}
              onClick={() => { onKind(o.id); setMenuOpen(false); }}
              style={{
                padding: '7px 10px', borderRadius: 5, cursor: 'pointer',
                color: '#1A1A1A',
                background: o.id === fee.kind ? '#FAF6E8' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
              {o.label}
              {o.id === fee.kind && <Icon name="check" size={12} color="#A47408" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Calculation flow — middle "intermediate calculations" panel
// ────────────────────────────────────────────────────────────────
function CalcFlow({ revenue, costPrice, fixedTotal, varTotal, profit }) {
  const profitColor = profit >= 0 ? '#1D9E75' : '#E24B4A';
  const grossMargin = revenue - costPrice;

  const Row = ({ label, value, color, weight = 500, op, divider, accent }) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '10px 0',
      borderTop: divider ? '1px solid #EFEAE0' : 'none',
    }}>
      <span style={{ fontSize: 13, color: '#1A1A1A', fontWeight: weight,
        display: 'flex', alignItems: 'center', gap: 8 }}>
        {op && <span style={{
          width: 18, height: 18, borderRadius: 4,
          background: op === '−' ? '#FCE5E4' : op === '=' ? '#FAF6E8' : '#F5F2EA',
          color: op === '−' ? '#A82928' : op === '=' ? '#A47408' : '#6B6B66',
          fontSize: 11, fontWeight: 700,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>{op}</span>}
        {label}
      </span>
      <span style={{
        fontSize: accent ? 18 : 14, fontWeight: weight,
        color: color || '#1A1A1A',
        fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
      }}>{value}</span>
    </div>
  );

  return (
    <div style={{
      background: 'linear-gradient(180deg, #FFFBF0 0%, #FFFFFF 100%)',
      border: '1px solid #F5E5B8', borderRadius: 14,
      padding: '8px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      alignSelf: 'start', position: 'sticky', top: 76,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
        color: '#A47408', textTransform: 'uppercase',
        padding: '12px 0 4px', display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#F5B81C' }} />
        Dòng tính lợi nhuận
      </div>
      <Row label="Doanh thu" value={fmtVND(revenue)} weight={600} />
      <Row label="Giá vốn sản phẩm" value={fmtVND(costPrice)} op="−" divider />
      <Row label="Lãi gộp" value={fmtVND(grossMargin)}
        color={grossMargin >= 0 ? '#1D9E75' : '#E24B4A'}
        weight={600} op="=" divider accent />
      <Row label="Tổng phí cố định" value={fmtVND(fixedTotal)} op="−" divider />
      <Row label="Tổng phí biến đổi" value={fmtVND(varTotal)} op="−" />
      <Row label="Lợi nhuận ròng" value={fmtVND(profit)}
        color={profitColor} weight={700} op="=" divider accent />
    </div>
  );
}

Object.assign(window, { FeePanelV2, CalcFlow, FeeRow, EditableText, EditableRate });
