import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import Spinner from '../ui/Spinner'

export default function StatsGrid({ stats = {}, loading = false }) {
  const statCards = [
    {
      label: 'Total Repair Tickets',
      value: stats.total || 0,
      color: 'bg-blue-50 text-blue-700'
    },
    {
      label: 'Pending Repairs',
      value: stats.pending || 0,
      color: 'bg-amber-50 text-amber-700'
    },
    {
      label: 'In Progress',
      value: stats.approved || 0,
      color: 'bg-purple-50 text-purple-700'
    },
    {
      label: 'Completed',
      value: stats.completed || 0,
      color: 'bg-green-50 text-green-700'
    },
    {
      label: 'Low Stock Alerts',
      value: stats.low_stock || 0,
      color: 'bg-red-50 text-red-700'
    },
    {
      label: 'Home Service Bookings',
      value: stats.home_service_bookings || 0,
      color: 'bg-cyan-50 text-cyan-700'
    },
    {
      label: 'Daily Revenue',
      value: `₱${(stats.daily_revenue || 0).toFixed(2)}`,
      color: 'bg-emerald-50 text-emerald-700'
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => (
        <Card key={index} className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${stat.color} p-4 rounded-md text-center`}>
              {stat.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
