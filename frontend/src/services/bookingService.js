// services/bookingService.js — Booking / Intake API Wrapper
import api from '../lib/axios'

export const bookingService = {
  // Normalise customer_email → email so the backend always receives `email`
  submitIntake: (payload) => {
    const body = { ...payload }
    if (body.customer_email !== undefined && body.email === undefined) {
      body.email = body.customer_email
    }
    return api.post('/bookings', body).then(r => r.data)
  },

  getAll: (status = '') =>
    api.get('/bookings', { params: status ? { status } : {} }).then(r => r.data),

  approve: (bookingId) =>
    api.put(`/bookings/${bookingId}/approve`).then(r => r.data),

  cancel: (bookingId) =>
    api.put(`/bookings/${bookingId}/cancel`).then(r => r.data),
}
