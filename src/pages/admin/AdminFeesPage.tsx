import { useState, useEffect, useMemo, type ReactNode } from 'react'
import {
  Plus, Pencil, Trash2, Loader2, AlertTriangle, Filter,
  Upload, Download,
} from 'lucide-react'
import {
  listDefaultFees, createDefaultFee, updateDefaultFee, softDeleteDefaultFee,
  isSeedFee, type DefaultFee, type FeeUnit,
  listCategoryFees, createCategoryFee, updateCategoryFee, softDeleteCategoryFee,
  type CategoryFee, type ShopTypeFilter,
} from '@/lib/fees-admin'
import { downloadSampleExcel } from '@/lib/import-excel'
import { CategoryImportDialog } from '@/components/admin/CategoryImportDialog'

// ── Layout helpers ──────────────────────────────────────────────────

function Card({ children, padding = 0 }: { children: ReactNode; padding?: number }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #EFEAE0', borderRadius: 12,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      padding, marginBottom: 18, overflow: 'hidden',
    }}>{children}</div>
  )
}

// ── Toast ───────────────────────────────────────────────────────────

type ToastState = { type: 'success' | 'error'; message: string } | null

function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null
  const ok = toast.type === 'success'
  return (
    <div style={{
      position: 'fixed', top: 24, right: 24, zIndex: 200,
      padding: '12px 18px', borderRadius: 10,
      background: ok ? '#DCFCE7' : '#FEE2E2',
      color: ok ? '#166534' : '#991B1B',
      border: `1px solid ${ok ? '#86EFAC' : '#FCA5A5'}`,
      fontSize: 13, fontWeight: 500,
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      animation: 'fadeIn 0.2s ease', maxWidth: 360,
    }}>{toast.message}</div>
  )
}

// ── Dialog shell ────────────────────────────────────────────────────

function DialogShell({ onClose, children, maxWidth = 480 }: {
  onClose: () => void; children: ReactNode; maxWidth?: number
}) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 14, padding: 28,
        width: '100%', maxWidth, boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>{children}</div>
    </div>
  )
}

// ── Form widgets ────────────────────────────────────────────────────

function inputStyle(error: boolean, disabled = false): React.CSSProperties {
  return {
    width: '100%', padding: '8px 10px', borderRadius: 7,
    border: `1.5px solid ${error ? '#FCA5A5' : '#EFEAE0'}`,
    background: disabled ? '#F5F5F3' : '#FAFAF7',
    fontSize: 13, color: '#1A1A1A', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
  }
}

function FieldLabel({ children, required = false }: { children: ReactNode; required?: boolean }) {
  return (
    <label style={{ fontSize: 12, color: '#6B6B66', fontWeight: 500, display: 'block', marginBottom: 4 }}>
      {children}{required && <span style={{ color: '#A82928', marginLeft: 3 }}>*</span>}
    </label>
  )
}

function ErrorText({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 11, color: '#A82928', marginTop: 4 }}>{children}</div>
}

function PrimaryButton({ children, onClick, disabled, loading, danger = false }: {
  children: ReactNode; onClick: () => void; disabled?: boolean; loading?: boolean; danger?: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled || loading} style={{
      padding: '9px 18px', borderRadius: 8, border: 'none',
      background: danger ? '#A82928' : '#1D9E75',
      color: '#fff', fontSize: 13, fontWeight: 600,
      cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
      fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
      opacity: (disabled || loading) ? 0.6 : 1,
    }}>
      {loading && <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} />}
      {children}
    </button>
  )
}

function SecondaryButton({ children, onClick, disabled }: {
  children: ReactNode; onClick: () => void; disabled?: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '9px 18px', borderRadius: 8, border: '1px solid #EFEAE0',
      background: '#fff', fontSize: 13, fontWeight: 500,
      cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
    }}>{children}</button>
  )
}

// ── Format helpers ──────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatValue(v: number, unit: FeeUnit): string {
  if (unit === 'percent') return v.toFixed(2)
  return v.toLocaleString('vi-VN')
}

// ── Add dialog ──────────────────────────────────────────────────────

interface AddFormState {
  fee_key: string
  fee_label: string
  fee_value: string
  fee_unit: FeeUnit
  category: string
  description: string
}

function AddFeeDialog({ onClose, onSuccess, onError }: {
  onClose: () => void
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
}) {
  const [form, setForm] = useState<AddFormState>({
    fee_key: '', fee_label: '', fee_value: '',
    fee_unit: 'percent', category: 'shopee_variable', description: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof AddFormState, string>>>({})
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    const errs: typeof errors = {}
    if (!form.fee_label.trim()) errs.fee_label = 'Tên phí không được rỗng'
    if (!form.fee_key.trim()) errs.fee_key = 'Mã phí không được rỗng'
    else if (!/^[a-z][a-z0-9_]*$/.test(form.fee_key)) {
      errs.fee_key = 'Chỉ chữ thường, số, dấu gạch dưới, bắt đầu bằng chữ'
    }
    const value = parseFloat(form.fee_value)
    if (form.fee_value === '' || isNaN(value)) errs.fee_value = 'Giá trị phải là số'
    else if (value < 0) errs.fee_value = 'Phí không thể âm'
    else if (form.fee_unit === 'percent' && value > 100) errs.fee_value = 'Phí % không được vượt quá 100'
    if (!form.category.trim()) errs.category = 'Category không được rỗng'

    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    setSaving(true)
    const { error } = await createDefaultFee({
      fee_key: form.fee_key.trim(),
      fee_label: form.fee_label.trim(),
      fee_value: value,
      fee_unit: form.fee_unit,
      category: form.category.trim(),
      description: form.description.trim() || null,
    })
    setSaving(false)
    if (error) {
      onError(error)
      return
    }
    onSuccess('Đã thêm phí mới')
  }

  return (
    <DialogShell onClose={onClose}>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#1A1A1A', marginBottom: 16 }}>
        Thêm phí mới
      </div>
      <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
        <div style={{ marginBottom: 12 }}>
          <FieldLabel required>Tên phí</FieldLabel>
          <input type="text" value={form.fee_label}
            onChange={e => { setForm(f => ({ ...f, fee_label: e.target.value })); setErrors(p => ({ ...p, fee_label: undefined })) }}
            placeholder="VD: Voucher Xtra" style={inputStyle(!!errors.fee_label)} />
          {errors.fee_label && <ErrorText>{errors.fee_label}</ErrorText>}
        </div>

        <div style={{ marginBottom: 12 }}>
          <FieldLabel required>Mã phí (key)</FieldLabel>
          <input type="text" value={form.fee_key}
            onChange={e => { setForm(f => ({ ...f, fee_key: e.target.value.toLowerCase() })); setErrors(p => ({ ...p, fee_key: undefined })) }}
            placeholder="vd: shopee_voucher_xtra" style={inputStyle(!!errors.fee_key)} />
          {errors.fee_key && <ErrorText>{errors.fee_key}</ErrorText>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 12, marginBottom: 12 }}>
          <div>
            <FieldLabel required>Giá trị</FieldLabel>
            <input type="number" step="0.01" value={form.fee_value}
              onChange={e => { setForm(f => ({ ...f, fee_value: e.target.value })); setErrors(p => ({ ...p, fee_value: undefined })) }}
              style={inputStyle(!!errors.fee_value)} />
            {errors.fee_value && <ErrorText>{errors.fee_value}</ErrorText>}
          </div>
          <div>
            <FieldLabel required>Đơn vị</FieldLabel>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {(['percent', 'vnd'] as const).map(u => (
                <label key={u} style={{
                  flex: 1, padding: '8px 10px', borderRadius: 7,
                  border: `1.5px solid ${form.fee_unit === u ? '#1D9E75' : '#EFEAE0'}`,
                  background: form.fee_unit === u ? '#DCFCE7' : '#FAFAF7',
                  cursor: 'pointer', fontSize: 12, textAlign: 'center', fontWeight: 500,
                }}>
                  <input type="radio" checked={form.fee_unit === u}
                    onChange={() => setForm(f => ({ ...f, fee_unit: u }))} style={{ display: 'none' }} />
                  {u === 'percent' ? '%' : 'VND'}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <FieldLabel required>Phân loại phí</FieldLabel>
          <select value={form.category}
            onChange={e => { setForm(f => ({ ...f, category: e.target.value })); setErrors(p => ({ ...p, category: undefined })) }}
            style={{ ...inputStyle(!!errors.category), appearance: 'auto' }}>
            <option value="shopee_variable">Phí biến đổi (Chi phí ngoài sàn — quảng cáo, voucher shop, vận hành…)</option>
            <option value="shopee_fixed">Phí cố định (Phí sàn Shopee — thanh toán, hạ tầng, thuế…)</option>
          </select>
          <div style={{ fontSize: 11, color: '#8A8A82', marginTop: 4, lineHeight: 1.45 }}>
            Quyết định panel hiển thị trong Calculator: <strong>Phí cố định</strong> (vàng) hoặc <strong>Phí biến đổi</strong> (xanh).
          </div>
          {errors.category && <ErrorText>{errors.category}</ErrorText>}
        </div>

        <div style={{ marginBottom: 18 }}>
          <FieldLabel>Mô tả</FieldLabel>
          <textarea value={form.description} rows={2}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Giải thích phí cho user xem trong calculator..."
            style={{ ...inputStyle(false), resize: 'vertical', fontFamily: 'inherit' }} />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <SecondaryButton onClick={onClose} disabled={saving}>Hủy</SecondaryButton>
          <PrimaryButton onClick={handleSubmit} loading={saving}>Tạo phí</PrimaryButton>
        </div>
      </form>
    </DialogShell>
  )
}

// ── Edit dialog ─────────────────────────────────────────────────────

function EditFeeDialog({ fee, onClose, onSuccess, onError }: {
  fee: DefaultFee
  onClose: () => void
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
}) {
  const [form, setForm] = useState({
    fee_label: fee.fee_label,
    fee_value: String(fee.fee_value),
    fee_unit: fee.fee_unit,
    description: fee.description ?? '',
    display_order: String(fee.display_order ?? 0),
  })
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})
  const [saving, setSaving] = useState(false)

  const valueChanged = parseFloat(form.fee_value) !== fee.fee_value
  const unitChanged = form.fee_unit !== fee.fee_unit
  const valueOrUnitChanged = valueChanged || unitChanged

  const handleSubmit = async () => {
    const errs: Record<string, string> = {}
    if (!form.fee_label.trim()) errs.fee_label = 'Tên phí không được rỗng'
    const value = parseFloat(form.fee_value)
    if (form.fee_value === '' || isNaN(value)) errs.fee_value = 'Giá trị phải là số'
    else if (value < 0) errs.fee_value = 'Phí không thể âm'
    else if (form.fee_unit === 'percent' && value > 100) errs.fee_value = 'Phí % không được vượt quá 100'
    if (valueOrUnitChanged && !reason.trim()) {
      errs.reason = 'Lý do thay đổi bắt buộc khi sửa giá trị'
    }
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    // Build delta
    const changes: Parameters<typeof updateDefaultFee>[1] = {}
    if (form.fee_label.trim() !== fee.fee_label) changes.fee_label = form.fee_label.trim()
    if (value !== fee.fee_value) changes.fee_value = value
    if (form.fee_unit !== fee.fee_unit) changes.fee_unit = form.fee_unit
    const descTrim = form.description.trim()
    const oldDesc = fee.description ?? ''
    if (descTrim !== oldDesc) changes.description = descTrim || null
    const newOrder = parseInt(form.display_order, 10)
    if (!isNaN(newOrder) && newOrder !== (fee.display_order ?? 0)) changes.display_order = newOrder

    if (Object.keys(changes).length === 0) {
      onClose()
      return
    }

    setSaving(true)
    const { data, error } = await updateDefaultFee(
      fee.id,
      changes,
      reason.trim() || 'Cập nhật metadata',
    )
    setSaving(false)
    if (error) {
      onError(error)
      return
    }
    onSuccess(`Đã cập nhật, ${data?.changed_count ?? 0} field thay đổi`)
  }

  return (
    <DialogShell onClose={onClose}>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#1A1A1A', marginBottom: 16 }}>
        Sửa phí: {fee.fee_label}
      </div>
      <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
        <div style={{ marginBottom: 12 }}>
          <FieldLabel required>Tên phí</FieldLabel>
          <input type="text" value={form.fee_label}
            onChange={e => { setForm(f => ({ ...f, fee_label: e.target.value })); setErrors(p => ({ ...p, fee_label: undefined })) }}
            style={inputStyle(!!errors.fee_label)} />
          {errors.fee_label && <ErrorText>{errors.fee_label}</ErrorText>}
        </div>

        <div style={{ marginBottom: 12 }}>
          <FieldLabel>Mã phí (không sửa được)</FieldLabel>
          <input type="text" value={fee.fee_key} disabled
            style={inputStyle(false, true)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 12, marginBottom: 12 }}>
          <div>
            <FieldLabel required>Giá trị</FieldLabel>
            <input type="number" step="0.01" value={form.fee_value}
              onChange={e => { setForm(f => ({ ...f, fee_value: e.target.value })); setErrors(p => ({ ...p, fee_value: undefined })) }}
              style={inputStyle(!!errors.fee_value)} />
            {errors.fee_value && <ErrorText>{errors.fee_value}</ErrorText>}
          </div>
          <div>
            <FieldLabel required>Đơn vị</FieldLabel>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {(['percent', 'vnd'] as const).map(u => (
                <label key={u} style={{
                  flex: 1, padding: '8px 10px', borderRadius: 7,
                  border: `1.5px solid ${form.fee_unit === u ? '#1D9E75' : '#EFEAE0'}`,
                  background: form.fee_unit === u ? '#DCFCE7' : '#FAFAF7',
                  cursor: 'pointer', fontSize: 12, textAlign: 'center', fontWeight: 500,
                }}>
                  <input type="radio" checked={form.fee_unit === u}
                    onChange={() => setForm(f => ({ ...f, fee_unit: u }))} style={{ display: 'none' }} />
                  {u === 'percent' ? '%' : 'VND'}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <FieldLabel>Mô tả</FieldLabel>
          <textarea value={form.description} rows={2}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            style={{ ...inputStyle(false), resize: 'vertical', fontFamily: 'inherit' }} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <FieldLabel>Thứ tự hiển thị</FieldLabel>
          <input type="number" value={form.display_order}
            onChange={e => setForm(f => ({ ...f, display_order: e.target.value }))}
            style={inputStyle(false)} />
        </div>

        <div style={{ marginBottom: 18 }}>
          <FieldLabel required={valueOrUnitChanged}>
            Lý do thay đổi {valueOrUnitChanged ? '(bắt buộc khi sửa giá/đơn vị)' : '(tùy chọn)'}
          </FieldLabel>
          <textarea value={reason} rows={2}
            onChange={e => { setReason(e.target.value); setErrors(p => ({ ...p, reason: undefined })) }}
            placeholder="VD: Shopee tăng phí từ tháng 5/2026"
            style={{ ...inputStyle(!!errors.reason), resize: 'vertical', fontFamily: 'inherit' }} />
          {errors.reason && <ErrorText>{errors.reason}</ErrorText>}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <SecondaryButton onClick={onClose} disabled={saving}>Hủy</SecondaryButton>
          <PrimaryButton onClick={handleSubmit} loading={saving}>Lưu thay đổi</PrimaryButton>
        </div>
      </form>
    </DialogShell>
  )
}

// ── Delete dialog ───────────────────────────────────────────────────

function DeleteFeeDialog({ fee, onClose, onSuccess, onError }: {
  fee: DefaultFee
  onClose: () => void
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
}) {
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const seedWarning = isSeedFee(fee)

  const handle = async () => {
    const errs: Record<string, string> = {}
    if (!reason.trim()) errs.reason = 'Lý do xóa bắt buộc'
    if (!confirmed) errs.confirmed = 'Vui lòng xác nhận'
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setSaving(true)
    const { error } = await softDeleteDefaultFee(fee.id, reason.trim())
    setSaving(false)
    if (error) {
      onError(error)
      return
    }
    onSuccess('Đã xóa phí')
  }

  return (
    <DialogShell onClose={onClose}>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#1A1A1A', marginBottom: 6 }}>
        Xóa phí: {fee.fee_label}
      </div>
      <div style={{ fontSize: 13, color: '#6B6B66', marginBottom: 14 }}>
        Phí sẽ bị soft delete (set is_active=false). Có thể khôi phục thủ công qua DB.
      </div>

      {seedWarning && (
        <div style={{
          padding: '12px 14px', borderRadius: 8,
          background: '#FEF2F2', border: '1px solid #FCA5A5',
          fontSize: 12, color: '#991B1B', marginBottom: 14,
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            <strong>Đây là phí mặc định Shopee</strong> (category={fee.category}). Xóa có thể phá calculator của user. Cân nhắc kỹ trước khi confirm.
          </span>
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <FieldLabel required>Lý do xóa</FieldLabel>
        <textarea value={reason} rows={2}
          onChange={e => { setReason(e.target.value); setErrors(p => ({ ...p, reason: '' })) }}
          placeholder="VD: Shopee bỏ chương trình này từ Q3/2026"
          style={{ ...inputStyle(!!errors.reason), resize: 'vertical', fontFamily: 'inherit' }} />
        {errors.reason && <ErrorText>{errors.reason}</ErrorText>}
      </div>

      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 18, fontSize: 13, color: '#1A1A1A', cursor: 'pointer' }}>
        <input type="checkbox" checked={confirmed}
          onChange={e => { setConfirmed(e.target.checked); setErrors(p => ({ ...p, confirmed: '' })) }}
          style={{ marginTop: 2, accentColor: '#A82928' }} />
        <span>Tôi hiểu hành động này và muốn xóa phí <strong>{fee.fee_label}</strong>.</span>
      </label>
      {errors.confirmed && <ErrorText>{errors.confirmed}</ErrorText>}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <SecondaryButton onClick={onClose} disabled={saving}>Hủy</SecondaryButton>
        <PrimaryButton onClick={handle} loading={saving} danger disabled={!confirmed}>
          Xác nhận xóa
        </PrimaryButton>
      </div>
    </DialogShell>
  )
}

// ── Main page ───────────────────────────────────────────────────────

type StatusFilter = 'all' | 'active' | 'inactive'

export function AdminFeesPage() {
  const [tab, setTab] = useState<'fees' | 'categories'>('fees')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [fees, setFees] = useState<DefaultFee[]>([])
  const [categoryFees, setCategoryFees] = useState<CategoryFee[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editTarget, setEditTarget] = useState<DefaultFee | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DefaultFee | null>(null)
  const [toast, setToast] = useState<ToastState>(null)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  const load = async () => {
    setLoading(true)
    const [defaults, cats] = await Promise.all([
      listDefaultFees(true),
      listCategoryFees(true),
    ])
    setFees(defaults)
    setCategoryFees(cats)
    setLoading(false)
  }

  const reloadCategories = async () => {
    const cats = await listCategoryFees(true)
    setCategoryFees(cats)
  }

  useEffect(() => { load() }, [])

  const activeCategoryCount = useMemo(
    () => categoryFees.filter(c => c.is_active).length, [categoryFees]
  )

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return fees
    if (statusFilter === 'active') return fees.filter(f => f.is_active)
    return fees.filter(f => !f.is_active)
  }, [fees, statusFilter])

  const activeCount = useMemo(() => fees.filter(f => f.is_active).length, [fees])
  const inactiveCount = useMemo(() => fees.filter(f => !f.is_active).length, [fees])

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1240 }}>
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{
          margin: 0, fontSize: 22, fontWeight: 600, color: '#1A1A1A',
          textTransform: 'uppercase', letterSpacing: '0.02em',
        }}>
          Quản lý phí Shopee
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B6B66' }}>
          Cấu hình các loại phí mặc định + ngành hàng. Mọi thay đổi giá đều log audit.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, borderBottom: '1px solid #EFEAE0' }}>
        <TabButton active={tab === 'fees'} onClick={() => setTab('fees')}>
          Phí chung ({activeCount})
        </TabButton>
        <TabButton active={tab === 'categories'} onClick={() => setTab('categories')}>
          Phí ngành hàng ({activeCategoryCount})
        </TabButton>
      </div>

      {tab === 'fees' && (
        <>
          {/* Action row */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            gap: 12, marginBottom: 14, flexWrap: 'wrap',
          }}>
            <button onClick={() => setShowAdd(true)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8, border: 'none',
              background: '#1D9E75', color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <Plus size={14} /> Thêm phí mới
            </button>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '0 12px', borderRadius: 8,
              border: '1px solid #EFEAE0', background: '#fff', height: 36,
            }}>
              <Filter size={13} color="#8A8A82" />
              <select value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                style={{
                  border: 'none', background: 'transparent', outline: 'none',
                  fontSize: 13, color: '#1A1A1A', fontFamily: 'inherit', cursor: 'pointer',
                }}>
                <option value="all">Tất cả ({fees.length})</option>
                <option value="active">Active ({activeCount})</option>
                <option value="inactive">Đã xóa ({inactiveCount})</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <Card>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(180px, 1.2fr) 100px 80px minmax(220px, 1.6fr) 70px 90px 110px',
              gap: 14, alignItems: 'center',
              padding: '11px 18px', background: '#FAFAF7',
              borderBottom: '1px solid #EFEAE0',
              fontSize: 11, fontWeight: 600, color: '#8A8A82',
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              <span>Tên phí</span>
              <span>Giá trị</span>
              <span>Đơn vị</span>
              <span>Mô tả</span>
              <span>Thứ tự</span>
              <span>Cập nhật</span>
              <span style={{ textAlign: 'right' }}>Action</span>
            </div>

            {loading ? (
              <div style={{ padding: 60, textAlign: 'center' }}>
                <Loader2 size={24} color="#F5B81C" style={{ animation: 'spin 0.7s linear infinite' }} />
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 56, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                <div style={{ fontSize: 14, color: '#6B6B66' }}>Không có phí nào trong bộ lọc.</div>
              </div>
            ) : (
              filtered.map(fee => (
                <FeeRow key={fee.id} fee={fee}
                  onEdit={() => setEditTarget(fee)}
                  onDelete={() => setDeleteTarget(fee)} />
              ))
            )}
          </Card>
        </>
      )}

      {tab === 'categories' && (
        <CategoryTab
          categoryFees={categoryFees}
          loading={loading}
          showToast={showToast}
          reload={reloadCategories}
        />
      )}

      {/* Dialogs */}
      {showAdd && (
        <AddFeeDialog
          onClose={() => setShowAdd(false)}
          onSuccess={msg => { setShowAdd(false); showToast('success', msg); load() }}
          onError={msg => showToast('error', msg)}
        />
      )}
      {editTarget && (
        <EditFeeDialog fee={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={msg => { setEditTarget(null); showToast('success', msg); load() }}
          onError={msg => showToast('error', msg)}
        />
      )}
      {deleteTarget && (
        <DeleteFeeDialog fee={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onSuccess={msg => { setDeleteTarget(null); showToast('success', msg); load() }}
          onError={msg => showToast('error', msg)}
        />
      )}

      <Toast toast={toast} />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}

function TabButton({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: ReactNode
}) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 16px', borderRadius: '8px 8px 0 0',
      background: 'transparent', border: 'none',
      borderBottom: `2px solid ${active ? '#E24B4A' : 'transparent'}`,
      color: active ? '#1A1A1A' : '#8A8A82',
      fontSize: 13, fontWeight: active ? 600 : 500,
      cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1,
    }}>{children}</button>
  )
}

function FeeRow({ fee, onEdit, onDelete }: {
  fee: DefaultFee
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(180px, 1.2fr) 100px 80px minmax(220px, 1.6fr) 70px 90px 110px',
      gap: 14, alignItems: 'center',
      padding: '11px 18px', borderBottom: '1px solid #F5F2EA',
      opacity: fee.is_active ? 1 : 0.55,
    }}>
      <div style={{ fontSize: 13, color: '#1A1A1A', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {fee.fee_label}
        <div style={{ fontSize: 11, color: '#A8A89E', fontFamily: 'monospace' }}>{fee.fee_key}</div>
      </div>
      <div style={{ fontSize: 13, color: '#1A1A1A', fontVariantNumeric: 'tabular-nums' }}>
        {formatValue(fee.fee_value, fee.fee_unit)}
      </div>
      <div style={{ fontSize: 12, color: '#6B6B66' }}>
        {fee.fee_unit === 'percent' ? '%' : 'VND'}
      </div>
      <div style={{
        fontSize: 12, color: '#6B6B66',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {fee.description ?? <span style={{ color: '#A8A89E' }}>—</span>}
      </div>
      <div style={{ fontSize: 12, color: '#6B6B66', textAlign: 'center' }}>
        {fee.display_order ?? '—'}
      </div>
      <div style={{ fontSize: 12, color: '#A8A89E' }}>
        {formatDate(fee.updated_at)}
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button onClick={onEdit} title="Sửa" disabled={!fee.is_active} style={{
          padding: 6, borderRadius: 6, border: '1px solid #EFEAE0',
          background: '#fff', cursor: fee.is_active ? 'pointer' : 'not-allowed',
          color: '#1A1A1A', display: 'flex', alignItems: 'center',
          opacity: fee.is_active ? 1 : 0.4,
        }}>
          <Pencil size={13} />
        </button>
        <button onClick={onDelete} title="Xóa" disabled={!fee.is_active} style={{
          padding: 6, borderRadius: 6, border: '1px solid #FCA5A5',
          background: '#FEF2F2', cursor: fee.is_active ? 'pointer' : 'not-allowed',
          color: '#A82928', display: 'flex', alignItems: 'center',
          opacity: fee.is_active ? 1 : 0.4,
        }}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// CATEGORY TAB (Tab 2)
// ════════════════════════════════════════════════════════════════════

interface CategoryTabProps {
  categoryFees: CategoryFee[]
  loading: boolean
  showToast: (type: 'success' | 'error', message: string) => void
  reload: () => Promise<void>
}

function CategoryTab({ categoryFees, loading, showToast, reload }: CategoryTabProps) {
  const [shopType, setShopType] = useState<ShopTypeFilter>('mall')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [showAdd, setShowAdd] = useState(false)
  const [editTarget, setEditTarget] = useState<CategoryFee | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CategoryFee | null>(null)
  const [showImport, setShowImport] = useState(false)

  // M6.9.2 — filter theo shopType trước, rồi mới theo status.
  const byShopType = useMemo(
    () => categoryFees.filter(c => c.shop_type === shopType),
    [categoryFees, shopType]
  )

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return byShopType
    if (statusFilter === 'active') return byShopType.filter(c => c.is_active)
    return byShopType.filter(c => !c.is_active)
  }, [byShopType, statusFilter])

  const activeCount = useMemo(() => byShopType.filter(c => c.is_active).length, [byShopType])
  const inactiveCount = useMemo(() => byShopType.filter(c => !c.is_active).length, [byShopType])

  const mallActiveCount = useMemo(
    () => categoryFees.filter(c => c.shop_type === 'mall' && c.is_active).length, [categoryFees]
  )
  const normalActiveCount = useMemo(
    () => categoryFees.filter(c => c.shop_type === 'normal' && c.is_active).length, [categoryFees]
  )

  return (
    <>
      {/* M6.9.2 — Sub-tab Mall/Normal */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 14,
        padding: 4, background: '#FAFAF7', borderRadius: 10,
        border: '1px solid #EFEAE0', width: 'fit-content',
      }}>
        <SubTabButton active={shopType === 'mall'} onClick={() => setShopType('mall')}>
          🏬 Shop Mall ({mallActiveCount})
        </SubTabButton>
        <SubTabButton active={shopType === 'normal'} onClick={() => setShopType('normal')}>
          🏪 Shop thường ({normalActiveCount})
        </SubTabButton>
      </div>

      {/* Action row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: 12, marginBottom: 14, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => setShowAdd(true)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8, border: 'none',
            background: '#1D9E75', color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <Plus size={14} /> Thêm ngành mới
          </button>
          <button onClick={() => setShowImport(true)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8,
            border: '1px solid #EFEAE0', background: '#fff',
            fontSize: 13, fontWeight: 500, color: '#1A1A1A',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <Upload size={14} /> Import từ Excel
          </button>
          <button onClick={() => downloadSampleExcel()} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8,
            border: '1px solid #EFEAE0', background: '#fff',
            fontSize: 13, fontWeight: 500, color: '#1A1A1A',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <Download size={14} /> Tải file mẫu
          </button>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '0 12px', borderRadius: 8,
          border: '1px solid #EFEAE0', background: '#fff', height: 36,
        }}>
          <Filter size={13} color="#8A8A82" />
          <select value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as StatusFilter)}
            style={{
              border: 'none', background: 'transparent', outline: 'none',
              fontSize: 13, color: '#1A1A1A', fontFamily: 'inherit', cursor: 'pointer',
            }}>
            <option value="all">Tất cả ({categoryFees.length})</option>
            <option value="active">Active ({activeCount})</option>
            <option value="inactive">Đã xóa ({inactiveCount})</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <Card>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(160px, 1fr) 100px 80px minmax(220px, 2fr) 90px 110px',
          gap: 14, alignItems: 'center',
          padding: '11px 18px', background: '#FAFAF7',
          borderBottom: '1px solid #EFEAE0',
          fontSize: 11, fontWeight: 600, color: '#8A8A82',
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          <span>Tên ngành</span>
          <span>Phí</span>
          <span>Đơn vị</span>
          <span>Mô tả</span>
          <span>Cập nhật</span>
          <span style={{ textAlign: 'right' }}>Action</span>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <Loader2 size={24} color="#F5B81C" style={{ animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 56, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            <div style={{ fontSize: 14, color: '#6B6B66' }}>Không có ngành nào trong bộ lọc.</div>
          </div>
        ) : (
          filtered.map(c => (
            <CategoryRow key={c.id} category={c}
              onEdit={() => setEditTarget(c)}
              onDelete={() => setDeleteTarget(c)} />
          ))
        )}
      </Card>

      {/* Dialogs */}
      {showAdd && (
        <AddCategoryDialog
          shopType={shopType}
          onClose={() => setShowAdd(false)}
          onSuccess={msg => { setShowAdd(false); showToast('success', msg); reload() }}
          onError={msg => showToast('error', msg)}
        />
      )}
      {editTarget && (
        <EditCategoryDialog category={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={msg => { setEditTarget(null); showToast('success', msg); reload() }}
          onError={msg => showToast('error', msg)}
        />
      )}
      {deleteTarget && (
        <DeleteCategoryDialog category={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onSuccess={msg => { setDeleteTarget(null); showToast('success', msg); reload() }}
          onError={msg => showToast('error', msg)}
        />
      )}
      {showImport && (
        <CategoryImportDialog
          shopType={shopType}
          onClose={() => setShowImport(false)}
          onSuccess={result => {
            setShowImport(false)
            showToast('success', `Import thành công: cập nhật ${result.updated}, thêm mới ${result.imported}`)
            reload()
          }}
          onError={msg => showToast('error', msg)}
        />
      )}
    </>
  )
}

function SubTabButton({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: ReactNode
}) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 14px', borderRadius: 8, border: 'none',
      background: active ? '#fff' : 'transparent',
      color: active ? '#1A1A1A' : '#6B6B66',
      fontSize: 12, fontWeight: active ? 600 : 500,
      cursor: 'pointer', fontFamily: 'inherit',
      boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
    }}>{children}</button>
  )
}

function CategoryRow({ category, onEdit, onDelete }: {
  category: CategoryFee
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(160px, 1fr) 100px 80px minmax(220px, 2fr) 90px 110px',
      gap: 14, alignItems: 'center',
      padding: '11px 18px', borderBottom: '1px solid #F5F2EA',
      opacity: category.is_active ? 1 : 0.55,
    }}>
      <div style={{ fontSize: 13, color: '#1A1A1A', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {category.category_name}
      </div>
      <div style={{ fontSize: 13, color: '#1A1A1A', fontVariantNumeric: 'tabular-nums' }}>
        {formatValue(category.fee_value, category.fee_unit)}
      </div>
      <div style={{ fontSize: 12, color: '#6B6B66' }}>
        {category.fee_unit === 'percent' ? '%' : 'VND'}
      </div>
      <div style={{
        fontSize: 12, color: '#6B6B66',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {category.description ?? <span style={{ color: '#A8A89E' }}>—</span>}
      </div>
      <div style={{ fontSize: 12, color: '#A8A89E' }}>
        {formatDate(category.updated_at)}
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button onClick={onEdit} title="Sửa" disabled={!category.is_active} style={{
          padding: 6, borderRadius: 6, border: '1px solid #EFEAE0',
          background: '#fff', cursor: category.is_active ? 'pointer' : 'not-allowed',
          color: '#1A1A1A', display: 'flex', alignItems: 'center',
          opacity: category.is_active ? 1 : 0.4,
        }}>
          <Pencil size={13} />
        </button>
        <button onClick={onDelete} title="Xóa" disabled={!category.is_active} style={{
          padding: 6, borderRadius: 6, border: '1px solid #FCA5A5',
          background: '#FEF2F2', cursor: category.is_active ? 'pointer' : 'not-allowed',
          color: '#A82928', display: 'flex', alignItems: 'center',
          opacity: category.is_active ? 1 : 0.4,
        }}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Add category dialog ─────────────────────────────────────────────

function AddCategoryDialog({ shopType, onClose, onSuccess, onError }: {
  shopType: ShopTypeFilter
  onClose: () => void
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
}) {
  const [form, setForm] = useState({
    category_name: '', fee_value: '', fee_unit: 'percent' as FeeUnit, description: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    const errs: Record<string, string> = {}
    if (!form.category_name.trim()) errs.category_name = 'Tên ngành không được rỗng'
    const value = parseFloat(form.fee_value)
    if (form.fee_value === '' || isNaN(value)) errs.fee_value = 'Giá trị phải là số'
    else if (value < 0) errs.fee_value = 'Phí không thể âm'
    else if (form.fee_unit === 'percent' && value > 100) errs.fee_value = 'Phí % không vượt 100'
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    setSaving(true)
    const { error } = await createCategoryFee({
      category_name: form.category_name.trim(),
      fee_value: value,
      fee_unit: form.fee_unit,
      description: form.description.trim() || null,
      shop_type: shopType,
    })
    setSaving(false)
    if (error) {
      onError(error)
      return
    }
    onSuccess(`Đã thêm ngành mới vào ${shopType === 'mall' ? 'Shop Mall' : 'Shop thường'}`)
  }

  const shopTypeLabel = shopType === 'mall' ? 'Shop Mall' : 'Shop thường'
  return (
    <DialogShell onClose={onClose}>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#1A1A1A', marginBottom: 6 }}>
        Thêm ngành hàng mới
      </div>
      <div style={{ fontSize: 12, color: '#6B6B66', marginBottom: 16 }}>
        Sẽ được thêm vào <strong>{shopTypeLabel}</strong>. Đổi sub-tab nếu muốn thêm vào loại khác.
      </div>
      <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
        <div style={{ marginBottom: 12 }}>
          <FieldLabel required>Tên ngành</FieldLabel>
          <input type="text" value={form.category_name}
            onChange={e => { setForm(f => ({ ...f, category_name: e.target.value })); setErrors(p => ({ ...p, category_name: '' })) }}
            placeholder="VD: Sách báo" style={inputStyle(!!errors.category_name)} />
          {errors.category_name && <ErrorText>{errors.category_name}</ErrorText>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 12, marginBottom: 12 }}>
          <div>
            <FieldLabel required>Phí</FieldLabel>
            <input type="number" step="0.01" value={form.fee_value}
              onChange={e => { setForm(f => ({ ...f, fee_value: e.target.value })); setErrors(p => ({ ...p, fee_value: '' })) }}
              style={inputStyle(!!errors.fee_value)} />
            {errors.fee_value && <ErrorText>{errors.fee_value}</ErrorText>}
          </div>
          <div>
            <FieldLabel required>Đơn vị</FieldLabel>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {(['percent', 'vnd'] as const).map(u => (
                <label key={u} style={{
                  flex: 1, padding: '8px 10px', borderRadius: 7,
                  border: `1.5px solid ${form.fee_unit === u ? '#1D9E75' : '#EFEAE0'}`,
                  background: form.fee_unit === u ? '#DCFCE7' : '#FAFAF7',
                  cursor: 'pointer', fontSize: 12, textAlign: 'center', fontWeight: 500,
                }}>
                  <input type="radio" checked={form.fee_unit === u}
                    onChange={() => setForm(f => ({ ...f, fee_unit: u }))} style={{ display: 'none' }} />
                  {u === 'percent' ? '%' : 'VND'}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <FieldLabel>Mô tả</FieldLabel>
          <textarea value={form.description} rows={2}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Mô tả ngành hàng (tùy chọn)..."
            style={{ ...inputStyle(false), resize: 'vertical', fontFamily: 'inherit' }} />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <SecondaryButton onClick={onClose} disabled={saving}>Hủy</SecondaryButton>
          <PrimaryButton onClick={handleSubmit} loading={saving}>Tạo ngành</PrimaryButton>
        </div>
      </form>
    </DialogShell>
  )
}

// ── Edit category dialog ────────────────────────────────────────────

function EditCategoryDialog({ category, onClose, onSuccess, onError }: {
  category: CategoryFee
  onClose: () => void
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
}) {
  const [form, setForm] = useState({
    category_name: category.category_name,
    fee_value: String(category.fee_value),
    fee_unit: category.fee_unit,
    description: category.description ?? '',
    display_order: String(category.display_order ?? 0),
  })
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const valueChanged = parseFloat(form.fee_value) !== category.fee_value
  const unitChanged = form.fee_unit !== category.fee_unit
  const valueOrUnitChanged = valueChanged || unitChanged

  const handleSubmit = async () => {
    const errs: Record<string, string> = {}
    if (!form.category_name.trim()) errs.category_name = 'Tên ngành không được rỗng'
    const value = parseFloat(form.fee_value)
    if (form.fee_value === '' || isNaN(value)) errs.fee_value = 'Giá trị phải là số'
    else if (value < 0) errs.fee_value = 'Phí không thể âm'
    else if (form.fee_unit === 'percent' && value > 100) errs.fee_value = 'Phí % không vượt 100'
    if (valueOrUnitChanged && !reason.trim()) {
      errs.reason = 'Lý do thay đổi bắt buộc khi sửa giá trị'
    }
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    const changes: Parameters<typeof updateCategoryFee>[1] = {}
    if (form.category_name.trim() !== category.category_name) changes.category_name = form.category_name.trim()
    if (value !== category.fee_value) changes.fee_value = value
    if (form.fee_unit !== category.fee_unit) changes.fee_unit = form.fee_unit
    const descTrim = form.description.trim()
    const oldDesc = category.description ?? ''
    if (descTrim !== oldDesc) changes.description = descTrim || null
    const newOrder = parseInt(form.display_order, 10)
    if (!isNaN(newOrder) && newOrder !== (category.display_order ?? 0)) changes.display_order = newOrder

    if (Object.keys(changes).length === 0) {
      onClose()
      return
    }

    setSaving(true)
    const { data, error } = await updateCategoryFee(
      category.id,
      changes,
      reason.trim() || 'Cập nhật metadata',
    )
    setSaving(false)
    if (error) {
      onError(error)
      return
    }
    onSuccess(`Đã cập nhật, ${data?.changed_count ?? 0} field thay đổi`)
  }

  return (
    <DialogShell onClose={onClose}>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#1A1A1A', marginBottom: 16 }}>
        Sửa ngành: {category.category_name}
      </div>
      <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
        <div style={{ marginBottom: 12 }}>
          <FieldLabel required>Tên ngành</FieldLabel>
          <input type="text" value={form.category_name}
            onChange={e => { setForm(f => ({ ...f, category_name: e.target.value })); setErrors(p => ({ ...p, category_name: '' })) }}
            style={inputStyle(!!errors.category_name)} />
          {errors.category_name && <ErrorText>{errors.category_name}</ErrorText>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 12, marginBottom: 12 }}>
          <div>
            <FieldLabel required>Phí</FieldLabel>
            <input type="number" step="0.01" value={form.fee_value}
              onChange={e => { setForm(f => ({ ...f, fee_value: e.target.value })); setErrors(p => ({ ...p, fee_value: '' })) }}
              style={inputStyle(!!errors.fee_value)} />
            {errors.fee_value && <ErrorText>{errors.fee_value}</ErrorText>}
          </div>
          <div>
            <FieldLabel required>Đơn vị</FieldLabel>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {(['percent', 'vnd'] as const).map(u => (
                <label key={u} style={{
                  flex: 1, padding: '8px 10px', borderRadius: 7,
                  border: `1.5px solid ${form.fee_unit === u ? '#1D9E75' : '#EFEAE0'}`,
                  background: form.fee_unit === u ? '#DCFCE7' : '#FAFAF7',
                  cursor: 'pointer', fontSize: 12, textAlign: 'center', fontWeight: 500,
                }}>
                  <input type="radio" checked={form.fee_unit === u}
                    onChange={() => setForm(f => ({ ...f, fee_unit: u }))} style={{ display: 'none' }} />
                  {u === 'percent' ? '%' : 'VND'}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <FieldLabel>Mô tả</FieldLabel>
          <textarea value={form.description} rows={2}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            style={{ ...inputStyle(false), resize: 'vertical', fontFamily: 'inherit' }} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <FieldLabel>Thứ tự hiển thị</FieldLabel>
          <input type="number" value={form.display_order}
            onChange={e => setForm(f => ({ ...f, display_order: e.target.value }))}
            style={inputStyle(false)} />
        </div>

        <div style={{ marginBottom: 18 }}>
          <FieldLabel required={valueOrUnitChanged}>
            Lý do thay đổi {valueOrUnitChanged ? '(bắt buộc khi sửa giá/đơn vị)' : '(tùy chọn)'}
          </FieldLabel>
          <textarea value={reason} rows={2}
            onChange={e => { setReason(e.target.value); setErrors(p => ({ ...p, reason: '' })) }}
            placeholder="VD: Shopee tăng phí ngành thời trang từ Q3"
            style={{ ...inputStyle(!!errors.reason), resize: 'vertical', fontFamily: 'inherit' }} />
          {errors.reason && <ErrorText>{errors.reason}</ErrorText>}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <SecondaryButton onClick={onClose} disabled={saving}>Hủy</SecondaryButton>
          <PrimaryButton onClick={handleSubmit} loading={saving}>Lưu thay đổi</PrimaryButton>
        </div>
      </form>
    </DialogShell>
  )
}

// ── Delete category dialog ──────────────────────────────────────────

function DeleteCategoryDialog({ category, onClose, onSuccess, onError }: {
  category: CategoryFee
  onClose: () => void
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
}) {
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const handle = async () => {
    const errs: Record<string, string> = {}
    if (!reason.trim()) errs.reason = 'Lý do xóa bắt buộc'
    if (!confirmed) errs.confirmed = 'Vui lòng xác nhận'
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setSaving(true)
    const { error } = await softDeleteCategoryFee(category.id, reason.trim())
    setSaving(false)
    if (error) {
      onError(error)
      return
    }
    onSuccess('Đã xóa ngành')
  }

  return (
    <DialogShell onClose={onClose}>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#1A1A1A', marginBottom: 6 }}>
        Xóa ngành: {category.category_name}
      </div>
      <div style={{ fontSize: 13, color: '#6B6B66', marginBottom: 14 }}>
        Ngành sẽ bị soft delete (set is_active=false). User của calculator sẽ không thấy ngành này nữa.
      </div>

      <div style={{
        padding: '12px 14px', borderRadius: 8,
        background: '#FEF2F2', border: '1px solid #FCA5A5',
        fontSize: 12, color: '#991B1B', marginBottom: 14,
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          User đang dùng <strong>{category.category_name}</strong> trong calculator có thể bị mất default rate. Cân nhắc kỹ.
        </span>
      </div>

      <div style={{ marginBottom: 12 }}>
        <FieldLabel required>Lý do xóa</FieldLabel>
        <textarea value={reason} rows={2}
          onChange={e => { setReason(e.target.value); setErrors(p => ({ ...p, reason: '' })) }}
          placeholder="VD: Ngành không còn áp dụng từ tháng 6/2026"
          style={{ ...inputStyle(!!errors.reason), resize: 'vertical', fontFamily: 'inherit' }} />
        {errors.reason && <ErrorText>{errors.reason}</ErrorText>}
      </div>

      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 18, fontSize: 13, color: '#1A1A1A', cursor: 'pointer' }}>
        <input type="checkbox" checked={confirmed}
          onChange={e => { setConfirmed(e.target.checked); setErrors(p => ({ ...p, confirmed: '' })) }}
          style={{ marginTop: 2, accentColor: '#A82928' }} />
        <span>Tôi hiểu hành động này và muốn xóa ngành <strong>{category.category_name}</strong>.</span>
      </label>
      {errors.confirmed && <ErrorText>{errors.confirmed}</ErrorText>}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <SecondaryButton onClick={onClose} disabled={saving}>Hủy</SecondaryButton>
        <PrimaryButton onClick={handle} loading={saving} danger disabled={!confirmed}>
          Xác nhận xóa
        </PrimaryButton>
      </div>
    </DialogShell>
  )
}
