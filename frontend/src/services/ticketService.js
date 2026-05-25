import api from '../lib/axios'

export const ticketService = {
  getAll: (params) => {
    const search = params?.search || ''
    const status = params?.status || ''
    return api.get(`/tickets?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`)
      .then(r => {
        if (!r || !r.data) return []
        if (Array.isArray(r.data)) return r.data
        if (r.data.tickets && Array.isArray(r.data.tickets)) return r.data.tickets
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