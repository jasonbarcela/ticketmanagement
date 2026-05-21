// ============================================================
// components/status/StockBadge.jsx — Inventory Stock Level Pill
//
// 4-tier color coding:
//   ⛔ Out of Stock  (0)       — red
//   ⚠️ Critical (1)            — amber
//   🔶 Low (2–4)               — yellow
//   ✓  Sufficient (5+)         — green
// ============================================================
export default function StockBadge({ quantity }) {
  let bg, color, label
  if (quantity === 0) {
    bg = '#FEE2E2'; color = '#991B1B'; label = '⛔ Out of Stock'
  } else if (quantity === 1) {
    bg = '#FEF3C7'; color = '#92400E'; label = `⚠️ Critical — ${quantity}`
  } else if (quantity <= 4) {
    bg = '#FEF9C3'; color = '#713F12'; label = `🔶 Low — ${quantity} units`
  } else {
    bg = '#D1FAE5'; color = '#065F46'; label = `✓ ${quantity} units`
  }

  return (
    <span style={{
      display:      'inline-block',
      padding:      '4px 12px',
      borderRadius: 20,
      fontSize:     12,
      fontWeight:   700,
      background:   bg,
      color,
      whiteSpace:   'nowrap',
    }}>
      {label}
    </span>
  )
}
