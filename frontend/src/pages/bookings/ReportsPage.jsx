import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Navigate } from 'react-router-dom'
import api from '../../lib/axios'
import StatsGrid from '../../components/status/StatsGrid'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/Table'
import { Badge } from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

export default function ReportsPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState({})
  const [ticketBreakdown, setTicketBreakdown] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Only admins can access this page
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError('')
        const [statsRes, ticketsRes] = await Promise.all([
          api.get('/stats').catch(() => ({})),
          api.get('/tickets').catch(() => []),
        ])

        const statsData = statsRes.data || {}
        setStats(statsData)

        // Process ticket breakdown by status
        const tickets = Array.isArray(ticketsRes.data)
          ? ticketsRes.data
          : ticketsRes.data?.data || []

        const breakdown = {}
        tickets.forEach(ticket => {
          const status = ticket.status || 'Unknown'
          breakdown[status] = (breakdown[status] || 0) + 1
        })

        setTicketBreakdown(
          Object.entries(breakdown).map(([status, count]) => ({
            status,
            count,
          }))
        )
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch reports')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground mt-1">Business performance and analytics</p>
      </div>

      {/* Stats Grid */}
      <StatsGrid stats={stats} loading={false} />

      {/* Ticket Breakdown */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Ticket Status Breakdown</h2>
        {ticketBreakdown.length === 0 ? (
          <EmptyState
            title="No ticket data"
            description="Tickets will appear here as they are created"
          />
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ticketBreakdown.map((item) => (
                  <TableRow key={item.status}>
                    <TableCell className="font-medium">
                      <Badge variant="outline">{item.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {item.count}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
