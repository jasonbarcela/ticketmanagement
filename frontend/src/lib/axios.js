// src/lib/axios.js — shared API client (Vite proxy → backend)
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const raw = localStorage.getItem('cal_user')
  if (raw) {
    config.headers['X-User'] = raw
  }
  return config
})

export default api
