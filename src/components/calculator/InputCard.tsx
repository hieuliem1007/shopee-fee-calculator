import { useState } from 'react'
import { Store, ChevronDown, Check } from 'lucide-react'
import { CATEGORIES } from '@/lib/fees'
import { fmtNum, parseNum } from '@/lib/utils'
import type { ShopType, TaxMode } from '@/types/fees'

interface MoneyInputProps {
  label: string
  value: number
  onChange: (v: number) => void
  hint: string
  autoFocus?: boolean
}

function MoneyInput({ label, value, onChange, hint, autoFocus }: MoneyInputProps) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <label style={{
        display: 'block', fontSize: 12, fontWeight: 500,
        color: '#6B6B66', marginBottom: 8,
      }}>{label}</label>
      <div style={{
        position: 'relative',
        border: `1.5px solid ${focused ? '#1A1A1A' : '#EFEAE0'}`,
        borderRadius: 10, background: '#FAFAF7',
        transition: 'border-color 0.15s', padding: '14px 16px',
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
        }}>đ</span>
      </div>
      <div style={{ fontSize: 12, color: '#8A8A82', marginTop: 8 }}>{hint}</div>
    </div>
  )
}

interface SelectProps<T extends string> {
  label: string
  value: T
  options: { id: T; label: string }[]
  onChange: (v: T) => void
  leftIcon?: React.ReactNode
}

function SelectField<T extends string>({ label, value, options, onChange, leftIcon }: SelectProps<T>) {
  const [open, setOpen] = useState(false)
  const current = options.find(o => o.id === value) || options[0]

  return (
    <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6B6B66', marginBottom: 8 }}>
        {label}
      </label>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 8, padding: '11px 14px', borderRadius: 8,
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
        <ChevronDown size={14} color="#6B6B66" />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9 }} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            background: '#fff', border: '1px solid #EFEAE0', borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: 4, zIndex: 20,
            maxHeight: 280, overflow: 'auto',
          }}>
            {options.map(o => (
              <div key={o.id} onClick={() => { onChange(o.id); setOpen(false) }}
                style={{
                  padding: '9px 10px', borderRadius: 6, cursor: 'pointer',
                  fontSize: 14, color: '#1A1A1A',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: o.id === value ? '#FAF6E8' : 'transparent',
                }}>
                <span>{o.label}</span>
                {o.id === value && <Check size={14} color="#C99A0E" />}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

interface Props {
  costPrice: number; setCostPrice: (v: number) => void
  sellPrice: number; setSellPrice: (v: number) => void
  productName: string; setProductName: (v: string) => void
  shopType: ShopType; setShopType: (v: ShopType) => void
  category: string; setCategory: (v: string) => void
  taxMode: TaxMode; setTaxMode: (v: TaxMode) => void
}

export function InputCard({
  costPrice, setCostPrice, sellPrice, setSellPrice,
  productName, setProductName,
  shopType, setShopType, category, setCategory, taxMode, setTaxMode,
}: Props) {
  const categoryOptions = CATEGORIES.map(c => {
    const p = +(c.adj * 100).toFixed(2)
    const s = (p % 1 === 0 ? p.toFixed(0) : p.toString()).replace('.', ',')
    return { id: c.id, label: `${c.name} (${s}%)` }
  })

  return (
    <div style={{
      background: '#fff', borderRadius: 16, border: '1px solid #EFEAE0',
      padding: 28,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04)',
      marginBottom: 16,
    }}>
      <div className="input-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr', gap: 18 }}>
        <MoneyInput label="Giá vốn" value={costPrice} onChange={setCostPrice}
          hint="Giá bạn nhập về / sản xuất" autoFocus />
        <MoneyInput label="Giá bán" value={sellPrice} onChange={setSellPrice}
          hint="Giá niêm yết trên Shopee" />
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6B6B66', marginBottom: 8 }}>
            Tên sản phẩm <span style={{ color: '#A8A89E', fontWeight: 400 }}>(để lưu lại sau)</span>
          </label>
          <input type="text" value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="VD: Áo thun nam mùa hè"
            style={{
              width: '100%', padding: '14px 16px', borderRadius: 10,
              border: '1.5px solid #EFEAE0', background: '#FAFAF7',
              fontSize: 15, color: '#1A1A1A', outline: 'none',
              fontFamily: 'inherit',
            }} />
          <div style={{ fontSize: 12, color: '#8A8A82', marginTop: 8 }}>
            Tùy chọn — dùng để lưu vào lịch sử tính
          </div>
        </div>
      </div>

      <div className="input-row" style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16, marginTop: 20, paddingTop: 20, borderTop: '1px solid #F5F2EA',
      }}>
        <SelectField<ShopType>
          label="Loại shop"
          value={shopType}
          options={[
            { id: 'mall', label: 'Shop Mall' },
            { id: 'normal', label: 'Shop thường' },
          ]}
          onChange={setShopType}
          leftIcon={<Store size={14} color="#C99A0E" />}
        />
        <SelectField<string>
          label="Ngành hàng"
          value={category}
          options={categoryOptions}
          onChange={setCategory}
        />
        <SelectField<TaxMode>
          label="Hình thức kinh doanh"
          value={taxMode}
          options={[
            { id: 'hokd', label: 'Hộ kinh doanh (1,5%)' },
            { id: 'company', label: 'Công ty (tự khai)' },
            { id: 'personal', label: 'Cá nhân (10%)' },
          ]}
          onChange={setTaxMode}
        />
      </div>
    </div>
  )
}
