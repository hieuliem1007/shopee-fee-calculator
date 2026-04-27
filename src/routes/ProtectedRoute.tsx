import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()

  if (loading) return <PageSpinner />
  if (!user) return <Navigate to="/login" replace />

  // Profile not loaded yet (edge case) — wait
  if (!profile) return <PageSpinner />

  if (profile.status === 'pending' || profile.status === 'rejected' || profile.status === 'suspended') {
    return <Navigate to="/locked" replace />
  }

  return <>{children}</>
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()

  if (loading) return <PageSpinner />
  if (!user) return <Navigate to="/login" replace />
  if (!profile) return <PageSpinner />

  if (profile.status !== 'active') return <Navigate to="/locked" replace />
  if (!profile.is_admin) return <Navigate to="/app" replace />

  return <>{children}</>
}

export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()

  if (loading) return <PageSpinner />

  if (user && profile) {
    if (profile.status === 'active') {
      return <Navigate to={profile.is_admin ? '/admin' : '/app'} replace />
    }
    return <Navigate to="/locked" replace />
  }

  return <>{children}</>
}

function PageSpinner() {
  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: '#FAFAF7',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        border: '3px solid #F5B81C',
        borderTopColor: 'transparent',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
