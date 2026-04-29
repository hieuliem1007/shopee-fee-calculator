// Change password card — verify current password bằng signInWithPassword
// (Supabase không có RPC verify riêng), sau đó updateUser mật khẩu mới.
//
// Render trong UserProfilePage. Style tương đồng các card khác trong page
// (Card padding 24, border #EFEAE0, SectionTitle uppercase letter-spacing).

import { useState, type ReactNode } from 'react'
import { Lock, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Props {
  email: string
  onShowToast: (type: 'success' | 'error', message: string) => void
}

interface Errors {
  current?: string
  next?: string
  confirm?: string
}

const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width: '100%', maxWidth: 360, padding: '8px 10px', borderRadius: 7,
  border: `1.5px solid ${hasError ? '#FCA5A5' : '#EFEAE0'}`,
  background: '#FAFAF7', fontSize: 13, color: '#1A1A1A',
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
})

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '160px 1fr',
      gap: 16, alignItems: 'flex-start',
      padding: '11px 0', borderBottom: '1px solid #F5F2EA',
    }}>
      <div style={{ fontSize: 12, color: '#6B6B66', fontWeight: 500, paddingTop: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: '#1A1A1A' }}>{children}</div>
    </div>
  )
}

export function ChangePasswordCard({ email, onShowToast }: Props) {
  const [currentPassword, setCurrent] = useState('')
  const [newPassword, setNext] = useState('')
  const [confirmPassword, setConfirm] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [loading, setLoading] = useState(false)

  const validate = (): Errors => {
    const e: Errors = {}
    if (!currentPassword) e.current = 'Vui lòng nhập mật khẩu hiện tại'
    if (!newPassword) e.next = 'Vui lòng nhập mật khẩu mới'
    else if (newPassword.length < 8) e.next = 'Mật khẩu mới tối thiểu 8 ký tự'
    else if (newPassword === currentPassword) e.next = 'Mật khẩu mới phải khác mật khẩu hiện tại'
    if (!confirmPassword) e.confirm = 'Vui lòng xác nhận mật khẩu mới'
    else if (newPassword && confirmPassword !== newPassword) e.confirm = 'Xác nhận không khớp'
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length) return

    setLoading(true)

    // Step 1: verify current password.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email, password: currentPassword,
    })
    if (verifyError) {
      setLoading(false)
      onShowToast('error', 'Mật khẩu hiện tại không đúng')
      return
    }

    // Step 2: update password.
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    setLoading(false)
    if (updateError) {
      onShowToast('error', updateError.message || 'Không thể đổi mật khẩu, thử lại sau')
      return
    }

    onShowToast('success', 'Đã cập nhật mật khẩu')
    setCurrent('')
    setNext('')
    setConfirm('')
    setErrors({})
  }

  return (
    <div style={{
      background: '#fff', border: '1px solid #EFEAE0', borderRadius: 12,
      padding: 24, marginBottom: 18,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 600, color: '#8A8A82',
        letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14,
      }}>
        Đổi mật khẩu
      </div>

      <form onSubmit={handleSubmit}>
        <FieldRow label="Mật khẩu hiện tại">
          <input
            type="password" autoComplete="current-password"
            value={currentPassword}
            onChange={ev => { setCurrent(ev.target.value); setErrors(p => ({ ...p, current: undefined })) }}
            disabled={loading}
            style={inputStyle(!!errors.current)}
          />
          {errors.current && <ErrorLine msg={errors.current} />}
        </FieldRow>

        <FieldRow label="Mật khẩu mới">
          <input
            type="password" autoComplete="new-password"
            value={newPassword}
            onChange={ev => { setNext(ev.target.value); setErrors(p => ({ ...p, next: undefined })) }}
            disabled={loading}
            style={inputStyle(!!errors.next)}
          />
          {errors.next && <ErrorLine msg={errors.next} />}
          {!errors.next && (
            <div style={{ fontSize: 11, color: '#8A8A82', marginTop: 4 }}>Tối thiểu 8 ký tự.</div>
          )}
        </FieldRow>

        <FieldRow label="Xác nhận mật khẩu mới">
          <input
            type="password" autoComplete="new-password"
            value={confirmPassword}
            onChange={ev => { setConfirm(ev.target.value); setErrors(p => ({ ...p, confirm: undefined })) }}
            disabled={loading}
            style={inputStyle(!!errors.confirm)}
          />
          {errors.confirm && <ErrorLine msg={errors.confirm} />}
        </FieldRow>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
          <button type="submit" disabled={loading} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '9px 18px', borderRadius: 8, border: 'none',
            background: '#1D9E75', color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1, fontFamily: 'inherit',
          }}>
            {loading
              ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} />
              : <Lock size={14} />}
            Cập nhật mật khẩu
          </button>
        </div>
      </form>
    </div>
  )
}

function ErrorLine({ msg }: { msg: string }) {
  return <div style={{ fontSize: 11, color: '#A82928', marginTop: 4 }}>{msg}</div>
}
