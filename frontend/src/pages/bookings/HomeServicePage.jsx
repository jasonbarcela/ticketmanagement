import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Navigate } from 'react-router-dom'
import api from '../../lib/axios'
import { Button } from '../../components/ui/Button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/Table'
import StatusBadge from '../../components/status/StatusBadge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { toast } from 'sonner'

const STATUS_FLOW = {
  'Pending': 'Confirmed',
  'Confirmed': 'Completed',
  'Completed': 'Completed', // Can't change completed status
}

export default function HomeServicePage() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState(null)

  // Only admins and technicians can access this page
  if (!user || !['admin', 'technician'].includes(user.role)) {
    return <Navigate to="/" replace />
  }

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true)
        setError('')
        const response = await api.get('/bookings')
        setBookings(Array.isArray(response.data) ? response.data : response.data.data || [])
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch bookings')
      } finally {
        setLoading(false)
      }
    }

    fetchBookings()
  }, [])

  const handleStatusUpdate = async (bookingId, currentStatus) => {
    const nextStatus = STATUS_FLOW[currentStatus]
    if (!nextStatus || nextStatus === currentStatus) {
      return
    }

    try {
      setUpdatingId(bookingId)
      await api.patch(`/bookings/${bookingId}`, { status: nextStatus })
      setBookings(prev =>
        prev.map(b =>
          b.booking_id === bookingId ? { ...b, status: nextStatus } : b
        )
      )
      toast.success(`Booking status updated to ${nextStatus}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update booking')
    } finally {
      setUpdatingId(null)
    }
  }

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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Home Service Bookings</h1>
        <p className="text-muted-foreground mt-1">Manage on-site repair bookings</p>
      </div>

      {/* Bookings Table */}
      {bookings.length === 0 ? (
        <EmptyState
          title="No bookings yet"
          description="Home service bookings will appear here"
        />
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Scheduled Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.booking_id}>
                  <TableCell className="font-medium">
                    {booking.customer_name || 'N/A'}
                  </TableCell>
                  <TableCell>{booking.address || 'N/A'}</TableCell>
                  <TableCell>{booking.device_type || 'N/A'}</TableCell>
                  <TableCell>
                    {booking.scheduled_date
                      ? new Date(booking.scheduled_date).toLocaleDateString()
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={booking.status} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleStatusUpdate(booking.booking_id, booking.status)
                      }
                      disabled={
                        updatingId === booking.booking_id ||
                        booking.status === 'Completed'
                      }
                    >
                      {booking.status === 'Pending'
                        ? 'Confirm'
                        : booking.status === 'Confirmed'
                        ? 'Complete'
                        : 'Done'}
                    </Button>
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
