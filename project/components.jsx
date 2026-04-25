// UI building blocks for Shopee Fee Calculator

const { useState: useStateC, useRef: useRefC, useEffect: useEffectC } = React;

// ────────────────────────────────────────────────────────────────
// Top Navigation
// ────────────────────────────────────────────────────────────────
function TopNav() {
  const [open, setOpen] = useStateC(false);
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 30, height: 60,
      background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid #EFEAE0',
    }}>
      <div style={{
        maxWidth: 1080, margin: '0 auto', height: '100%',
        padding: '0 24px',
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
            <Icon name="chevronDown" size={14} color="#6B6B66" />
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
  );
}

// ────────────────────────────────────────────────────────────────
// Hero + segmented mode switcher
// ────────────────────────────────────────────────────────────────
function Hero({ mode, setMode }) {
  return (
    <section style={{ padding: '48px 0 32px', textAlign: 'left' }}>
      <div style={{
        fontSize: 11, fontWeight: 600, letterSpacing: '0.14em',
        color: '#C99A0E', textTransform: 'uppercase', marginBottom: 14,
      }}>SHOPEE TOOLKIT · MÁY TÍNH PHÍ</div>
      <h1 style={{
        margin: 0, fontSize: 38, fontWeight: 600, letterSpacing: '-0.022em',
        lineHeight: 1.1, color: '#1A1A1A', maxWidth: 600,
      }}>Tính lợi nhuận sản phẩm <span style={{
        background: 'linear-gradient(120deg, #F5B81C 0%, #E89A0E 100%)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>Shopee</span></h1>
      <p style={{
        margin: '14px 0 28px', fontSize: 15, color: '#6B6B66',
        maxWidth: 540, lineHeight: 1.6,
      }}>Nhập giá vốn và giá bán — biết ngay lợi nhuận thực sau mọi khoản phí sàn,
      thanh toán, voucher và vận hành.</p>

      <ModeSwitcher mode={mode} setMode={setMode} />
    </section>
  );
}

function ModeSwitcher({ mode, setMode }) {
  const opts = [
    { id: 'forward', label: 'Tính từ giá bán' },
    { id: 'reverse', label: 'Tìm giá bán theo lợi nhuận' },
  ];
  return (
    <div style={{
      display: 'inline-flex', padding: 4, borderRadius: 999,
      background: '#F1ECDF', border: '1px solid #EFEAE0',
    }}>
      {opts.map(o => {
        const active = mode === o.id;
        return (
          <button key={o.id} onClick={() => setMode(o.id)} style={{
            padding: '9px 18px', fontSize: 13, fontWeight: 500,
            border: 0, cursor: 'pointer', borderRadius: 999,
            background: active ? '#1A1A1A' : 'transparent',
            color: active ? '#fff' : '#6B6B66',
            transition: 'all 0.18s ease',
            fontFamily: 'inherit',
          }}>
            <span style={{
              display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
              background: active ? '#F5B81C' : '#C9C5BA',
              marginRight: 8, verticalAlign: 'middle',
            }} />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Number input with currency suffix
// ────────────────────────────────────────────────────────────────
function MoneyInput({ label, value, onChange, hint, autoFocus }) {
  const [focused, setFocused] = useStateC(false);
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <label style={{
        display: 'block', fontSize: 12, fontWeight: 500,
        color: '#6B6B66', marginBottom: 8, letterSpacing: '0.01em',
      }}>{label}</label>
      <div style={{
        position: 'relative',
        border: `1.5px solid ${focused ? '#1A1A1A' : '#EFEAE0'}`,
        borderRadius: 10, background: '#FAFAF7',
        transition: 'border-color 0.15s',
        padding: '14px 16px',
      }}>
        <input
          type="text"
          value={fmtNum(value)}
          autoFocus={autoFocus}
          onChange={(e) => onChange(parseNum(e.target.value))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          inputMode="numeric"
          style={{
            width: '100%', border: 0, outline: 0, background: 'transparent',
            fontSize: 28, fontWeight: 600, color: '#1A1A1A',
            fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
            paddingRight: 28, fontFamily: 'inherit',
          }}
        />
        <span style={{
          position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
          fontSize: 18, fontWeight: 500, color: '#A8A89E',
          fontVariantNumeric: 'tabular-nums',
        }}>đ</span>
      </div>
      <div style={{ fontSize: 12, color: '#8A8A82', marginTop: 8, lineHeight: 1.5 }}>
        {hint}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Select (custom)
// ────────────────────────────────────────────────────────────────
function Select({ label, value, options, onChange, leftIcon }) {
  const [open, setOpen] = useStateC(false);
  const ref = useRefC();
  useEffectC(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const current = options.find(o => o.id === value) || options[0];
  return (
    <div style={{ flex: 1, minWidth: 0 }} ref={ref}>
      <label style={{
        display: 'block', fontSize: 12, fontWeight: 500,
        color: '#6B6B66', marginBottom: 8,
      }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <button onClick={() => setOpen(!open)} style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 8,
          padding: '11px 14px', borderRadius: 8,
          border: '1px solid #EFEAE0', background: '#FFFFFF',
          fontSize: 14, fontWeight: 500, color: '#1A1A1A',
          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            {leftIcon}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {current.label}
            </span>
          </span>
          <Icon name="chevronDown" size={14} color="#6B6B66" />
        </button>
        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            background: '#fff', border: '1px solid #EFEAE0', borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: 4, zIndex: 20,
            maxHeight: 280, overflow: 'auto',
          }}>
            {options.map(o => (
              <div key={o.id} onClick={() => { onChange(o.id); setOpen(false); }}
                style={{
                  padding: '9px 10px', borderRadius: 6, cursor: 'pointer',
                  fontSize: 14, color: '#1A1A1A',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: o.id === value ? '#FAF6E8' : 'transparent',
                }}
                onMouseEnter={(e) => { if (o.id !== value) e.currentTarget.style.background = '#F5F2EA'; }}
                onMouseLeave={(e) => { if (o.id !== value) e.currentTarget.style.background = 'transparent'; }}
              >
                <span>{o.label}</span>
                {o.id === value && <Icon name="check" size={14} color="#C99A0E" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Toggle switch
// ────────────────────────────────────────────────────────────────
function Toggle({ on, onChange, size = 'md' }) {
  const w = size === 'sm' ? 28 : 34;
  const h = size === 'sm' ? 16 : 20;
  const k = h - 4;
  return (
    <button onClick={() => onChange(!on)} style={{
      position: 'relative', width: w, height: h, borderRadius: 999,
      background: on ? '#1A1A1A' : '#D9D5C8', border: 0,
      cursor: 'pointer', padding: 0, transition: 'background 0.18s',
      flexShrink: 0,
    }}>
      <span style={{
        position: 'absolute', top: 2, left: on ? w - k - 2 : 2,
        width: k, height: k, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 2px rgba(0,0,0,0.18)', transition: 'left 0.18s',
      }} />
    </button>
  );
}

Object.assign(window, { TopNav, Hero, ModeSwitcher, MoneyInput, Select, Toggle });
