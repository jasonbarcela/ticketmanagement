// services/inventoryService.js — Inventory API Wrapper
import api from '../lib/axios'

export const inventoryService = {
  getAll:       () =>
    api.get('/inventory').then(r => r.data),

  adjustStock:  (partId, newQuantity) =>
    api.post('/inventory/update', { part_id: partId, new_quantity: newQuantity }).then(r => r.data),

  addPart:      (payload) =>
    api.post('/inventory/add', payload).then(r => r.data),

  editPart:     (partId, payload) =>
    api.patch(`/inventory/${partId}`, payload).then(r => r.data),

  deletePart:   (partId) =>
    api.delete(`/inventory/${partId}`).then(r => r.data),
}
