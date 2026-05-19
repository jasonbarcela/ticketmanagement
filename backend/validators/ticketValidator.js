// ============================================================
// validators/ticketValidator.js
// ============================================================

const VALID_STATUSES = [
  'Pending',
  'Diagnostic',
  'In Progress',
  'Ready for Pickup',
  'Completed',
];

const VALID_SERVICE_TYPES = ['Walk-In', 'On-Site', 'Pick-Up'];
const VALID_PAYMENT_STATUSES = ['Unpaid', 'Partial', 'Paid'];

function validateTicketPayload(body) {
  const { customer_name, problem_desc, service_type, address } = body;
  if (!customer_name?.trim()) return 'Customer name is required.';
  if (!problem_desc?.trim())  return 'Problem description is required.';
  if (service_type && !VALID_SERVICE_TYPES.includes(service_type))
    return `Invalid service type. Must be one of: ${VALID_SERVICE_TYPES.join(', ')}.`;
  if (service_type === 'On-Site' && !address?.trim())
    return 'Address is required for On-Site tickets.';
  return null;
}

function validateStatusTransition(currentStatus, newStatus) {
  if (!newStatus) return 'New status is required.';
  if (!VALID_STATUSES.includes(newStatus))
    return `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}.`;
  // Allow any direction — admins can correct mistakes
  return null;
}

module.exports = { validateTicketPayload, validateStatusTransition, VALID_STATUSES };
