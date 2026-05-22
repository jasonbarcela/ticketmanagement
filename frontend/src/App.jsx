// ============================================================
// App.jsx — Updated routing with landing page + removed ReceiptPage
// ============================================================
import { Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './routes/ProtectedRoute'
import { toast } from 'sonner'

// Layout Components
import Sidebar     from './components/layout/Sidebar'
import Header      from './components/layout/Header'
import MobileDrawer from './components/layout/MobileDrawer'

// Public Pages
import LandingPage        from './pages/public/LandingPage'       // ← NEW
import LoginPage          from './pages/public/LoginPage'
import PublicBookingPage  from './pages/public/PublicBookingPage'  // ← Updated
import TrackingPage       from './pages/public/TrackingPage'

// Protected Pages
import Dashboard    from './pages/dashboard/Dashboard'
import TicketsPage  from './pages/tickets/TicketsPage'
import NewTicket    from './pages/tickets/NewTicket'
import ViewTicket   from './pages/tickets/ViewTicket'   // ← Updated (receipt modal)
import EditTicket   from './pages/tickets/EditTicket'   // ← Updated (parts manager)
import CustomersPage from './pages/customers/CustomersPage'
import InventoryPage from './pages/inventory/InventoryPage'
import BookingPage  from './pages/bookings/BookingPage'

// NEW PROTECTED PAGES
import UsersPage from './pages/users/UsersPage'
import PaymentsPage from './pages/payments/PaymentsPage'
import HomeServicePage from './pages/homeservice/HomeServicePage'
import ReportsPage from './pages/reports/ReportsPage'

// ── Authenticated Shell Layout ────────────────────────────────
function AppLayout() {
  const { logout, user, isLoggedIn, loading } = useAuth()
  const navigate = useNavigate()
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

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    navigate('/home', { replace: true })
  }

  const titleMap = {
    '/':           'Dashboard',
    '/tickets':    'Tickets',
    '/customers':  'Customers',
    '/inventory':  'Inventory',
    '/book':       'New Request',
    '/payments':     'Payments',
    '/home-service': 'Home Service',
    '/users':        'Users',
    '/reports':      'Reports',
  }
  const path = location.pathname
  const pageTitle = titleMap[path]
    || (path.startsWith('/tickets/view') ? 'View Ticket' : null)
    || (path.startsWith('/tickets/edit') ? 'Edit Ticket' : null)
    || (path.startsWith('/tickets/new') ? 'New Ticket' : null)
    || 'Code & Locks'

  return (
    <div className="app-shell">
      <Sidebar onLogout={handleLogout} />
      <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawer(false)} onLogout={handleLogout} />
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
      <Route path="/home"         element={<LandingPage />} />
      <Route path="/login"        element={isLoggedIn ? <Navigate to={baseRedirect} replace /> : <LoginPage />} />
      <Route path="/book-online"  element={<PublicBookingPage />} />
      <Route path="/track"        element={<TrackingPage />} />

      {/* Protected shell */}
      <Route element={<AppLayout />}>
        <Route path="/"                  element={<ProtectedRoute allowedRoles={['admin']}><Dashboard /></ProtectedRoute>} />
        <Route path="/inventory"         element={<ProtectedRoute allowedRoles={['admin']}><InventoryPage /></ProtectedRoute>} />
        <Route path="/tickets/edit/:id"  element={<ProtectedRoute allowedRoles={['admin','technician']}><EditTicket /></ProtectedRoute>} />
        <Route path="/tickets"           element={<ProtectedRoute allowedRoles={['admin','technician']}><TicketsPage /></ProtectedRoute>} />
        <Route path="/tickets/new"       element={<ProtectedRoute allowedRoles={['admin','technician']}><NewTicket /></ProtectedRoute>} />
        <Route path="/tickets/view/:id"  element={<ProtectedRoute allowedRoles={['admin','technician']}><ViewTicket /></ProtectedRoute>} />
        <Route path="/customers"         element={<ProtectedRoute allowedRoles={['admin','technician']}><CustomersPage /></ProtectedRoute>} />
        <Route path="/book"              element={<ProtectedRoute allowedRoles={['admin','technician']}><BookingPage /></ProtectedRoute>} />
        <Route path="/payments"          element={<ProtectedRoute allowedRoles={['admin']}><PaymentsPage /></ProtectedRoute>} />
        <Route path="/home-service"      element={<ProtectedRoute allowedRoles={['admin','technician']}><HomeServicePage /></ProtectedRoute>} />
        <Route path="/users"             element={<ProtectedRoute allowedRoles={['admin']}><UsersPage /></ProtectedRoute>} />
        <Route path="/reports"           element={<ProtectedRoute allowedRoles={['admin']}><ReportsPage /></ProtectedRoute>} />
      </Route>

      {/* Redirect root to landing page for unauthenticated, dashboard for authenticated */}
      <Route path="*" element={<Navigate to={isLoggedIn ? baseRedirect : '/home'} replace />} />
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
