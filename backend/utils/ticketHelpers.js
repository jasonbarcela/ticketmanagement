// ============================================================
// utils/ticketHelpers.js — Ticket Utility Functions
// ============================================================

function formatTicketNumber(id) {
  const year = new Date().getFullYear();
  return `CL-${year}-${String(id).padStart(5, '0')}`;
}

/** All new repairs start in the queue as Pending. */
function getInitialStatus(_serviceType) {
  return 'Pending';
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

module.exports = { formatTicketNumber, getInitialStatus, today };
