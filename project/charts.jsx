// Charts (donut + horizontal bars), recommendation card, footer

const { useState: useStateCh, useMemo: useMemoCh } = React;

// ────────────────────────────────────────────────────────────────
// Donut chart — Cơ cấu doanh thu
// ────────────────────────────────────────────────────────────────
function DonutChart({ revenue, costPrice, fixedTotal, varTotal, profit }) {
  const items = [
    { id: 'cost', name: 'Giá vốn', value: costPrice, color: '#F5B81C' },
    { id: 'fixed', name: 'Phí cố định', value: fixedTotal, color: '#3B82C4' },
    { id: 'var', name: 'Phí biến đổi', value: varTotal, color: '#E89A8A' },
    { id: 'profit', name: 'Lợi nhuận', value: Math.max(0, profit), color: '#1D9E75' },
  ];
  const total = Math.max(1, items.reduce((s, x) => s + x.value, 0));
  const size = 200, stroke = 28, r = (size - stroke) / 2 - 2;
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
    <div style={chartCardStyle}>
      <div style={chartHeaderStyle}>Cơ cấu doanh thu</div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 24, marginTop: 16,
        flexWrap: 'wrap', justifyContent: 'center',
      }}>
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
          <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size/2} cy={size/2} r={r} fill="none"
              stroke="#F5F2EA" strokeWidth={stroke} />
            {arcs.map(a => (
              <circle key={a.id} cx={size/2} cy={size/2} r={r} fill="none"
                stroke={a.color} strokeWidth={stroke}
                strokeDasharray={`${a.dash} ${circ - a.dash}`}
                strokeDashoffset={a.offset}
                style={{ transition: 'stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease' }}
              />
            ))}
          </svg>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ fontSize: 11, color: '#8A8A82', fontWeight: 500,
              letterSpacing: '0.06em', textTransform: 'uppercase' }}>Doanh thu</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: '#1A1A1A',
              letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
              {fmtVND(revenue)}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {arcs.map(a => (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '6px 0',
            }}>
              <span style={{
                width: 12, height: 12, borderRadius: 3, background: a.color, flexShrink: 0,
              }} />
              <span style={{ fontSize: 13, color: '#1A1A1A', flex: 1, fontWeight: 500 }}>{a.name}</span>
              <span style={{ fontSize: 13, color: '#6B6B66',
                fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                {(a.frac * 100).toFixed(1).replace('.', ',')}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Horizontal bar chart — Top 5 fees
// ────────────────────────────────────────────────────────────────
function TopFeesChart({ fees, revenue }) {
  const ranked = useMemoCh(() => {
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
      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {ranked.length === 0 && (
          <div style={{ fontSize: 13, color: '#8A8A82', padding: '20px 0', textAlign: 'center' }}>
            Chưa có khoản phí nào được kích hoạt.
          </div>
        )}
        {ranked.map((f, i) => {
          const w = (f.amount / max) * 100;
          return (
            <div key={f.id}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                marginBottom: 6,
              }}>
                <span style={{ fontSize: 13, color: '#1A1A1A', fontWeight: 500 }}>
                  <span style={{
                    display: 'inline-block', width: 18, fontSize: 11,
                    color: '#A8A89E', fontWeight: 600,
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

const chartCardStyle = {
  background: '#fff', border: '1px solid #EFEAE0', borderRadius: 14,
  padding: 22, boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
};
const chartHeaderStyle = {
  fontSize: 14, fontWeight: 600, color: '#1A1A1A', letterSpacing: '-0.01em',
};

function ChartsSection({ revenue, costPrice, fixedFees, varFees, profit }) {
  const fixedTotal = fixedFees.reduce((s, f) => s + computeFee(f, revenue), 0);
  const varTotal = varFees.reduce((s, f) => s + computeFee(f, revenue), 0);
  return (
    <section style={{ marginTop: 32 }}>
      <SectionHeader
        title="Phân tích trực quan"
        subtitle="Xem cấu trúc chi phí trong một sản phẩm và những khoản phí ngốn lợi nhuận nhiều nhất."
      />
      <div className="charts-grid" style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginTop: 16,
      }}>
        <DonutChart revenue={revenue} costPrice={costPrice}
          fixedTotal={fixedTotal} varTotal={varTotal} profit={profit} />
        <TopFeesChart fees={[...fixedFees, ...varFees]} revenue={revenue} />
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────
// Recommendation card
// ────────────────────────────────────────────────────────────────
function RecommendationCard({ profit, profitPct, fixedFees, revenue, onTry }) {
  // Decide a tip dynamically
  const tip = useMemoCh(() => {
    const freeship = fixedFees.find(f => f.id === 'freeship');
    const ads = fixedFees.find(f => f.id === 'ads');
    if (profitPct < 0) return {
      title: 'Sản phẩm đang lỗ',
      body: 'Thử tăng giá bán thêm 5–8% hoặc tắt bớt các gói Xtra không bắt buộc để về điểm hòa vốn.',
      cta: 'Xem hướng dẫn tối ưu lợi nhuận',
    };
    if (freeship?.on && revenue < 100000) return {
      title: 'Tăng lợi nhuận thêm ~5,2%',
      body: 'Bạn có thể tắt Freeship Xtra cho các sản phẩm dưới 100.000đ — đơn nhỏ thường không cần combo này.',
      cta: 'Tìm hiểu thêm',
    };
    if (profitPct < 8) return {
      title: 'Lãi mỏng — vẫn còn cơ hội',
      body: 'Thương lượng giá vốn xuống 5% hoặc giảm Voucher shop về 1,5% có thể đẩy biên lợi nhuận lên trên 12%.',
      cta: 'Mẹo tối ưu chi phí',
    };
    return {
      title: 'Sản phẩm đang vận hành tốt',
      body: 'Cân nhắc nhân rộng combo này sang nhóm SKU tương tự để tăng tổng lãi mà không phải tối ưu thêm.',
      cta: 'Xem khóa học scale Shopee',
    };
  }, [profit, profitPct, fixedFees, revenue]);

  return (
    <div style={{
      marginTop: 32,
      background: 'linear-gradient(135deg, #F0F7FF 0%, #F8FBFF 100%)',
      border: '1px solid #DBE9F8', borderRadius: 14, padding: 22,
      display: 'flex', gap: 16, alignItems: 'flex-start',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: '#fff', border: '1px solid #DBE9F8',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#3B82C4',
      }}>
        <Icon name="lightbulb" size={20} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
          color: '#3B82C4', textTransform: 'uppercase', marginBottom: 4,
        }}>Gợi ý từ E-Dream</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A', marginBottom: 4,
          letterSpacing: '-0.01em' }}>{tip.title}</div>
        <div style={{ fontSize: 13, color: '#4A5566', lineHeight: 1.6 }}>{tip.body}</div>
        <button onClick={onTry} style={{
          marginTop: 10, background: 'transparent', border: 0, padding: 0,
          color: '#1A5BA5', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'inherit',
        }}>
          {tip.cta} <Icon name="chevronRight" size={13} />
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Footer
// ────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{
      marginTop: 48, padding: '28px 0 40px',
      borderTop: '1px solid #EFEAE0', textAlign: 'center',
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <LogoMark size={22} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>E-Dream</span>
      </div>
      <div style={{ fontSize: 12, color: '#8A8A82' }}>
        Bản quyền © Nguyễn Hiếu Liêm — edream.vn
      </div>
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 18,
        fontSize: 12, color: '#6B6B66', marginTop: 10,
      }}>
        <a href="#" style={footerLink}>Về E-Dream</a>
        <span style={{ color: '#D9D5C8' }}>·</span>
        <a href="#" style={footerLink}>Khóa học vận hành Shopee</a>
        <span style={{ color: '#D9D5C8' }}>·</span>
        <a href="#" style={footerLink}>Liên hệ</a>
      </div>
    </footer>
  );
}
const footerLink = { color: '#6B6B66', textDecoration: 'none' };

Object.assign(window, { DonutChart, TopFeesChart, ChartsSection, RecommendationCard, Footer });
