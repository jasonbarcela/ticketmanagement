// ============================================================
// utils/ticketHelpers.js — Ticket Utility Functions
// ============================================================

/**
 * Formats a numeric DB insertId as a CL-YEAR-SEQUENCE ticket number.
 * @param {number} id - The integer primary key.
 * @returns {string}  - e.g. "CL-2026-00042"
 */
function formatTicketNumber(id) {
  const year = new Date().getFullYear();
  return `CL-${year}-${String(id).padStart(5, '0')}`;
}

/**
 * Derives the initial ticket status from the service type.
 * Split-routing business rule:
 *   Walk-In      → 'Confirmed'           (no downpayment needed)
 *   Home Service → 'Pending Downpayment' (must confirm before proceeding)
 * @param {string} serviceType
 * @returns {string}
 */
function getInitialStatus(serviceType) {
  return serviceType === 'Home Service' ? 'Pending Downpayment' : 'Confirmed';
}

/**
 * Returns today's date as a YYYY-MM-DD string.
 * @returns {string}
 */
function today() {
  return new Date().toISOString().slice(0, 10);
}

module.exports = { formatTicketNumber, getInitialStatus, today };