// services/statsService.js — Dashboard Stats API Wrapper
import api from '../lib/axios'

export const statsService = {
  getDashboard: () =>
    api.get('/stats').then(r => r.data),
}
