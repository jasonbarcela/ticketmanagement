// src/lib/axios.js
import axios from 'axios'

const api = axios.create({
  // ❌ REMOVE THIS:
  // baseURL: '/api',
  
  //  CHANGE TO THIS:
  baseURL: 'http://localhost:3001/api', 
  
  headers: { 'Content-Type': 'application/json' },
})

// Attach session header from localStorage on every request
api.interceptors.request.use((config) => {
  const raw = localStorage.getItem('cal_user')
  if (raw) {
    config.headers['X-User'] = raw
  }
  return config
})

export default api