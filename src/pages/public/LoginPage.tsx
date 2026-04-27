import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabase'
import { getProfile } from '@/lib/auth'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

const schema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
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

export function LoginPage() {
  const navigate = useNavigate()
  const [showPw, setShowPw] = useState(false)
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setServerError('')
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      if (error.message.toLowerCase().includes('invalid login')) {
        setServerError('Email hoặc mật khẩu không đúng.')
      } else {
        setServerError(error.message)
      }
      return
    }

    if (!authData.user) return

    const profile = await getProfile(authData.user.id)
    if (!profile) { setServerError('Không tìm thấy tài khoản.'); return }

    if (profile.status === 'active') {
      navigate(profile.is_admin ? '/admin' : '/app', { replace: true })
    } else {
      navigate('/locked', { replace: true })
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: 400 }}>
      <div style={{
        background: '#fff', border: '1px solid #EFEAE0', borderRadius: 16,
        padding: '36px 32px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.05)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 24, fontWeight: 600, color: '#1A1A1A', marginBottom: 6 }}>
            Đăng nhập
          </div>
          <div style={{ fontSize: 13, color: '#6B6B66' }}>
            Chào mừng trở lại E-Dream Tools
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ marginBottom: 18 }}>
            <label style={label}>Email</label>
            <input
              {...register('email')}
              type="email"
              placeholder="ban@email.com"
              autoComplete="email"
              style={input}
              onFocus={e => (e.target.style.borderColor = '#1A1A1A')}
              onBlur={e => (e.target.style.borderColor = '#EFEAE0')}
            />
            {errors.email && <div style={errStyle}>{errors.email.message}</div>}
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={label}>Mật khẩu</label>
            <div style={{ position: 'relative' }}>
              <input
                {...register('password')}
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{ ...input, paddingRight: 44 }}
                onFocus={e => (e.target.style.borderColor = '#1A1A1A')}
                onBlur={e => (e.target.style.borderColor = '#EFEAE0')}
              />
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

          <div style={{ textAlign: 'right', marginBottom: 20 }}>
            <Link to="/forgot-password" style={{ fontSize: 12, color: '#6B6B66', textDecoration: 'none' }}>
              Quên mật khẩu?
            </Link>
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
            transition: 'opacity 0.15s',
          }}>
            {isSubmitting && <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} />}
            {isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#6B6B66' }}>
          Chưa có tài khoản?{' '}
          <Link to="/register" style={{ color: '#A47408', fontWeight: 600, textDecoration: 'none' }}>
            Đăng ký ngay
          </Link>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
