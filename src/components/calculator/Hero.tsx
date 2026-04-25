type CalcMode = 'forward' | 'reverse'

interface Props {
  mode: CalcMode
  setMode: (m: CalcMode) => void
}

export function Hero({ mode, setMode }: Props) {
  const opts: { id: CalcMode; label: string }[] = [
    { id: 'forward', label: 'Tính từ giá bán' },
    { id: 'reverse', label: 'Tìm giá bán theo lợi nhuận' },
  ]

  return (
    <section style={{ padding: '48px 0 32px' }}>
      <div style={{
        fontSize: 11, fontWeight: 600, letterSpacing: '0.14em',
        color: '#C99A0E', textTransform: 'uppercase', marginBottom: 14,
      }}>SHOPEE TOOLKIT · MÁY TÍNH PHÍ</div>
      <h1 style={{
        margin: 0, fontSize: 38, fontWeight: 600, letterSpacing: '-0.022em',
        lineHeight: 1.1, color: '#1A1A1A', maxWidth: 600,
      }}>
        Tính lợi nhuận sản phẩm{' '}
        <span style={{
          background: 'linear-gradient(120deg, #F5B81C 0%, #E89A0E 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>Shopee</span>
      </h1>
      <p style={{
        margin: '14px 0 28px', fontSize: 15, color: '#6B6B66',
        maxWidth: 540, lineHeight: 1.6,
      }}>
        Nhập giá vốn và giá bán — biết ngay lợi nhuận thực sau mọi khoản phí sàn,
        thanh toán, voucher và vận hành.
      </p>

      <div style={{
        display: 'inline-flex', padding: 4, borderRadius: 999,
        background: '#F1ECDF', border: '1px solid #EFEAE0',
      }}>
        {opts.map(o => {
          const active = mode === o.id
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
          )
        })}
      </div>
    </section>
  )
}
