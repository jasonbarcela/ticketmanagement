// Home Service ticket workflow (separate from walk-in repair pipeline)
const HOME_SERVICE_STATUSES = ['Pending', 'Approved', 'On The Way', 'Completed', 'Cancelled'];

/** Legacy walk-in statuses that may exist on old home service rows */
const LEGACY_HOME_STATUS_MAP = {
  Diagnosing: 'Approved',
  Repairing: 'On The Way',
  'Ready for Pickup': 'On The Way',
  Confirmed: 'Approved',
  'Pending Downpayment': 'Pending',
};

const LEGACY_HOME_STATUSES = Object.keys(LEGACY_HOME_STATUS_MAP);

function normalizeHomeServiceStatus(status) {
  if (!status) return 'Pending';
  return LEGACY_HOME_STATUS_MAP[status] || status;
}

function isLegacyHomeServiceStatus(status) {
  return LEGACY_HOME_STATUSES.includes(status);
}

const HOME_SERVICE_LOG_LABELS = {
  Pending: 'Home service request submitted',
  Approved: 'Booking approved.',
  'On The Way': 'Status updated to On The Way',
  Completed: 'Home service completed',
};

function isHomeService(serviceType) {
  return serviceType === 'Home Service';
}

function statusLogMessage(newStatus, context = {}) {
  if (context.techAssigned) return 'Technician assigned';
  if (HOME_SERVICE_LOG_LABELS[newStatus]) return HOME_SERVICE_LOG_LABELS[newStatus];
  return `Status updated to ${newStatus}`;
}

module.exports = {
  HOME_SERVICE_STATUSES,
  HOME_SERVICE_LOG_LABELS,
  LEGACY_HOME_STATUS_MAP,
  LEGACY_HOME_STATUSES,
  isHomeService,
  normalizeHomeServiceStatus,
  isLegacyHomeServiceStatus,
  statusLogMessage,
};
