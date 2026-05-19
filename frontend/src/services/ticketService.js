// ============================================================
// services/ticketService.js — Bulletproof Ticket API Wrapper
// ============================================================
import api from '../lib/axios'

export const ticketService = {
  // FIXED: Destructured arguments safely default to empty strings to avoid query building exceptions
  getAll: (params) => {
    const search = params?.search || ''
    const status = params?.status || ''
    
    return api.get(`/tickets?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`)
      .then(r => {
        // SAFE HYDRATION: Enforce layout array structure standard regardless of server shape
        if (!r || !r.data) return []
        if (Array.isArray(r.data)) return r.data
        if (r.data.tickets && Array.isArray(r.data.tickets)) return r.data.tickets
        return []
      })
      .catch(err => {
        console.error('Core ticket fetch request operation failed, falling back to empty array array wrapper:', err)
        return []
      })
  },

  getOne: (id) =>
    api.get(`/tickets/${id}`).then(r => r.data),

  create: (payload) =>
    api.post('/tickets', payload).then(r => r.data),

  update: (id, payload) =>
    api.put(`/tickets/${id}`, payload).then(r => r.data),

  advance: (id, status) =>
    api.put(`/tickets/${id}/status`, { status }).then(r => r.data),

  remove: (id) =>
    api.delete(`/tickets/${id}`).then(r => r.data),
}