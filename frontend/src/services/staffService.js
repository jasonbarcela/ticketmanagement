import api from '../lib/axios'

export const staffService = {
  listTechnicians: () =>
    api.get('/staff/technicians').then(r => r.data),

  createTechnician: (payload) =>
    api.post('/staff/technicians', payload).then(r => r.data),

  getTechnicianProfile: (username) =>
    api.get(`/staff/technicians/${encodeURIComponent(username)}`).then(r => r.data),
}
