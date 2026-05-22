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
} from '@/components/ui/table'
import PaymentBadge from '../../components/status/PaymentBadge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { toast } from 'sonner'

export default function PaymentsPage() {
  const { user } = useAuth()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true)
        const response = await api.get('/payments')
        setPayments(response.data || [])
      } catch (err) {
        const msg = err.response?.data?.message || 'Failed to load payments'
        setError(msg)
        toast.error(msg)
      } finally {
        setLoading(false)
      }
    }
    fetchPayments()
  }, [])

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
        <h1 className="text-3xl font-bold">Payments</h1>
        <p className="text-muted-foreground mt-1">Review all system payments and transactions</p>
      </div>

      {error && (
        <div className="p-4 bg-red-100/50 text-red-500 rounded-md">
          {error}
        </div>
      )}

      {payments.length === 0 ? (
        <EmptyState
          title="No payments yet"
          description="Payment records will appear here once transactions are made."
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount Paid</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Remaining Balance</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.payment_id || Math.random()}>
                  <TableCell className="font-medium">#{payment.ticket_id}</TableCell>
                  <TableCell>{payment.customer_name || payment.customer}</TableCell>
                  <TableCell>₱{Number(payment.amount_paid).toFixed(2)}</TableCell>
                  <TableCell className="capitalize">{payment.payment_method}</TableCell>
                  <TableCell>{new Date(payment.payment_date || payment.date).toLocaleDateString()}</TableCell>
                  <TableCell>₱{Number(payment.remaining_balance || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <PaymentBadge status={payment.remaining_balance <= 0 ? 'Paid' : 'Unpaid'} />
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
