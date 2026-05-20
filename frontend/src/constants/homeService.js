// Home Service workflow — must align with backend/utils/homeServiceStatuses.js
const LEGACY_HOME_STATUS_MAP = {
  Diagnosing: 'Approved',
  Repairing: 'On The Way',
  'Ready for Pickup': 'On The Way',
  Confirmed: 'Approved',
  'Pending Downpayment': 'Pending',
}

export function normalizeHomeServiceStatus(status) {
  if (!status) return 'Pending'
  return LEGACY_HOME_STATUS_MAP[status] || status
}

export const HOME_SERVICE_STATUSES = [
  'Pending',
  'Approved',
  'On The Way',
  'Completed',
]

export const HOME_SERVICE_STATUSES_WITH_CANCELLED = [...HOME_SERVICE_STATUSES, 'Cancelled']

export const HOME_SERVICE_STEPPER = [...HOME_SERVICE_STATUSES]

export const HOME_SERVICE_STATUS_LABELS = {
  Pending: 'Pending',
  Approved: 'Approved',
  'On The Way': 'On The Way',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
}

/** Technician fields may be edited only after approval */
export function canAssignHomeServiceTech(status) {
  return ['Approved', 'On The Way', 'Completed'].includes(status)
}

export const HOME_SERVICE_DOWNPAYMENT = 500
export const GCASH_ACCOUNT_NAME = 'Code & Locks'
export const GCASH_MOBILE = '0917 123 4567'
