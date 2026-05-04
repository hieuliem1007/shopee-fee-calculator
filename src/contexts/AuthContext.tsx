import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getProfile, updateLastLogin } from '@/lib/auth'
import type { Profile } from '@/lib/supabase'

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Phase 7 Đợt B — Bug tab reset state (Approach B)
  // Supabase auth-js đăng ký visibilitychange listener internal (GoTrueClient.js:4225).
  // Mỗi lần tab visible → _recoverAndRefresh() → emit SIGNED_IN khi session còn margin.
  // Nếu re-set user/profile mỗi event → reference đổi → consumer effect (FeatureGate)
  // re-run → CalculatorApp unmount → state mất.
  // Fix: skip re-set khi user.id KHÔNG đổi và event không phải explicit update.
  const userIdRef = useRef<string | null>(null)

  const loadProfile = async (u: User) => {
    const p = await getProfile(u.id)
    setProfile(p)
    if (p) await updateLastLogin(u.id)
  }

  const refreshProfile = async () => {
    if (user) await loadProfile(user)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      userIdRef.current = s?.user?.id ?? null
      if (s?.user) {
        loadProfile(s.user).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      // Session token có thể fresh (TOKEN_REFRESHED) — luôn cập nhật cho REST API.
      setSession(s)

      const newUserId = s?.user?.id ?? null

      // Filter same-user re-emit (SIGNED_IN do visibilitychange, TOKEN_REFRESHED do
      // auto-refresh, INITIAL_SESSION sau getSession đã set state).
      // EXCEPTIONS giữ full update:
      // - USER_UPDATED: user gọi supabase.auth.updateUser → cần re-load profile
      // - PASSWORD_RECOVERY: Phase 5 Lesson 2 — recovery session phải fire để
      //   ResetPasswordPage nhận state, KHÔNG được skip
      if (
        newUserId === userIdRef.current &&
        event !== 'USER_UPDATED' &&
        event !== 'PASSWORD_RECOVERY'
      ) {
        return
      }

      userIdRef.current = newUserId
      setUser(s?.user ?? null)
      if (s?.user) {
        loadProfile(s.user)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
    userIdRef.current = null
  }

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
