// services/customerService.js — Customer API Wrapper
import api from '../lib/axios'

export const customerService = {
  getAll:  ({ search = '' } = {}) =>
    api.get(`/customers?search=${encodeURIComponent(search)}`).then(r => r.data),

  create:  (payload) =>
    api.post('/customers', payload).then(r => r.data),

  update:  (id, payload) =>
    api.put(`/customers/${id}`, payload).then(r => r.data),

  remove:  (id) =>
    api.delete(`/customers/${id}`).then(r => r.data),
}
