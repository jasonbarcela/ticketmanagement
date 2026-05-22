import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function StatsGrid({ stats, loading }) {
  const defaultStats = stats || {}
  
  const displayStats = [
    { label: "Total Repair Tickets", value: defaultStats.total || 0 },
    { label: "Pending Repairs", value: defaultStats.pending || 0 },
    { label: "In Progress", value: defaultStats.approved || 0 },
    { label: "Completed", value: defaultStats.completed || 0 },
    { label: "Low Stock Alerts", value: defaultStats.low_stock || 0 },
    { label: "Home Service Bookings", value: defaultStats.home_service_bookings || 0 },
    { 
      label: "Daily Revenue", 
      value: `₱${(defaultStats.daily_revenue || 0).toFixed(2)}` 
    },
  ]

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(7)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-1/2 bg-muted rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-1/3 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {displayStats.map((stat, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stat.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
