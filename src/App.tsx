import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute, AdminRoute, GuestRoute } from './routes/ProtectedRoute'

// Layouts
import { PublicLayout } from './components/layouts/PublicLayout'
import { AppLayout } from './components/layouts/AppLayout'
import { AdminLayout } from './components/layouts/AdminLayout'

// Public pages
import { LoginPage } from './pages/public/LoginPage'
import { RegisterPage } from './pages/public/RegisterPage'

// Locked
import { LockedPage } from './pages/locked/LockedPage'

// App pages
import { DashboardPage } from './pages/app/DashboardPage'
import { UserProfilePage } from './pages/app/UserProfilePage'

// Admin pages
import { PendingUsersPage } from './pages/admin/PendingUsersPage'
import { UserListPage } from './pages/admin/UserListPage'
import { UserDetailPage } from './pages/admin/UserDetailPage'
import { UserPermissionsPage } from './pages/admin/UserPermissionsPage'

// Original calculator (kept at /app/shopee-calculator)
import CalculatorApp from './CalculatorApp'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public — redirect to app if already logged in */}
          <Route element={<PublicLayout />}>
            <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
            <Route path="/forgot-password" element={<div style={{ textAlign: 'center', color: '#6B6B66', fontSize: 14 }}>Tính năng đang phát triển. Liên hệ admin để reset mật khẩu.</div>} />
          </Route>

          {/* Locked — accessible when logged in but not active */}
          <Route path="/locked" element={<LockedPage />} />

          {/* App — requires active user */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/app" element={<DashboardPage />} />
            <Route path="/app/profile" element={<UserProfilePage />} />
            <Route path="/app/shopee-calculator" element={<CalculatorApp />} />
          </Route>

          {/* Admin — requires is_admin */}
          <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
            <Route path="/admin/users" element={<UserListPage />} />
            <Route path="/admin/users/pending" element={<PendingUsersPage />} />
            <Route path="/admin/users/:id" element={<UserDetailPage />} />
            <Route path="/admin/users/:id/permissions" element={<UserPermissionsPage />} />
          </Route>

          {/* Root — redirect based on auth state handled by GuestRoute logic */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
