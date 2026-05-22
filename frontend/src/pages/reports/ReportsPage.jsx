import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Navigate } from 'react-router-dom'
import api from '../../lib/axios'
import StatsGrid from '../../components/dashboard/StatsGrid'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import Spinner from '../../components/ui/Spinner'
import { toast } from 'sonner'

export default function ReportsPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const response = await api.get('/stats')
        setStats(response.data)
      } catch (err) {
        const msg = err.response?.data?.message || 'Failed to load reports data'
        setError(msg)
        toast.error(msg)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const ticketBreakdown = stats ? [
    { status: 'Pending', count: stats.pending || 0, variant: 'secondary' },
    { status: 'In Progress (Approved)', count: stats.approved || 0, variant: 'default' },
    { status: 'Completed', count: stats.completed || 0, variant: 'outline' }
  ] : []

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
        <p className="text-muted-foreground mt-1">System overview and performance metrics</p>
      </div>

      {error && (
        <div className="p-4 bg-red-100/50 text-red-500 rounded-md">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <StatsGrid stats={stats} loading={loading} />

      {/* Ticket Breakdown Table */}
      {!loading && stats && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Ticket Breakdown by Status</h2>
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ticket Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ticketBreakdown.map((item) => (
                  <TableRow key={item.status}>
                    <TableCell className="font-medium">
                      <Badge variant={item.variant}>{item.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{item.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
