// services/statsService.js — Dashboard stats API
import api from '../lib/axios'

export const statsService = {
  getDashboard: () => api.get('/stats').then(r => r.data),
}
