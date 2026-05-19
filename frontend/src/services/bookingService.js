// services/bookingService.js — Booking / Intake API Wrapper
import api from '../lib/axios'

export const bookingService = {
  submitIntake: (payload) =>
    api.post('/bookings', payload).then(r => r.data),
}
