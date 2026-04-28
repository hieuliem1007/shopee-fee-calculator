import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const schema = z.object({
  email: z.string().email('Email không hợp lệ'),
})
type FormData = z.infer<typeof schema>

const input: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: 8,
  border: '1.5px solid #EFEAE0', background: '#FAFAF7',
  fontSize: 14, color: '#1A1A1A', outline: 'none',
  fontFamily: 'inherit', transition: 'border-color 0.15s',
}
const label: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500,
  color: '#1A1A1A', marginBottom: 6,
}
const errStyle: React.CSSProperties = {
  fontSize: 12, color: '#A82928', marginTop: 5,
}

function mapError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('for security purposes')) {
    return 'Vui lòng đợi vài phút trước khi thử lại.'
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Đã gửi quá nhiều email, vui lòng đợi 1 giờ.'
  }
  return 'Có lỗi xảy ra, vui lòng thử lại.'
}

export function ForgotPasswordPage() {
  const [success, setSuccess] = useState(false)
  const [sentEmail, setSentEmail] = useState('')
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setServerError('')
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: window.location.origin + '/reset-password',
    })
    if (error) {
      setServerError(mapError(error.message))
      return
    }
    setSentEmail(data.email)
    setSuccess(true)
  }

  return (
    <div style={{
      width: '100%', maxWidth: 400,
      background: '#fff', border: '1px solid #EFEAE0', borderRadius: 16,
      padding: '36px 32px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.05)',
    }}>
      {success ? (
        <SuccessView email={sentEmail} />
      ) : (
        <>
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <h1 style={{
              margin: 0, fontSize: 22, fontWeight: 700, color: '#1A1A1A',
              textTransform: 'uppercase', letterSpacing: '0.02em',
            }}>
              Quên mật khẩu?
            </h1>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: '#6B6B66', lineHeight: 1.6 }}>
              Nhập email tài khoản, chúng tôi sẽ gửi link đặt lại mật khẩu.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div style={{ marginBottom: 16 }}>
              <label style={label}>Email</label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="email@example.com"
                autoFocus
                style={input}
                onFocus={e => (e.target.style.borderColor = '#1A1A1A')}
                onBlur={e => (e.target.style.borderColor = '#EFEAE0')}
              />
              {errors.email && <div style={errStyle}>{errors.email.message}</div>}
            </div>

            {serverError && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, marginBottom: 16,
                background: '#FEF2F2', border: '1px solid #FCA5A5',
                fontSize: 13, color: '#991B1B',
              }}>{serverError}</div>
            )}

            <button type="submit" disabled={isSubmitting} style={{
              width: '100%', padding: '12px', borderRadius: 8,
              background: isSubmitting ? '#D4A017' : '#F5B81C',
              color: '#1A1A1A', border: 'none', fontSize: 14, fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: 'inherit',
              boxShadow: '0 1px 0 rgba(255,255,255,0.4) inset, 0 2px 6px rgba(245,184,28,0.3)',
            }}>
              {isSubmitting
                ? <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} />
                : <Mail size={16} />}
              {isSubmitting ? 'Đang gửi…' : 'Gửi link đặt lại mật khẩu'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 18 }}>
            <Link to="/login" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 13, color: '#6B6B66', textDecoration: 'none',
            }}>
              <ArrowLeft size={13} /> Quay lại đăng nhập
            </Link>
          </div>

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
      )}
    </div>
  )
}

function SuccessView({ email }: { email: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 18px',
      }}>
        <CheckCircle2 size={30} color="#1D9E75" />
      </div>
      <h1 style={{
        margin: 0, fontSize: 20, fontWeight: 700, color: '#1A1A1A',
        textTransform: 'uppercase', letterSpacing: '0.02em',
      }}>
        Đã gửi email
      </h1>
      <p style={{ margin: '10px 0 0', fontSize: 13, color: '#6B6B66', lineHeight: 1.7 }}>
        Chúng tôi đã gửi link đặt lại mật khẩu đến<br />
        <strong style={{ color: '#1A1A1A' }}>{email}</strong>
      </p>
      <p style={{ margin: '14px 0 22px', fontSize: 12, color: '#8A8A82', lineHeight: 1.6 }}>
        Vui lòng kiểm tra hộp thư (cả thư mục Spam). Link có hiệu lực trong khoảng 1 giờ.
      </p>
      <Link to="/login" style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '10px 20px', borderRadius: 8,
        background: '#fff', color: '#1A1A1A',
        border: '1px solid #EFEAE0', fontSize: 13, fontWeight: 500,
        textDecoration: 'none',
      }}>
        <ArrowLeft size={13} /> Quay lại đăng nhập
      </Link>
    </div>
  )
}
