import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute, AdminRoute, GuestRoute } from './routes/ProtectedRoute'
import { AnalyticsProvider } from './components/AnalyticsProvider'

// Layouts
import { PublicLayout } from './components/layouts/PublicLayout'
import { AppLayout } from './components/layouts/AppLayout'
import { AdminLayout } from './components/layouts/AdminLayout'

// Public pages
import { LoginPage } from './pages/public/LoginPage'
import { RegisterPage } from './pages/public/RegisterPage'
import { ForgotPasswordPage } from './pages/public/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/public/ResetPasswordPage'

// Locked
import { LockedPage } from './pages/locked/LockedPage'

// Public share
import { PublicSharePage } from './pages/public/PublicSharePage'

// Legal pages (public, no auth)
import { TermsPage } from './pages/legal/TermsPage'
import { PrivacyPage } from './pages/legal/PrivacyPage'

// Feature gate
import { FeatureGate } from './components/FeatureGate'

// App pages
import { DashboardPage } from './pages/app/DashboardPage'
import { UserProfilePage } from './pages/app/UserProfilePage'
import { SavedResultDetailPage } from './pages/app/SavedResultDetailPage'

// Admin pages
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage'
import { PendingUsersPage } from './pages/admin/PendingUsersPage'
import { UserListPage } from './pages/admin/UserListPage'
import { UserDetailPage } from './pages/admin/UserDetailPage'
import { UserPermissionsPage } from './pages/admin/UserPermissionsPage'
import { AdminFeesPage } from './pages/admin/AdminFeesPage'
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage'
import { ActivityLogPage } from './pages/admin/ActivityLogPage'

// Original calculator (kept at /app/shopee-calculator)
import CalculatorApp from './CalculatorApp'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AnalyticsProvider>
        <Routes>
          {/* Public — redirect to app if already logged in */}
          <Route element={<PublicLayout />}>
            <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>

          {/* Locked — accessible when logged in but not active */}
          <Route path="/locked" element={<LockedPage />} />

          {/* Public share — anon, no auth */}
          <Route path="/share/:slug" element={<PublicSharePage />} />

          {/* Legal — public, no auth */}
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />

          {/* App — requires active user */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/app" element={<DashboardPage />} />
            <Route path="/app/profile" element={<UserProfilePage />} />
            <Route path="/app/saved/:id" element={<SavedResultDetailPage />} />
            <Route path="/app/shopee-calculator" element={
              <FeatureGate feature="shopee_calculator_access">
                <CalculatorApp />
              </FeatureGate>
            } />
          </Route>

          {/* Admin — requires is_admin */}
          <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route path="/admin" element={<AdminOverviewPage />} />
            <Route path="/admin/users" element={<UserListPage />} />
            <Route path="/admin/users/pending" element={<PendingUsersPage />} />
            <Route path="/admin/users/:id" element={<UserDetailPage />} />
            <Route path="/admin/users/:id/permissions" element={<UserPermissionsPage />} />
            <Route path="/admin/fees" element={<AdminFeesPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
            <Route path="/admin/activity-log" element={<ActivityLogPage />} />
          </Route>

          {/* Root — redirect based on auth state handled by GuestRoute logic */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        </AnalyticsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
