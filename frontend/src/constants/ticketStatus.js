// Unified repair ticket status pipeline (staff + public tracking)
export const TICKET_STATUSES = [
  'Pending',
  'Diagnosing',
  'Repairing',
  'Ready for Pickup',
  'Completed',
]

export const TICKET_STATUSES_WITH_CANCELLED = [...TICKET_STATUSES, 'Cancelled']

export const NEXT_STATUS = {
  Pending:            'Diagnosing',
  Diagnosing:         'Repairing',
  Repairing:          'Ready for Pickup',
  'Ready for Pickup': 'Completed',
  Completed:          null,
  Cancelled:          null,
}

export const STEPPER_STATUSES = [...TICKET_STATUSES]

// Display labels for queue / filters
export const STATUS_LABELS = {
  Pending:            'Pending',
  Approved:           'Approved',
  'On The Way':       'On The Way',
  Diagnosing:         'Diagnosing',
  Repairing:          'Repairing',
  'Ready for Pickup': 'Ready for Pickup',
  Completed:          'Completed',
  Cancelled:          'Cancelled',
}

/** Status values shown in list filters (walk-in + home service) */
export const FILTER_STATUSES = [
  ...new Set([...TICKET_STATUSES, 'Approved', 'On The Way']),
]
