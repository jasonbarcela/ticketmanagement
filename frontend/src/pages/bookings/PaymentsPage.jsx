import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Navigate } from 'react-router-dom'
import api from '../../lib/axios'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/Table'
import PaymentBadge from '../../components/status/PaymentBadge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

export default function PaymentsPage() {
  const { user } = useAuth()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Only admins can access this page
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true)
        setError('')
        const response = await api.get('/payments')
        setPayments(Array.isArray(response.data) ? response.data : response.data.data || [])
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch payments')
      } finally {
        setLoading(false)
      }
    }

    fetchPayments()
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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Payments</h1>
        <p className="text-muted-foreground mt-1">View and manage all payment transactions</p>
      </div>

      {/* Payments Table */}
      {payments.length === 0 ? (
        <EmptyState
          title="No payments yet"
          description="Payment transactions will appear here"
        />
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount Paid</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Remaining Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.payment_id}>
                  <TableCell className="font-medium">#{payment.ticket_id}</TableCell>
                  <TableCell>{payment.customer_name || 'N/A'}</TableCell>
                  <TableCell>₱{parseFloat(payment.amount_paid || 0).toFixed(2)}</TableCell>
                  <TableCell className="capitalize">{payment.payment_method || 'N/A'}</TableCell>
                  <TableCell>
                    {payment.payment_date
                      ? new Date(payment.payment_date).toLocaleDateString()
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    ₱{parseFloat(payment.remaining_balance || 0).toFixed(2)}
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
