import { useEffect, useState } from 'react'
import { Bookmark, X, Loader2 } from 'lucide-react'
import { saveResult } from '@/lib/saved-results'
import { trackSaveResult } from '@/lib/analytics'
import { fmtVND, fmtPct } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  defaultProductName: string
  inputs: Record<string, unknown>
  feesSnapshot: unknown[]
  results: Record<string, unknown>
  onSaved: (resultId: string) => void
}

const TRUNCATE_NAME = 100

export function SaveResultDialog({
  open, onClose, defaultProductName, inputs, feesSnapshot, results, onSaved,
}: Props) {
  const [productName, setProductName] = useState(defaultProductName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Re-sync default name khi dialog mở lại với props mới
  useEffect(() => {
    if (open) {
      setProductName(defaultProductName)
      setError(null)
    }
  }, [open, defaultProductName])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, saving, onClose])

  if (!open) return null

  const costPrice = Number(inputs.costPrice ?? 0)
  const sellPrice = Number(inputs.sellPrice ?? 0)
  const categoryLabel = String(inputs.categoryLabel ?? inputs.category ?? '')
  const feeTotal = Number(results.feeTotal ?? 0)
  const profit = Number(results.profit ?? 0)
  const profitPct = Number(results.profitPct ?? 0)
  const activeFeeCount = (feesSnapshot as Array<{ on?: boolean }>).filter(f => f?.on).length

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    const trimmed = productName.trim().slice(0, TRUNCATE_NAME)
    const { data, error: err } = await saveResult({
      tool_id: 'shopee_calculator',
      product_name: trimmed,
      inputs,
      fees_snapshot: feesSnapshot,
      results,
    })
    setSaving(false)
    if (err || !data) {
      const msg = err && err.includes('giới hạn')
        ? 'Bạn đã lưu tối đa 50 kết quả. Vào Dashboard xóa bớt kết quả cũ trước.'
        : err ?? 'Lỗi không xác định'
      setError(msg)
      return
    }
    trackSaveResult('shopee_calculator', trimmed.length > 0)
    onSaved(data.result_id)
    onClose()
  }

  return (
    <div onClick={() => !saving && onClose()} style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 480, maxWidth: '92vw',
        background: '#fff', borderRadius: 16, padding: '24px 28px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{
            margin: 0, fontSize: 16, fontWeight: 700, color: '#1A1A1A',
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            Lưu kết quả tính phí
          </h2>
          <button onClick={onClose} disabled={saving} style={{
            width: 28, height: 28, padding: 0, border: 'none',
            background: 'transparent', cursor: saving ? 'not-allowed' : 'pointer',
            color: '#6B6B66', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6B6B66', marginBottom: 6 }}>
          Tên kết quả (tùy chọn)
        </label>
        <input
          type="text"
          value={productName}
          onChange={e => { setProductName(e.target.value); setError(null) }}
          placeholder="vd: Áo polo nam tháng 4"
          maxLength={TRUNCATE_NAME}
          autoFocus
          disabled={saving}
          onKeyDown={e => { if (e.key === 'Enter' && !saving) handleSave() }}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8,
            border: '1.5px solid #EFEAE0', background: '#FAFAF7',
            fontSize: 14, color: '#1A1A1A', outline: 'none',
            fontFamily: 'inherit', boxSizing: 'border-box',
          }}
        />
        <div style={{ fontSize: 11, color: '#8A8A82', marginTop: 6 }}>
          Tên giúp bạn dễ tìm lại trong Dashboard.
        </div>

        {/* Preview snapshot */}
        <div style={{
          marginTop: 16, padding: '14px 16px', borderRadius: 10,
          background: '#FAFAF7', border: '1px solid #EFEAE0',
          fontSize: 13, color: '#1A1A1A', lineHeight: 1.7,
        }}>
          <PreviewRow label="Giá vốn" value={fmtVND(costPrice)} />
          <PreviewRow label="Giá bán" value={fmtVND(sellPrice)} />
          <PreviewRow label="Ngành" value={categoryLabel || '—'} />
          <PreviewRow label="Tổng phí" value={fmtVND(feeTotal)} />
          <PreviewRow
            label="Lợi nhuận"
            value={
              <span style={{ color: profit >= 0 ? '#1D9E75' : '#A82928', fontWeight: 600 }}>
                {fmtVND(profit)} ({fmtPct(profitPct, true)})
              </span>
            }
          />
          <PreviewRow label="Số fees áp dụng" value={String(activeFeeCount)} />
        </div>

        {/* Footer note */}
        <div style={{
          marginTop: 12, fontSize: 11, color: '#8A8A82', fontStyle: 'italic',
        }}>
          Kết quả sẽ tự động xóa sau 90 ngày kể từ khi lưu.
        </div>

        {/* Error */}
        {error && (
          <div style={{
            marginTop: 12, padding: '10px 14px', borderRadius: 8,
            background: '#FEF2F2', border: '1px solid #FCA5A5',
            color: '#991B1B', fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <button onClick={onClose} disabled={saving} style={{
            padding: '9px 18px', borderRadius: 8, border: '1px solid #EFEAE0',
            background: '#fff', fontSize: 13, fontWeight: 500, color: '#1A1A1A',
            cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          }}>Hủy</button>
          <button onClick={handleSave} disabled={saving} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '9px 18px', borderRadius: 8, border: 'none',
            background: '#F5B81C', color: '#1A1A1A',
            fontSize: 13, fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            opacity: saving ? 0.7 : 1,
            boxShadow: saving ? 'none' : '0 1px 0 rgba(255,255,255,0.4) inset, 0 2px 6px rgba(245,184,28,0.30)',
          }}>
            {saving
              ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} />
              : <Bookmark size={14} />}
            Lưu kết quả
          </button>
        </div>
      </div>
    </div>
  )
}

function PreviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: '#6B6B66' }}>{label}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  )
}
