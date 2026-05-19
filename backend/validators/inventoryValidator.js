// ============================================================
// validators/inventoryValidator.js — Inventory Payload Rules
// ============================================================

/**
 * Validates an "adjust stock" payload (part_id + new_quantity).
 * @returns {string|null}
 */
function validateStockAdjust(body) {
  const { part_id, new_quantity } = body;
  if (!part_id || String(part_id).trim() === '') {
    return 'part_id is required (e.g. PRT-001).';
  }
  if (new_quantity === undefined || new_quantity === null || new_quantity === '') {
    return 'new_quantity is required.';
  }
  const qty = parseInt(new_quantity, 10);
  if (isNaN(qty) || qty < 0) {
    return 'new_quantity must be a non-negative integer.';
  }
  return null;
}

/**
 * Validates an "add new part" payload.
 * @returns {string|null}
 */
function validateNewPart(body) {
  const { part_name, quantity, cost_price } = body;
  if (!part_name?.trim()) {
    return 'part_name (specification name) is required.';
  }
  if (quantity !== undefined) {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 0) return 'quantity must be a non-negative integer.';
  }
  if (cost_price !== undefined) {
    const price = parseFloat(cost_price);
    if (isNaN(price) || price < 0) return 'cost_price must be a valid non-negative number.';
  }
  return null;
}

module.exports = { validateStockAdjust, validateNewPart };
