/** Format YYYY-MM-DD for display */
export function formatServiceDate(dateStr) {
  if (!dateStr) return null
  try {
    const d = new Date(`${dateStr}T12:00:00`)
    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return dateStr
  }
}

/** Format HH:MM (24h input) to 12h display */
export function formatPreferredTime(timeStr) {
  if (!timeStr) return null
  const [h, m] = timeStr.split(':').map(Number)
  if (Number.isNaN(h)) return timeStr
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m || 0).padStart(2, '0')} ${period}`
}
