import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, KeyRound, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const schema = z.object({
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, {
  path: ['confirm'],
  message: 'Mật khẩu xác nhận không khớp',
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
  if (m.includes('same') || m.includes('different')) {
    return 'Mật khẩu mới phải khác mật khẩu cũ.'
  }
  if (m.includes('rate') || m.includes('too many')) {
    return 'Đã thử quá nhiều lần, vui lòng đợi vài phút.'
  }
  if (m.includes('weak')) {
    return 'Mật khẩu quá yếu, vui lòng chọn mật khẩu mạnh hơn.'
  }
  return 'Có lỗi xảy ra, vui lòng thử lại.'
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [sessionLoading, setSessionLoading] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState('')
  const [showPw, setShowPw] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  // Lắng nghe session từ Supabase. Khi user mở link recovery, Supabase parse
  // hash params và emit PASSWORD_RECOVERY event → set session. Một số trường
  // hợp session-getter đã sẵn ngay khi mount. Listen cả 2 path.
  useEffect(() => {
    let cancelled = false
    let resolved = false

    const tryResolve = (hasSess: boolean) => {
      if (resolved || cancelled) return
      resolved = true
      setHasSession(hasSess)
      setSessionLoading(false)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) tryResolve(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && !resolved)) {
        tryResolve(!!session)
      }
    })

    // Fallback: nếu sau 1500ms vẫn chưa có session → coi như link invalid
    const timer = setTimeout(() => tryResolve(false), 1500)

    return () => {
      cancelled = true
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  const onSubmit = async (data: FormData) => {
    setServerError('')
    const { error } = await supabase.auth.updateUser({ password: data.password })
    if (error) {
      setServerError(mapError(error.message))
      return
    }
    setSuccess(true)
    // Sign out để user re-login với password mới
    await supabase.auth.signOut()
    setTimeout(() => navigate('/login', { replace: true }), 2000)
  }

  return (
    <div style={{
      width: '100%', maxWidth: 400,
      background: '#fff', border: '1px solid #EFEAE0', borderRadius: 16,
      padding: '36px 32px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.05)',
    }}>
      {sessionLoading ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Loader2 size={28} color="#F5B81C" style={{ animation: 'spin 0.7s linear infinite' }} />
          <div style={{ marginTop: 12, fontSize: 13, color: '#6B6B66' }}>
            Đang xác thực link...
          </div>
        </div>
      ) : !hasSession ? (
        <InvalidLinkView />
      ) : success ? (
        <SuccessView />
      ) : (
        <>
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <h1 style={{
              margin: 0, fontSize: 22, fontWeight: 700, color: '#1A1A1A',
              textTransform: 'uppercase', letterSpacing: '0.02em',
            }}>
              Đặt lại mật khẩu
            </h1>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: '#6B6B66' }}>
              Nhập mật khẩu mới cho tài khoản của bạn.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Mật khẩu mới</label>
              <div style={{ position: 'relative' }}>
                <input
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  autoFocus
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

            <div style={{ marginBottom: 18 }}>
              <label style={label}>Nhập lại mật khẩu</label>
              <input
                {...register('confirm')}
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="new-password"
                style={input}
                onFocus={e => (e.target.style.borderColor = '#1A1A1A')}
                onBlur={e => (e.target.style.borderColor = '#EFEAE0')}
              />
              {errors.confirm && <div style={errStyle}>{errors.confirm.message}</div>}
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
                : <KeyRound size={16} />}
              {isSubmitting ? 'Đang lưu…' : 'Đặt lại mật khẩu'}
            </button>
          </form>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function InvalidLinkView() {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 18px',
      }}>
        <AlertCircle size={30} color="#A82928" />
      </div>
      <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1A1A1A' }}>
        Link không hợp lệ hoặc đã hết hạn
      </h1>
      <p style={{ margin: '10px 0 22px', fontSize: 13, color: '#6B6B66', lineHeight: 1.6 }}>
        Vui lòng yêu cầu link đặt lại mật khẩu mới.
      </p>
      <Link to="/forgot-password" style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '10px 20px', borderRadius: 8,
        background: '#F5B81C', color: '#1A1A1A',
        fontSize: 13, fontWeight: 600, textDecoration: 'none',
        boxShadow: '0 1px 0 rgba(255,255,255,0.4) inset, 0 2px 6px rgba(245,184,28,0.30)',
      }}>
        Yêu cầu link mới
      </Link>
    </div>
  )
}

function SuccessView() {
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
        Đặt lại thành công
      </h1>
      <p style={{ margin: '10px 0 18px', fontSize: 13, color: '#6B6B66', lineHeight: 1.6 }}>
        Mật khẩu đã được cập nhật. Đang chuyển hướng đến trang đăng nhập…
      </p>
      <Loader2 size={20} color="#F5B81C" style={{ animation: 'spin 0.7s linear infinite' }} />
    </div>
  )
}
