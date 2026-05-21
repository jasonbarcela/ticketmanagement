// ============================================================
// components/layout/Sidebar.jsx — Left Navigation Sidebar
//
// Sticky left-side navigation rail with brand header,
// nav links grouped by module, and a user session footer.
// Restricted roles dynamically block non-permitted pages.
// ============================================================
import { NavLink }   from 'react-router-dom';
import { useAuth }   from '../../context/AuthContext';

const NAV_ITEMS = [
  { to: '/',          end: true,   label: 'Dashboard', roles: ['admin'] },
  { to: '/tickets',   end: false,  label: 'Tickets',    roles: ['admin', 'technician'] },
  { to: '/customers', end: false,  label: 'Customers',  roles: ['admin', 'technician'] },
  { to: '/inventory', end: false,  label: 'Inventory',  roles: ['admin'] },
  { to: '/book',      end: false,  label: 'New Request', highlight: true, roles: ['admin', 'technician'] },
];

export default function Sidebar({ onLogout }) {
  const { user } = useAuth();

  // Filter items so users only see links permitted by their specific user flow
  const filteredNavItems = NAV_ITEMS.filter(item => 
    item.roles.includes(user?.role)
  );

  return (
    <aside className="sidebar">
      {/* ── Brand ─────────────────────────────────────────── */}
      <div className="sidebar-brand">
        <span className="brand-icon">🔧</span>
        <span className="brand-text">CODE <span className="brand-amp">&amp;</span> LOCKS</span>
      </div>

      {/* ── Nav Links ─────────────────────────────────────── */}
      <nav className="sidebar-nav">
        {filteredNavItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `sidebar-link${item.highlight ? ' sidebar-link--highlight' : ''}${isActive ? ' active' : ''}`
            }
          >
            <span className="sidebar-link-icon">{item.icon}</span>
            <span className="sidebar-link-label">{item.label}</span>
          </NavLink>
        ))}

        {/* ── Customer-facing links (open in same tab) ──────── */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', margin: '10px 0 6px', paddingTop: 6 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.8, padding: '0 14px 6px' }}>
            Customer Portal
          </div>
          <a href="/track" target="_blank" rel="noopener noreferrer" className="sidebar-link">
            <span className="sidebar-link"></span>
            <span className="sidebar-link-label">Track Ticket</span>
          </a>
          <a href="/book-online" target="_blank" rel="noopener noreferrer" className="sidebar-link">
            <span className="sidebar-link"></span>
            <span className="sidebar-link-label">Online Booking</span>
          </a>
        </div>
      </nav>

      {/* ── User Session Footer ────────────────────────────── */}
      {user && (
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="sidebar-user-avatar">👤</span>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name" style={{ fontWeight: 600 }}>{user.username}</div>
              <div className="sidebar-user-role" style={{ 
                fontSize: '11px', 
                textTransform: 'uppercase', 
                fontWeight: 'bold',
                color: user.role === 'admin' ? '#f59e0b' : '#3b82f6' 
              }}>
                {user.role}
              </div>
            </div>
          </div>
          <button className="btn btn-logout btn-sm sidebar-logout" onClick={onLogout}>
            Logout
          </button>
        </div>
      )}
    </aside>
  );
}