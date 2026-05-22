import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/axios'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { toast } from 'sonner'

export default function HomeServicePage() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const response = await api.get('/bookings')
      // Ensure we only show home service bookings if api returns all types
      const homeBookings = response.data.filter(b => b.service_type === 'Home Service')
      setBookings(homeBookings)
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load bookings'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
  }, [])

  const handleStatusUpdate = async (id, currentStatus) => {
    let nextStatus = 'Pending'
    if (currentStatus === 'Pending') nextStatus = 'Confirmed'
    else if (currentStatus === 'Confirmed') nextStatus = 'Completed'
    else return // Reached end state

    try {
      // Optistic update or call API (Assuming /api/bookings/:id/status exists as standard pattern)
      toast.info(`Updating status to ${nextStatus}...`)
      await api.patch(`/bookings/${id}/status`, { status: nextStatus })
      toast.success('Status updated successfully')
      fetchBookings()
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Pending': return 'secondary'
      case 'Confirmed': return 'default'
      case 'Completed': return 'outline'
      default: return 'secondary'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 h-full">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Home Service Bookings</h1>
        <p className="text-muted-foreground mt-1">Manage remote repair requests and schedules</p>
      </div>

      {error && (
        <div className="p-4 bg-red-100/50 text-red-500 rounded-md">
          {error}
        </div>
      )}

      {bookings.length === 0 ? (
        <EmptyState
          title="No home service bookings"
          description="There are no home service requests scheduled."
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Scheduled Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.booking_id || booking.id}>
                  <TableCell className="font-medium">{booking.customer_name}</TableCell>
                  <TableCell className="max-w-xs truncate" title={booking.address}>
                    {booking.address}
                  </TableCell>
                  <TableCell>{booking.device_model}</TableCell>
                  <TableCell>{new Date(booking.scheduled_date || booking.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadge(booking.status)}>
                      {booking.status || 'Pending'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {booking.status !== 'Completed' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleStatusUpdate(booking.booking_id || booking.id, booking.status || 'Pending')}
                      >
                        Mark as {booking.status === 'Pending' || !booking.status ? 'Confirmed' : 'Completed'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
