// Charts v2 — dual donut (revenue composition + cost composition)

const { useMemo: useMemoCV } = React;

function DonutV2({ items, centerLabel, centerValue, size = 180, stroke = 26 }) {
  const total = Math.max(1, items.reduce((s, x) => s + x.value, 0));
  const r = (size - stroke) / 2 - 2;
  const circ = 2 * Math.PI * r;
  let acc = 0;
  const arcs = items.map(it => {
    const frac = it.value / total;
    const dash = circ * frac;
    const offset = -circ * acc;
    acc += frac;
    return { ...it, dash, offset, frac };
  });
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke="#F5F2EA" strokeWidth={stroke} />
        {arcs.map((a, i) => (
          <circle key={i} cx={size/2} cy={size/2} r={r} fill="none"
            stroke={a.color} strokeWidth={stroke}
            strokeDasharray={`${a.dash} ${circ - a.dash}`}
            strokeDashoffset={a.offset}
            strokeLinecap="butt"
            style={{ transition: 'stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease' }}
          />
        ))}
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: 12,
      }}>
        <div style={{ fontSize: 10, color: '#8A8A82', fontWeight: 600,
          letterSpacing: '0.08em', textTransform: 'uppercase' }}>{centerLabel}</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#1A1A1A',
          letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', marginTop: 3 }}>
          {centerValue}
        </div>
      </div>
    </div>
  );
}

function Legend({ items, total }) {
  return (
    <div style={{ flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((it, i) => {
        const pct = total > 0 ? (it.value / total) * 100 : 0;
        return (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: 'auto 1fr auto auto',
            gap: 8, alignItems: 'center', padding: '4px 0',
          }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: it.color }} />
            <span style={{
              fontSize: 12, color: '#1A1A1A', fontWeight: 500,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{it.name}</span>
            <span style={{ fontSize: 11, color: '#8A8A82',
              fontVariantNumeric: 'tabular-nums' }}>{fmtVND(it.value)}</span>
            <span style={{ fontSize: 11, color: '#1A1A1A', fontWeight: 600,
              fontVariantNumeric: 'tabular-nums', minWidth: 40, textAlign: 'right' }}>
              {pct.toFixed(1).replace('.', ',')}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DualDonuts({ revenue, costPrice, fixedFees, varFees, profit }) {
  const fixedTotal = fixedFees.reduce((s, f) => s + computeFee(f, revenue), 0);
  const varTotal = varFees.reduce((s, f) => s + computeFee(f, revenue), 0);

  // Revenue composition (4 buckets)
  const revItems = [
    { name: 'Giá vốn', value: costPrice, color: '#F5B81C' },
    { name: 'Phí cố định', value: fixedTotal, color: '#3B82C4' },
    { name: 'Phí biến đổi', value: varTotal, color: '#E89A8A' },
    { name: 'Lợi nhuận', value: Math.max(0, profit), color: '#1D9E75' },
  ];
  const revTotal = revItems.reduce((s, x) => s + x.value, 0);

  // Cost composition (every individual fee)
  const palette = [
    '#F5B81C', '#3B82C4', '#E89A8A', '#1D9E75', '#8B5CF6',
    '#F472B6', '#06B6D4', '#FACC15', '#EC4899', '#10B981',
    '#F97316', '#6366F1', '#84CC16',
  ];
  const allFees = [...fixedFees, ...varFees]
    .map(f => ({ ...f, amount: computeFee(f, revenue) }))
    .filter(f => f.amount > 0);
  const costItems = allFees.map((f, i) => ({
    name: f.name, value: f.amount, color: palette[i % palette.length],
  }));
  const costTotalSum = costItems.reduce((s, x) => s + x.value, 0);

  return (
    <div className="charts-grid" style={{
      display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16,
    }}>
      {/* Revenue donut */}
      <div style={chartCardStyle}>
        <div style={chartHeaderStyle}>Cơ cấu doanh thu</div>
        <div style={{ fontSize: 12, color: '#6B6B66', marginTop: 4, marginBottom: 18 }}>
          Doanh thu được chia thành 4 nhóm: giá vốn, phí cố định, phí biến đổi và lợi nhuận.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18,
          flexWrap: 'wrap' }}>
          <DonutV2 items={revItems}
            centerLabel="Doanh thu" centerValue={fmtVND(revenue)} />
          <Legend items={revItems} total={revTotal} />
        </div>
      </div>

      {/* Cost composition donut */}
      <div style={chartCardStyle}>
        <div style={chartHeaderStyle}>Cơ cấu chi phí</div>
        <div style={{ fontSize: 12, color: '#6B6B66', marginTop: 4, marginBottom: 18 }}>
          Phân rã từng khoản phí trong tổng chi phí — biết khoản nào ngốn nhiều nhất.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18,
          flexWrap: 'wrap' }}>
          <DonutV2 items={costItems.length ? costItems : [{ name: '—', value: 1, color: '#EFEAE0' }]}
            centerLabel="Tổng phí" centerValue={fmtVND(costTotalSum)} />
          <div style={{ flex: 1, minWidth: 160, maxHeight: 200, overflowY: 'auto', paddingRight: 4 }}>
            <Legend items={costItems} total={costTotalSum} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Top fees horizontal bar (kept, but more compact)
function TopFeesV2({ fees, revenue }) {
  const ranked = useMemoCV(() => {
    return fees
      .map(f => ({ ...f, amount: computeFee(f, revenue) }))
      .filter(f => f.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [fees, revenue]);
  const max = Math.max(1, ...ranked.map(x => x.amount));

  return (
    <div style={chartCardStyle}>
      <div style={chartHeaderStyle}>Top khoản phí lớn nhất</div>
      <div style={{ fontSize: 12, color: '#6B6B66', marginTop: 4, marginBottom: 16 }}>
        5 khoản phí ngốn lợi nhuận nhiều nhất trên một đơn hàng.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {ranked.map((f, i) => {
          const w = (f.amount / max) * 100;
          return (
            <div key={f.id}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                marginBottom: 5,
              }}>
                <span style={{ fontSize: 13, color: '#1A1A1A', fontWeight: 500,
                  display: 'inline-flex', alignItems: 'center', gap: 0,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <span style={{
                    display: 'inline-block', width: 22, fontSize: 11,
                    color: '#A8A89E', fontWeight: 600, flexShrink: 0,
                  }}>{i + 1}.</span>
                  {f.name}
                </span>
                <span style={{ fontSize: 13, color: '#1A1A1A', fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums' }}>
                  {fmtVND(f.amount)}
                </span>
              </div>
              <div style={{
                height: 8, background: '#F5F2EA', borderRadius: 999, overflow: 'hidden',
              }}>
                <div style={{
                  width: `${w}%`, height: '100%', borderRadius: 999,
                  background: 'linear-gradient(90deg, #F5B81C 0%, #FFD166 100%)',
                  transition: 'width 0.4s cubic-bezier(0.2,0.8,0.2,1)',
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { DonutV2, Legend, DualDonuts, TopFeesV2 });
