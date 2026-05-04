import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getUserFeatures } from '@/lib/auth'
import { trackFeatureLocked } from '@/lib/analytics'

interface Props {
  feature: string
  children: ReactNode
  fallback?: ReactNode
}

export function FeatureGate({ feature, children, fallback }: Props) {
  const { user, profile, loading: authLoading } = useAuth()
  const location = useLocation()
  const [checking, setChecking] = useState(true)
  const [hasFeature, setHasFeature] = useState<boolean | null>(null)
  // Phase 7 Đợt B — Bug tab reset state (Approach D, defense-in-depth)
  // Track user.id đã fetch features. Nếu Approach B sót event nào (vd auth flow
  // tương lai) → user/profile object ref vẫn có thể đổi mà id giữ nguyên →
  // dep primitive [user?.id, profile?.id] tránh effect re-run nhầm.
  // Khi user.id thay đổi (logout → login khác account) → fetch lại + reset cache.
  const lastUserIdRef = useRef<string | null>(null)

  const isAdmin = profile?.is_admin === true
  const status = profile?.status
  const blockedByStatus = status === 'deleted' || status === 'suspended'

  useEffect(() => {
    if (authLoading) return
    if (!user || !profile) {
      setChecking(false)
      return
    }
    if (isAdmin || blockedByStatus) {
      setChecking(false)
      return
    }

    // Same user + đã biết hasFeature → KHÔNG refetch, KHÔNG setChecking(true)
    // → tránh CalculatorApp unmount khi user/profile object ref đổi nhưng id giữ.
    if (hasFeature !== null && lastUserIdRef.current === user.id) {
      setChecking(false)
      return
    }

    // user.id đổi (logout/login khác) → reset stale hasFeature trước khi fetch
    if (lastUserIdRef.current !== null && lastUserIdRef.current !== user.id) {
      setHasFeature(null)
    }

    let cancelled = false
    setChecking(true)
    getUserFeatures(user.id).then(features => {
      if (cancelled) return
      const has = features.includes(feature)
      setHasFeature(has)
      lastUserIdRef.current = user.id
      setChecking(false)
      if (!has) trackFeatureLocked(feature)
    })
    return () => { cancelled = true }
  }, [authLoading, user?.id, profile?.id, isAdmin, blockedByStatus, feature, hasFeature])

  if (authLoading || checking) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 240, fontSize: 14, color: '#6B6B66',
      }}>
        Đang kiểm tra quyền truy cập...
      </div>
    )
  }

  if (isAdmin) return <>{children}</>

  if (blockedByStatus) {
    return <Navigate to="/locked" state={{ reason: status }} replace />
  }

  if (hasFeature) return <>{children}</>

  if (fallback !== undefined) return <>{fallback}</>

  return (
    <Navigate
      to="/locked"
      state={{ reason: 'feature_locked', feature, returnTo: location.pathname }}
      replace
    />
  )
}
