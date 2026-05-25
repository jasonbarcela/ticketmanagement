import api from '../lib/axios'

export const paymentService = {
  getSummary: (ticketId) =>
    api.get(`/payments/summary/${ticketId}`).then(r => r.data),

  recordPayment: (payload) =>
    api.post('/payments/record', payload).then(r => r.data),
}