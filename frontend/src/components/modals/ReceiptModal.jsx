// components/modals/ReceiptModal.jsx — thermal-style repair ticket
import { useState, useEffect } from 'react'
import api from '../../lib/axios'

const php = (v) => `₱${parseFloat(v || 0).toFixed(2)}`

export default function ReceiptModal({ ticketId, onClose }) {
  const [ticket,  setTicket]  = useState(null)
  const [billing, setBilling] = useState(null)
  const [parts,   setParts]   = useState([])
  const [checklist, setChecklist] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [tRes, bRes, pRes, cRes] = await Promise.allSettled([
          api.get(`/tickets/${ticketId}`),
          api.get(`/payments/summary/${ticketId}`),
          api.get(`/inventory/ticket/${ticketId}`),
          api.get(`/tickets/${ticketId}/checklist`),
        ])
        if (tRes.status === 'fulfilled') setTicket(tRes.value.data)
        else setError('Could not load ticket data.')
        if (bRes.status === 'fulfilled') setBilling(bRes.value.data)
        if (pRes.status === 'fulfilled') setParts(pRes.value.data || [])
        if (cRes.status === 'fulfilled') setChecklist(cRes.value.data || [])
      } catch {
        setError('Failed to load repair ticket.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [ticketId])

  const onBackdrop = (e) => { if (e.target === e.currentTarget) onClose() }

  const serviceFee  = parseFloat(billing?.labor_cost ?? ticket?.estimated_cost ?? 0)
  const partsCost   = parseFloat(billing?.parts_cost ?? 0)
  const amountPaid  = parseFloat(billing?.total_paid ?? 0)
  const grandTotal  = parseFloat(billing?.grand_total ?? serviceFee + partsCost)
  const remaining   = parseFloat(billing?.remaining_balance ?? Math.max(0, grandTotal - amountPaid))
  const expectedDp  = parseFloat(billing?.expected_downpayment ?? 0)
  const problemItems = checklist.filter(i => (i.checklist_type || 'Repair') === 'Problem')
  const repairSteps = checklist.filter(i => (i.checklist_type || 'Repair') === 'Repair')
  const isHomeService = ticket?.service_type === 'Home Service'
  const downpaymentPaid = isHomeService && amountPaid > 0
    ? Math.min(amountPaid, expectedDp || amountPaid)
    : 0

  return (
    <>
      <style>{`
        @media print {
          body > * { visibility: hidden !important; }
          #ticket-print-area, #ticket-print-area * { visibility: visible !important; }
          #ticket-print-area {
            position: fixed !important; left: 50% !important; transform: translateX(-50%) !important;
            top: 0 !important; width: 80mm !important; max-width: 80mm !important;
            padding: 8mm 6mm !important; margin: 0 !important;
            border: none !important; box-shadow: none !important; background: #fff !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div onClick={onBackdrop} className="modal-overlay" style={{ zIndex: 1000 }}>
        <div style={{
          background: '#fff', borderRadius: 8, width: '100%', maxWidth: 360,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)', margin: 'auto',
        }} onClick={e => e.stopPropagation()}>

          <div className="no-print" style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 14px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
          }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>🧾 Repair Ticket</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => window.print()}>
                🖨️ Print
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
                ✕ Close
              </button>
            </div>
          </div>

          <div
            id="ticket-print-area"
            style={{
              padding: '20px 18px', fontFamily: '"Courier New", Courier, monospace',
              fontSize: 12, lineHeight: 1.45, color: '#0f172a', maxWidth: 300, margin: '0 auto',
            }}
          >
            {loading && <p style={{ textAlign: 'center' }}>Loading...</p>}
            {error && <p style={{ textAlign: 'center', color: '#c53030' }}>{error}</p>}
            {!loading && !error && ticket && (
              <>
                <div style={{ textAlign: 'center', borderBottom: '1px dashed #94a3b8', paddingBottom: 10, marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>CODE &amp; LOCKS</div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>Phone Repair · Tambo, Pamplona, Camarines Sur</div>
                </div>
                <TicketRow label="TICKET" value={ticket.ticket_number} bold />
                <TicketRow label="DATE" value={new Date(ticket.received_date || ticket.created_at).toLocaleDateString('en-PH')} />
                <div style={{ borderTop: '1px dashed #cbd5e1', margin: '10px 0' }} />
                <TicketRow label="CUSTOMER" value={ticket.customer_name} />
                <TicketRow label="DEVICE" value={[ticket.device_brand, ticket.device_type].filter(Boolean).join(' ')} />
                <TicketRow label="ISSUE" value={ticket.problem_desc} />
                <TicketRow label="STATUS" value={ticket.status} bold />
                <TicketRow label="SERVICE" value={ticket.service_type || 'Walk-In'} />
                <TicketRow label="TECH" value={ticket.assigned_tech || '—'} />
                {billing?.downpayment_reference && (
                  <TicketRow label="GCASH REF" value={billing.downpayment_reference} />
                )}

                {problemItems.length > 0 && (
                  <>
                    <div style={{ borderTop: '1px dashed #cbd5e1', margin: '10px 0' }} />
                    <div style={{ fontWeight: 700, fontSize: 10, marginBottom: 6 }}>DEVICE ISSUES</div>
                    {problemItems.map(item => (
                      <div key={item.item_id} style={{ display: 'flex', gap: 6, marginBottom: 3, fontSize: 10 }}>
                        <span>{item.is_checked ? '☑' : '☐'}</span>
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </>
                )}

                {repairSteps.length > 0 && (
                  <>
                    <div style={{ borderTop: '1px dashed #cbd5e1', margin: '10px 0' }} />
                    <div style={{ fontWeight: 700, fontSize: 10, marginBottom: 6 }}>REPAIR STEPS</div>
                    {repairSteps.map((item, i) => (
                      <div key={item.item_id || i} style={{ marginBottom: 3, fontSize: 10 }}>
                        {i + 1}. {item.label}
                      </div>
                    ))}
                  </>
                )}

                {parts.length > 0 && (
                  <>
                    <div style={{ borderTop: '1px dashed #cbd5e1', margin: '10px 0' }} />
                    <div style={{ fontWeight: 700, fontSize: 10, marginBottom: 6 }}>PARTS &amp; MATERIALS</div>
                    {parts.map((p, i) => {
                      const isCustomer = parseFloat(p.unit_price) === 0
                      const lineTotal = p.quantity * parseFloat(p.unit_price || 0)
                      return (
                        <div key={i} style={{ marginBottom: 4, fontSize: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>
                              {p.part_name}
                              {isCustomer ? ' (Customer Part)' : ''} ×{p.quantity}
                            </span>
                            <span>{php(isCustomer ? 0 : lineTotal)}</span>
                          </div>
                          {!isCustomer && (
                            <div style={{ color: '#94a3b8', fontSize: 9 }}>
                              @ {php(p.unit_price)} each
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {parts.some(p => parseFloat(p.unit_price) === 0) && (
                      <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 6, fontStyle: 'italic' }}>
                        * Customer-supplied part(s) — no charge for materials.
                      </div>
                    )}
                  </>
                )}

                <div style={{ borderTop: '1px dashed #cbd5e1', margin: '10px 0' }} />
                <TicketRow label="SERVICE FEE" value={php(serviceFee)} />
                {partsCost > 0 && <TicketRow label="PARTS" value={php(partsCost)} />}
                <TicketRow label="TOTAL" value={php(grandTotal)} bold />
                {isHomeService && (
                  <TicketRow
                    label="DOWNPAYMENT"
                    value={downpaymentPaid > 0 ? php(downpaymentPaid) : (expectedDp > 0 ? `${php(expectedDp)} (pending)` : '—')}
                  />
                )}
                <TicketRow label="PAID" value={php(amountPaid)} />
                <TicketRow label="REMAINING" value={remaining > 0 ? php(remaining) : 'SETTLED'} bold />
                <div style={{ borderTop: '1px dashed #cbd5e1', marginTop: 12, paddingTop: 8, textAlign: 'center', fontSize: 9, color: '#94a3b8' }}>
                  7-days  warranty · Thank you!
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function TicketRow({ label, value, bold }) {
  if (!value && value !== 0) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
      <span style={{ color: '#64748b', fontSize: 10 }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 400, textAlign: 'right', maxWidth: '65%', wordBreak: 'break-word' }}>
        {value}
      </span>
    </div>
  )
}
