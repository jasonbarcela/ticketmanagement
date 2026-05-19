// ============================================================
// pages/billing/ReceiptPage.jsx — Professional Printable Invoice
//
// Structured with CSS Print Media Queries to strip away headers,
// sidebars, and action buttons when window.print() is executed.
// Provides a clean, audit-grade paper layout for the panel.
// ============================================================
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ticketService } from '../../services/ticketService';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';

export default function ReceiptPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [parts, setParts] = useState([]);
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadReceiptContext() {
      try {
        // 1. Fetch Core Ticket Row
        const ticketData = await ticketService.getOne(id);
        setTicket(ticketData);

        // 2. Fetch Linked Parts Matrix
        try {
          const partsRes = await axios.get(`/api/inventory/ticket/${id}`);
          setParts(partsRes.data || []);
        } catch (pErr) {
          console.error('Failed to load receipt material rows:', pErr);
        }

        // 3. Fetch Dynamic Billing Summary Ledger Calculations
        try {
          const billingRes = await axios.get(`/api/payments/summary/${id}`);
          setBilling(billingRes.data);
        } catch (bErr) {
          console.error('Failed to calculate financial balances:', bErr);
        }

      } catch (err) {
        setError(err?.response?.data?.error || 'Failed to generate financial invoice statements.');
      } finally {
        setLoading(false);
      }
    }
    loadReceiptContext();
  }, [id]);

  if (loading) return <Spinner message="Generating Official Statement..." />;
  if (error) return <Alert type="error">{error}</Alert>;
  if (!ticket) return <Alert type="error">Invoice context source missing.</Alert>;

  return (
    <>
      {/* ── INTERACTIVE CONTROLS (Hidden during actual physical printing) ── */}
      <div className="no-print" style={{
        background: '#fff',
        padding: '16px 20px',
        borderRadius: 8,
        border: '1px solid var(--gray-200)',
        marginBottom: 24,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <div>
          <h4 style={{ margin: '0 0 4px 0', color: 'var(--navy)' }}>Print Preview Mode</h4>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-500)' }}>
            The application navigation wrappers will automatically hide when executing print actions.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => window.print()}>🖨️ Print Invoice Slip</button>
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Return to Ticket</button>
        </div>
      </div>

      {/* ── PRINT-MEDIA EMULATOR CANVAS CONTAINER ── */}
      <div className="receipt-container" style={{
        background: '#fff',
        maxWidth: '800px',
        margin: '0 auto',
        padding: '40px',
        border: '1px solid #e2e8f0',
        borderRadius: '4px',
        fontFamily: '"Inter", "Segoe UI", sans-serif',
        color: '#1a202c'
      }}>
        
        {/* Invoice Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #edf2f7', paddingBottom: '20px', marginBottom: '24px' }}>
          <div>
            <h1 style={{ margin: '0 0 6px 0', fontSize: '24px', fontWeight: 800, color: '#1a365d', letterSpacing: '-0.5px' }}>
              CODE & LOCKS
            </h1>
            <p style={{ margin: '0', fontSize: '12px', color: '#718096', lineHeight: '1.5' }}>
              Premium Device Repairs & Physical Security Services<br />
              123 Innovation Boulevard, Tech City, Cavite<br />
              Contact: +63 (912) 345-6789 | support@codeandlocks.com
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: 700, color: '#4a5568' }}>INVOICE RECEIPT</h2>
            <div style={{ fontSize: '13px', color: '#4a5568', lineHeight: '1.6' }}>
              <div><strong>Invoice No:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{ticket.ticket_number}</span></div>
              <div><strong>Date Issued:</strong> {new Date(ticket.created_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}</div>
              <div><strong>Status:</strong> <span style={{ fontWeight: 700, color: billing?.remaining_balance === 0 ? 'green' : '#dd6b20' }}>{billing?.payment_status?.toUpperCase() || ticket.payment_status?.toUpperCase()}</span></div>
            </div>
          </div>
        </div>

        {/* Client & Device Meta Layout Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px', fontSize: '13px' }}>
          <div>
            <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', tracking: '0.5px', color: '#a0aec0', margin: '0 0 8px 0' }}>
              BILLED TO (CUSTOMER)
            </h3>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#2d3748', marginBottom: '4px' }}>{ticket.customer_name}</div>
            <div style={{ color: '#4a5568', lineHeight: '1.5' }}>
              {ticket.contact_number && <div>📞 {ticket.contact_number}</div>}
              {ticket.customer_email && <div>✉️ {ticket.customer_email}</div>}
              {ticket.address && <div style={{ marginTop: '4px', maxWidth: '300px' }}>📍 {ticket.address}</div>}
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', tracking: '0.5px', color: '#a0aec0', margin: '0 0 8px 0' }}>
              REPAIR ASSET RECONCILIATION
            </h3>
            <div style={{ fontWeight: 600, color: '#2d3748', marginBottom: '4px' }}>
              📱 {ticket.device_brand} — {ticket.device_type}
            </div>
            <div style={{ color: '#4a5568', lineHeight: '1.5' }}>
              {ticket.imei && <div><strong>IMEI/SN:</strong> <span style={{ fontFamily: 'monospace' }}>{ticket.imei}</span></div>}
              <div><strong>Service Type:</strong> {ticket.service_type}</div>
              <div style={{ marginTop: '4px', fontStyle: 'italic', color: '#718096' }}>
                <strong>Reported Issue:</strong> "{ticket.problem_desc}"
              </div>
            </div>
          </div>
        </div>

        {/* Itemized Line Ledger Items Breakdown Matrix Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left', marginBottom: '24px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #cbd5e0', background: '#f7fafc', color: '#4a5568' }}>
              <th style={{ padding: '10px 12px', fontWeight: 700 }}>Description Description / Structural Scope</th>
              <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center', width: '80px' }}>Quantity</th>
              <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right', width: '120px' }}>Unit Cost</th>
              <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right', width: '120px' }}>Extended Total</th>
            </tr>
          </thead>
          <tbody>
            {/* Labor / Operational Entry Row */}
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '12px' }}>
                <div style={{ fontWeight: 600 }}>Technical Diagnostics & System Repair Labor Fee</div>
                <div style={{ fontSize: '11px', color: '#718096', marginTop: '2px' }}>Assigned Operative: {ticket.assigned_tech || 'Shop Fleet Technician Pool'}</div>
              </td>
              <td style={{ padding: '12px', textAlign: 'center' }}>1</td>
              <td style={{ padding: '12px', textAlign: 'right' }}>₱{parseFloat(billing ? billing.labor_cost : ticket.estimated_cost).toFixed(2)}</td>
              <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>₱{parseFloat(billing ? billing.labor_cost : ticket.estimated_cost).toFixed(2)}</td>
            </tr>

            {/* Hardware Part Allocations Sub-rows Iterations */}
            {parts.map((part, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '12px' }}>
                  <div style={{ fontWeight: 600 }}>{part.part_name}</div>
                  <div style={{ fontSize: '11px', color: '#718096', fontFamily: 'monospace', marginTop: '2px' }}>SKU Component: {part.part_code}</div>
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>{part.quantity}</td>
                <td style={{ padding: '12px', textAlign: 'right' }}>₱{parseFloat(part.unit_price).toFixed(2)}</td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>₱{(part.quantity * part.unit_price).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Invoice Statement Summary Balance Matrix Footer Cards */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '13px' }}>
          <div style={{ width: '320px', lineHeight: '2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
              <span style={{ color: '#718096' }}>Service / Labor Subtotal:</span>
              <span style={{ fontWeight: 500 }}>₱{parseFloat(billing ? billing.labor_cost : ticket.estimated_cost).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginTop: '4px' }}>
              <span style={{ color: '#718096' }}>Hardware Material Costs:</span>
              <span style={{ fontWeight: 500 }}>₱{parseFloat(billing ? billing.parts_cost : 0).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #cbd5e0', padding: '6px 0', marginTop: '4px', fontSize: '15px', fontWeight: 700, color: '#1a365d' }}>
              <span>Grand Aggregated Total:</span>
              <span>₱{parseFloat(billing ? billing.grand_total : ticket.estimated_cost).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginTop: '6px', color: 'green', fontWeight: 600 }}>
              <span>Total Historical Payments Applied:</span>
              <span>₱{parseFloat(billing ? billing.total_paid : 0).toFixed(2)}</span>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              padding: '8px 12px', 
              marginTop: '8px', 
              borderRadius: '4px',
              background: billing?.remaining_balance > 0 ? '#fff5f5' : '#f0fff4',
              color: billing?.remaining_balance > 0 ? '#c53030' : '#22543d',
              fontWeight: 700,
              fontSize: '14px',
              border: billing?.remaining_balance > 0 ? '1px solid #fed7d7' : '1px solid #c6f6d5'
            }}>
              <span>Outstanding Balance Due:</span>
              <span>
                {billing?.remaining_balance > 0 
                  ? `₱${parseFloat(billing.remaining_balance).toFixed(2)}` 
                  : 'ACCOUNT SETTLED'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Disclaimer/Fineprint Blocks */}
        <div style={{ marginTop: '50px', borderTop: '1px dashed #cbd5e0', paddingTop: '20px', textAlign: 'center', fontSize: '11px', color: '#a0aec0', lineHeight: '1.6' }}>
          <p style={{ margin: '0 0 4px 0', fontWeight: 600, color: '#718096' }}>Thank you for trusting Code & Locks!</p>
          <p style={{ margin: 0 }}>
            All hardware replacements carry a standard 90-day structural shop warranty from the time of closeout.<br />
            This statement functions as an official system invoice for verification and defense panel demonstration cycles.
          </p>
        </div>

      </div>

      {/* ── CENTRALIZED PRINT INJECTION MEDIA INLINE QUERIES ── */}
      <style>{`
        @media print {
          /* Hide global view structures like Sidebars, Footers, and Ribbon Bars */
          body, main, #root, .app-layout, .sidebar, .navbar, .no-print {
            visibility: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
            background: none !important;
            box-shadow: none !important;
          }
          /* Isolate and map the emulator block to pin securely on full page size bounds */
          .receipt-container {
            visibility: visible !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </>
  );
}