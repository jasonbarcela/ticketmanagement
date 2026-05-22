import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Button } from '@/components/ui/button'

const NAV_ITEMS = [
  { to: '/', end: true, label: 'Dashboard', roles: ['admin'] },
  { to: '/tickets', end: false, label: 'Tickets', roles: ['admin', 'technician'] },
  { to: '/customers', end: false, label: 'Customers', roles: ['admin', 'technician'] },
  { to: '/inventory', end: false, label: 'Inventory', roles: ['admin'] },
  { to: '/payments', end: false, label: 'Payments', roles: ['admin'] },
  { to: '/home-service', end: false, label: 'Home Service', roles: ['admin', 'technician'] },
  { to: '/users', end: false, label: 'Users', roles: ['admin'] },
  { to: '/reports', end: false, label: 'Reports', roles: ['admin'] },
  { to: '/book', end: false, label: 'New Request', roles: ['admin', 'technician'] },
]

export default function AppSidebar({ onLogout }) {
  const { user } = useAuth()

  const filteredNavItems = NAV_ITEMS.filter(item =>
    item.roles.includes(user?.role)
  )

  return (
    <aside className="flex flex-col w-64 h-screen border-r bg-background">
      <div className="flex items-center h-16 px-6 border-b">
        <span className="text-xl font-bold tracking-tight">
          CODE <span className="text-blue-500">&amp;</span> LOCKS
        </span>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {filteredNavItems.map(item => (
          <NavLink key={item.to} to={item.to} end={item.end}>
            {({ isActive }) => (
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                className={`w-full justify-start ${isActive ? 'bg-secondary font-medium' : ''}`}
              >
                {item.label}
              </Button>
            )}
          </NavLink>
        ))}
      </nav>

      {user && (
        <div className="p-4 border-t">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
              <span className="font-medium text-sm">{user.username}</span>
              <span className="text-xs text-muted-foreground uppercase">{user.role}</span>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={onLogout}
          >
            Logout
          </Button>
        </div>
      )}
    </aside>
  )
}
