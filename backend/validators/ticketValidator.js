// ============================================================
// validators/ticketValidator.js
// ============================================================

const {
  HOME_SERVICE_STATUSES,
  isHomeService,
  normalizeHomeServiceStatus,
} = require('../utils/homeServiceStatuses');

const WALKIN_STATUSES = [
  'Pending',
  'Diagnosing',
  'Repairing',
  'Ready for Pickup',
  'Completed',
  'Cancelled',
];

const ALL_STATUSES = [...new Set([...WALKIN_STATUSES, ...HOME_SERVICE_STATUSES])];

const VALID_SERVICE_TYPES = ['Walk-In', 'Home Service'];
const VALID_PAYMENT_STATUSES = ['Unpaid', 'Partial', 'Paid'];

function getValidStatuses(serviceType) {
  return isHomeService(serviceType) ? HOME_SERVICE_STATUSES : WALKIN_STATUSES;
}

function validateTicketPayload(body) {
  const { customer_name, problem_desc, service_type, address, status } = body;
  if (!customer_name?.trim()) return 'Customer name is required.';
  if (!problem_desc?.trim())  return 'Problem description is required.';
  if (service_type && !VALID_SERVICE_TYPES.includes(service_type))
    return `Invalid service type. Must be one of: ${VALID_SERVICE_TYPES.join(', ')}.`;
  if (service_type === 'Home Service' && !address?.trim())
    return 'Address is required for Home Service.';
  if (status) {
    const resolvedType = service_type || 'Walk-In';
    const resolvedStatus = isHomeService(resolvedType)
      ? normalizeHomeServiceStatus(status)
      : status;
    const allowed = getValidStatuses(resolvedType);
    if (!allowed.includes(resolvedStatus))
      return `Invalid status for ${resolvedType}. Allowed: ${allowed.join(', ')}.`;
  }
  return null;
}

function validateStatusTransition(serviceType, _currentStatus, newStatus) {
  if (!newStatus) return 'New status is required.';
  const resolvedType = serviceType || 'Walk-In';
  const resolvedStatus = isHomeService(resolvedType)
    ? normalizeHomeServiceStatus(newStatus)
    : newStatus;
  const allowed = getValidStatuses(resolvedType);
  if (!allowed.includes(resolvedStatus))
    return `Invalid status. Must be one of: ${allowed.join(', ')}.`;
  return null;
}

/** Home service: technician only after Approved */
function validateHomeServiceTech(serviceType, status, assignedTech, previousTech) {
  if (!isHomeService(serviceType)) return null;
  const nextTech = (assignedTech || '').trim();
  const prevTech = (previousTech || '').trim();
  if (!nextTech || nextTech === prevTech) return null;
  if (!['Approved', 'On The Way', 'Completed'].includes(status)) {
    return 'Assign a technician only after the home service request is approved.';
  }
  return null;
}

module.exports = {
  validateTicketPayload,
  validateStatusTransition,
  validateHomeServiceTech,
  VALID_STATUSES: ALL_STATUSES,
  WALKIN_STATUSES,
  HOME_SERVICE_STATUSES,
  VALID_SERVICE_TYPES,
  getValidStatuses,
};
