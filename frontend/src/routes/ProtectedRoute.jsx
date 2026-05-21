// ============================================================
// routes/ProtectedRoute.jsx — Role Guard Only
//
// Auth check (isLoggedIn) is handled by AppLayout.
// This component only enforces role-based access control.
// ============================================================
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth()

  if (loading) return null

  // Role guard — redirect to their home if role not permitted
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    const fallback = user?.role === 'technician' ? '/tickets' : '/'
    return <Navigate to={fallback} replace />
  }

  return children
}
