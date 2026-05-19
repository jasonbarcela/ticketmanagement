// ============================================================
// App.jsx — Flat Secure Routing Framework
// ============================================================
import { Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom'
import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './routes/ProtectedRoute'

// Layout Components
import Sidebar from './components/layout/Sidebar'
import Header from './components/layout/Header'
import MobileDrawer from './components/layout/MobileDrawer'

// Public Pages
import LoginPage from './pages/public/LoginPage'
import PublicBookingPage from './pages/public/PublicBookingPage'
import TrackingPage from './pages/public/TrackingPage'

// Protected Pages
import Dashboard from './pages/dashboard/Dashboard'
import TicketsPage from './pages/tickets/TicketsPage'
import NewTicket from './pages/tickets/NewTicket'
import ViewTicket from './pages/tickets/ViewTicket'
import EditTicket from './pages/tickets/EditTicket'
import CustomersPage from './pages/customers/CustomersPage'
import InventoryPage from './pages/inventory/InventoryPage'
import BookingPage from './pages/bookings/BookingPage'

// ── Authenticated Shell Layout ────────────────────────────────
// Auth guard lives HERE — unauthenticated users never see the shell.
function AppLayout() {
  const { logout, user, isLoggedIn, loading } = useAuth()
  const [drawerOpen, setDrawer] = useState(false)
  const location = useLocation()

  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#f8fafc',
        color: '#64748b', fontWeight: 600, fontFamily: 'sans-serif'
      }}>
        Verifying credentials...
      </div>
    )
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  const titleMap = {
    '/':           'Dashboard',
    '/tickets':    'Tickets',
    '/customers':  'Customers',
    '/inventory':  'Inventory',
    '/book':       'New Request',
  }
  const pageTitle = titleMap[location.pathname] || 'Code & Locks'

  return (
    <div className="app-shell">
      <Sidebar onLogout={logout} />
      <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawer(false)} onLogout={logout} />
      <div className="main-wrapper">
        <Header onMenuToggle={() => setDrawer(o => !o)} title={pageTitle} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

// ── Route Controller ──────────────────────────────────────────
function AppRoutes() {
  const { isLoggedIn, user } = useAuth()
  const baseRedirect = user?.role === 'technician' ? '/tickets' : '/'

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login"      element={isLoggedIn ? <Navigate to={baseRedirect} replace /> : <LoginPage />} />
      <Route path="/book-online" element={<PublicBookingPage />} />
      <Route path="/track"       element={<TrackingPage />} />

      {/* Protected shell — AppLayout handles auth redirect internally */}
      <Route element={<AppLayout />}>
        <Route path="/"                 element={<ProtectedRoute allowedRoles={['admin']}><Dashboard /></ProtectedRoute>} />
        <Route path="/inventory"        element={<ProtectedRoute allowedRoles={['admin']}><InventoryPage /></ProtectedRoute>} />
        <Route path="/tickets/edit/:id" element={<ProtectedRoute allowedRoles={['admin']}><EditTicket /></ProtectedRoute>} />
        <Route path="/tickets"          element={<ProtectedRoute allowedRoles={['admin','technician']}><TicketsPage /></ProtectedRoute>} />
        <Route path="/tickets/new"      element={<ProtectedRoute allowedRoles={['admin','technician']}><NewTicket /></ProtectedRoute>} />
        <Route path="/tickets/view/:id" element={<ProtectedRoute allowedRoles={['admin','technician']}><ViewTicket /></ProtectedRoute>} />
        <Route path="/customers"        element={<ProtectedRoute allowedRoles={['admin','technician']}><CustomersPage /></ProtectedRoute>} />
        <Route path="/book"             element={<ProtectedRoute allowedRoles={['admin','technician']}><BookingPage /></ProtectedRoute>} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to={baseRedirect} replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
