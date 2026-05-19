// ============================================================
// validators/customerValidator.js — Customer Payload Rules
// ============================================================

/**
 * Validates customer create/update payload.
 * @param {object} body - Request body.
 * @returns {string|null} Error string or null.
 */
function validateCustomerPayload(body) {
  const { full_name } = body;
  if (!full_name?.trim()) {
    return 'Full name is required.';
  }
  return null;
}

module.exports = { validateCustomerPayload };
