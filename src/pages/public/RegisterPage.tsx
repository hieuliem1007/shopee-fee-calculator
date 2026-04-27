import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'

const schema = z.object({
  full_name: z.string().min(2, 'Vui lòng nhập họ tên (ít nhất 2 ký tự)'),
  phone: z.string()
    .min(9, 'Số điện thoại không hợp lệ')
    .regex(/^[0-9+\s-]+$/, 'Số điện thoại chỉ chứa chữ số'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu ít nhất 8 ký tự'),
  accept_terms: z.boolean().refine(v => v === true, 'Vui lòng đồng ý điều khoản'),
})
type FormData = z.infer<typeof schema>

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: 8,
  border: '1.5px solid #EFEAE0', background: '#FAFAF7',
  fontSize: 14, color: '#1A1A1A', outline: 'none',
  fontFamily: 'inherit', transition: 'border-color 0.15s',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500,
  color: '#1A1A1A', marginBottom: 6,
}
const errStyle: React.CSSProperties = { fontSize: 12, color: '#A82928', marginTop: 5 }

export function RegisterPage() {
  const navigate = useNavigate()
  const [showPw, setShowPw] = useState(false)
  const [serverError, setServerError] = useState('')
  const [done, setDone] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { accept_terms: false },
  })

  const onSubmit = async (data: FormData) => {
    setServerError('')

    // 1. Create auth user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })

    if (signUpError) {
      if (signUpError.message.toLowerCase().includes('already registered')) {
        setServerError('Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.')
      } else {
        setServerError(signUpError.message)
      }
      return
    }

    const userId = authData.user?.id
    if (!userId) { setServerError('Đã có lỗi xảy ra. Vui lòng thử lại.'); return }

    // 2. Create profile with status='pending'
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      full_name: data.full_name,
      phone: data.phone,
      email: data.email,
      status: 'pending',
    })

    if (profileError) {
      // Profile already exists edge case
      if (!profileError.message.includes('duplicate')) {
        setServerError('Không thể tạo hồ sơ: ' + profileError.message)
        return
      }
    }

    setDone(true)
  }

  if (done) {
    return (
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{
          background: '#fff', border: '1px solid #EFEAE0', borderRadius: 16,
          padding: '36px 32px', textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.05)',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: '#E1F5EE', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <CheckCircle size={28} color="#1D9E75" />
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#1A1A1A', marginBottom: 8 }}>
            Đăng ký thành công!
          </div>
          <div style={{ fontSize: 14, color: '#6B6B66', lineHeight: 1.6, marginBottom: 24 }}>
            Yêu cầu của bạn đã được tiếp nhận. Vui lòng liên hệ qua Zalo để được tư vấn
            và kích hoạt tài khoản.
          </div>
          <a
            href="https://zalo.me/0000000000"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '11px 24px', borderRadius: 8,
              background: '#F5B81C', color: '#1A1A1A',
              border: 'none', fontSize: 14, fontWeight: 600,
              textDecoration: 'none', cursor: 'pointer',
              boxShadow: '0 1px 0 rgba(255,255,255,0.4) inset, 0 2px 6px rgba(245,184,28,0.3)',
            }}
          >
            Liên hệ qua Zalo
          </a>
          <div style={{ marginTop: 16 }}>
            <button onClick={() => navigate('/locked')} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: '#6B6B66', fontFamily: 'inherit',
            }}>
              Hoặc xem trạng thái tài khoản →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', maxWidth: 420 }}>
      <div style={{
        background: '#fff', border: '1px solid #EFEAE0', borderRadius: 16,
        padding: '36px 32px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.05)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 600, color: '#1A1A1A', marginBottom: 6 }}>
            Tạo tài khoản
          </div>
          <div style={{ fontSize: 13, color: '#6B6B66' }}>
            Điền thông tin để đăng ký E-Dream Tools
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Họ và tên</label>
              <input {...register('full_name')} placeholder="Nguyễn Văn A" style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#1A1A1A')}
                onBlur={e => (e.target.style.borderColor = '#EFEAE0')} />
              {errors.full_name && <div style={errStyle}>{errors.full_name.message}</div>}
            </div>
            <div>
              <label style={labelStyle}>Số điện thoại</label>
              <input {...register('phone')} placeholder="0901234567" inputMode="tel" style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#1A1A1A')}
                onBlur={e => (e.target.style.borderColor = '#EFEAE0')} />
              {errors.phone && <div style={errStyle}>{errors.phone.message}</div>}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Email</label>
            <input {...register('email')} type="email" placeholder="ban@email.com" autoComplete="email" style={inputStyle}
              onFocus={e => (e.target.style.borderColor = '#1A1A1A')}
              onBlur={e => (e.target.style.borderColor = '#EFEAE0')} />
            {errors.email && <div style={errStyle}>{errors.email.message}</div>}
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Mật khẩu</label>
            <div style={{ position: 'relative' }}>
              <input {...register('password')} type={showPw ? 'text' : 'password'} placeholder="Ít nhất 8 ký tự"
                autoComplete="new-password"
                style={{ ...inputStyle, paddingRight: 44 }}
                onFocus={e => (e.target.style.borderColor = '#1A1A1A')}
                onBlur={e => (e.target.style.borderColor = '#EFEAE0')} />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: '#8A8A82',
                display: 'flex', alignItems: 'center',
              }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <div style={errStyle}>{errors.password.message}</div>}
          </div>

          <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <input {...register('accept_terms')} type="checkbox" id="terms" style={{ marginTop: 2, accentColor: '#F5B81C', flexShrink: 0 }} />
            <label htmlFor="terms" style={{ fontSize: 13, color: '#6B6B66', cursor: 'pointer', lineHeight: 1.5 }}>
              Tôi đồng ý với{' '}
              <Link to="/terms" target="_blank" style={{ color: '#A47408' }}>Điều khoản sử dụng</Link>
              {' '}và{' '}
              <Link to="/privacy" target="_blank" style={{ color: '#A47408' }}>Chính sách bảo mật</Link>
            </label>
          </div>
          {errors.accept_terms && <div style={{ ...errStyle, marginTop: -14, marginBottom: 14 }}>{errors.accept_terms.message}</div>}

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
            {isSubmitting && <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} />}
            {isSubmitting ? 'Đang xử lý…' : 'Đăng ký'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#6B6B66' }}>
          Đã có tài khoản?{' '}
          <Link to="/login" style={{ color: '#A47408', fontWeight: 600, textDecoration: 'none' }}>
            Đăng nhập
          </Link>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
