// ============================================================
// components/layout/MobileDrawer.jsx — Responsive Nav Overlay
//
// Full-screen overlay drawer for mobile viewports.
// Contains the same nav links as Sidebar, triggered by the
// Header hamburger button. Closes on overlay tap or link click.
// ============================================================
import { NavLink }  from 'react-router-dom'
import { useAuth }  from '../../context/AuthContext'

const NAV_ITEMS = [
  { to: '/',          end: true,  icon: '📊', label: 'Dashboard'  },
  { to: '/tickets',   end: false, icon: '🎫', label: 'Tickets'    },
  { to: '/customers', end: false, icon: '👥', label: 'Customers'  },
  { to: '/inventory', end: false, icon: '📦', label: 'Inventory'  },
  { to: '/book',      end: false, icon: '📋', label: 'New Request' },
]

export default function MobileDrawer({ isOpen, onClose, onLogout }) {
  const { user } = useAuth()

  if (!isOpen) return null

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        {/* Brand */}
        <div className="drawer-brand">
          <span>🔧</span> CODE <span className="brand-amp">&amp;</span> LOCKS
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>

        {/* Nav */}
        <nav className="drawer-nav">
          {NAV_ITEMS.map(item => (
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

        {/* User */}
        {user && (
          <div className="drawer-footer">
            <span className="sidebar-user-name">👤 {user.username} · {user.role}</span>
            <button className="btn btn-logout btn-sm" onClick={() => { onLogout(); onClose() }}>
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
