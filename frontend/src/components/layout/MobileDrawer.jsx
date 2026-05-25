// components/layout/MobileDrawer.jsx
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const NAV_ITEMS = [
  { to: '/',          end: true, label: 'Dashboard',  roles: ['admin'] },
  { to: '/tickets',   end: false, label: 'Tickets',    roles: ['admin', 'technician'] },
  { to: '/customers', end: false, label: 'Customers',  roles: ['admin', 'technician'] },
  { to: '/inventory', end: false, label: 'Inventory',  roles: ['admin', 'technician'] },
  { to: '/bookings',  end: false, label: 'Home Service', roles: ['admin'] },
  { to: '/staff',     end: false, label: 'Technicians', roles: ['admin'] },
  { to: '/profile',   end: false, label: 'My Profile', roles: ['technician'] },
  { to: '/book',      end: false, label: 'New Request', roles: ['admin', 'technician'] },
]

export default function MobileDrawer({ isOpen, onClose, onLogout }) {
  const { user } = useAuth()
  if (!isOpen) return null

  const items = NAV_ITEMS.filter(item => item.roles.includes(user?.role))

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <div className="drawer-brand">
          <span>🔧</span> CODE <span className="brand-amp">&amp;</span> LOCKS
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>
        <nav className="drawer-nav">
          {items.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `drawer-link${isActive ? ' active' : ''}`}
              onClick={onClose}
            >
              <span>{item.icon}</span> {item.label}
            </NavLink>
          ))}
        </nav>
        {user && (
          <div className="drawer-footer">
            <span className="sidebar-user-name">👤 {user.full_name || user.username} · {user.role}</span>
            <button className="btn btn-logout btn-sm" onClick={() => { onLogout(); onClose() }}>
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
