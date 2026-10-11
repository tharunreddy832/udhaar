import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import {
  ArrowLeft,
  PlusCircle,
  CheckCircle2,
  Calendar,
  FileText,
  RefreshCw,
  AlertCircle,
  X,
  CreditCard,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  FileCheck2,
  Clock,
  BookOpen,
  Filter,
} from 'lucide-react';

export const CustomerLedger = () => {
  const { customerId } = useParams();
  const [ledger, setLedger] = useState(null);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [tab, setTab] = useState('ALL'); // 'ALL', 'CREDITS', 'PAYMENTS'

  // Modals
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Form states
  const [amount, setAmount] = useState('');
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reconciling, setReconciling] = useState(false);

  const fetchLedger = async () => {
    setLoading(true);
    setError('');
    try {
      const [ledgerRes, custRes] = await Promise.all([
        api.get(`/api/customers/${customerId}/ledger`),
        api.get(`/api/customers/${customerId}`).catch(() => null),
      ]);
      setLedger(ledgerRes.data);
      if (custRes?.data) setCustomerInfo(custRes.data);
    } catch (err) {
      console.error('Error fetching ledger:', err);
      setError('Failed to load ledger for this customer.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [customerId]);

  const handleAddCredit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/api/customers/${customerId}/credits`, {
        amount: parseFloat(amount),
        entryDate,
        description,
        sourceType: 'MANUAL',
      });
      setShowCreditModal(false);
      setAmount('');
      setDescription('');
      setSuccessMsg('Credit purchase added to customer ledger.');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchLedger();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record credit entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/api/customers/${customerId}/payments`, {
        amount: parseFloat(amount),
        paymentDate: entryDate,
        reference,
        description,
        sourceType: 'MANUAL',
      });
      setShowPaymentModal(false);
      setAmount('');
      setReference('');
      setDescription('');
      setSuccessMsg('Payment received and credited to customer ledger.');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchLedger();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRunReconciliation = async () => {
    setReconciling(true);
    setError('');
    try {
      const res = await api.post(`/api/reconciliation/customers/${customerId}/run`);
      const count = res.data?.length || 0;
      setSuccessMsg(
        `Auto-reconciliation complete! Found ${count} potential allocation match${
          count === 1 ? '' : 'es'
        }.`
      );
      setTimeout(() => setSuccessMsg(''), 5000);
      fetchLedger();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to run reconciliation algorithm.');
    } finally {
      setReconciling(false);
    }
  };

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  // Combine credits and payments into unified chronological stream
  const unifiedTransactions = [];
  if (ledger?.credits) {
    ledger.credits.forEach((c) => {
      unifiedTransactions.push({
        id: `credit-${c.id}`,
        type: 'CREDIT',
        date: c.entryDate,
        amount: Number(c.amount || 0),
        description: c.description || 'Credit Purchase',
        reference: c.sourceReference,
        sourceType: c.sourceType || 'MANUAL',
        createdAt: c.createdAt,
      });
    });
  }
  if (ledger?.payments) {
    ledger.payments.forEach((p) => {
      unifiedTransactions.push({
        id: `payment-${p.id}`,
        type: 'PAYMENT',
        date: p.paymentDate,
        amount: Number(p.amount || 0),
        description: p.description || 'Payment Received',
        reference: p.reference,
        sourceType: p.sourceType || 'MANUAL',
        createdAt: p.createdAt,
      });
    });
  }

  // Sort by date descending
  unifiedTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  const filteredTransactions = unifiedTransactions.filter((tx) => {
    if (tab === 'CREDITS') return tx.type === 'CREDIT';
    if (tab === 'PAYMENTS') return tx.type === 'PAYMENT';
    return true;
  });

  const hasOutstanding = (ledger?.outstandingBalance || 0) > 0;

  return (
    <div>
      {/* Back breadcrumb */}
      <div style={{ marginBottom: '16px' }}>
        <Link
          to="/customers"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--muted)',
            fontSize: '13.5px',
            fontWeight: '500',
          }}
        >
          <ArrowLeft size={15} />
          <span>Back to Customers</span>
        </Link>
      </div>

      {successMsg && (
        <div
          style={{
            backgroundColor: 'var(--emerald-bg)',
            border: '1px solid var(--emerald-border)',
            color: '#0E745B',
            padding: '12px 18px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13.5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
          <Link to="/reconciliation" className="btn btn-emerald btn-sm" style={{ textDecoration: 'none' }}>
            Review Matches →
          </Link>
        </div>
      )}

      {error && (
        <div
          style={{
            backgroundColor: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            color: 'var(--danger)',
            padding: '12px 18px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13.5px',
            marginBottom: '20px',
          }}
        >
          {error}
        </div>
      )}

      {/* 1. CUSTOMER IDENTITY & DOMINANT FINANCIAL SNAPSHOT */}
      <section className="ledger-header-box">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 className="page-title" style={{ marginBottom: 0 }}>
                {ledger?.customerName || customerInfo?.name || 'Customer'}
              </h1>
              {customerInfo?.active === false && (
                <span className="badge" style={{ background: 'var(--paper-inset)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                  Archived
                </span>
              )}
              <span className={`badge ${hasOutstanding ? 'badge-amber' : 'badge-emerald'}`}>
                {hasOutstanding ? 'Udhaar Due' : 'Account Settled'}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '6px', display: 'flex', gap: '14px' }}>
              <span>Party ID: #{customerId}</span>
              {customerInfo?.phone && <span>• Mobile: {customerInfo.phone}</span>}
              {customerInfo?.address && <span>• Notes: {customerInfo.address}</span>}
            </div>
          </div>

          {/* Action Dock */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleRunReconciliation}
              className="btn btn-secondary"
              disabled={reconciling}
              title="Pair unmatched credits & incoming payments"
            >
              <Sparkles size={15} color="#D97706" />
              <span>{reconciling ? 'Matching...' : 'Auto-Reconcile'}</span>
            </button>
            {customerInfo?.active !== false ? (
              <>
                <button onClick={() => setShowCreditModal(true)} className="btn btn-amber">
                  <PlusCircle size={15} />
                  <span>Record Credit</span>
                </button>
                <button onClick={() => setShowPaymentModal(true)} className="btn btn-emerald">
                  <CreditCard size={15} />
                  <span>Record Payment</span>
                </button>
              </>
            ) : (
              <span style={{ fontSize: '12.5px', color: 'var(--muted)', background: 'var(--paper-inset)', padding: '6px 12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                Customer is archived (new transactions disabled)
              </span>
            )}
          </div>
        </div>

        {/* 3 Metric Figures: Dominant Balance + Totals */}
        <div className="ledger-meta-bar">
          <div className="ledger-figures-strip">
            <div className="ledger-figure-item">
              <span className="ledger-figure-label">Net Outstanding Balance</span>
              <span
                className="ledger-figure-val"
                style={{
                  fontSize: '34px',
                  color: hasOutstanding ? '#B26E12' : 'var(--emerald)',
                }}
              >
                {formatINR(ledger?.outstandingBalance)}
              </span>
            </div>

            <div style={{ width: '1px', height: '40px', background: 'var(--border)' }} />

            <div className="ledger-figure-item">
              <span className="ledger-figure-label">Total Credit Issued</span>
              <span className="ledger-figure-val" style={{ color: '#B26E12' }}>
                {formatINR(ledger?.totalCredit)}
              </span>
            </div>

            <div style={{ width: '1px', height: '40px', background: 'var(--border)' }} />

            <div className="ledger-figure-item">
              <span className="ledger-figure-label">Total Payments Received</span>
              <span className="ledger-figure-val" style={{ color: 'var(--emerald)' }}>
                {formatINR(ledger?.totalPaid)}
              </span>
            </div>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} />
            <span>Real-time balance calculated from ledger transactions</span>
          </div>
        </div>
      </section>

      {/* 2. CHRONOLOGICAL TRANSACTION LEDGER WORKSPACE */}
      <section className="ledger-table-card">
        <div className="ledger-table-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setTab('ALL')}
              className={`filter-tab-btn ${tab === 'ALL' ? 'active' : ''}`}
            >
              All Chronological ({unifiedTransactions.length})
            </button>
            <button
              onClick={() => setTab('CREDITS')}
              className={`filter-tab-btn ${tab === 'CREDITS' ? 'active' : ''}`}
            >
              Credits Only ({ledger?.credits?.length || 0})
            </button>
            <button
              onClick={() => setTab('PAYMENTS')}
              className={`filter-tab-btn ${tab === 'PAYMENTS' ? 'active' : ''}`}
            >
              Payments Only ({ledger?.payments?.length || 0})
            </button>
          </div>

          <div style={{ fontSize: '12.5px', color: 'var(--muted)' }}>
            Showing {filteredTransactions.length} entries
          </div>
        </div>

        <table className="ledger-table">
          <thead>
            <tr>
              <th style={{ width: '130px' }}>Date</th>
              <th style={{ width: '130px' }}>Type</th>
              <th>Description / Memo</th>
              <th style={{ width: '160px' }}>Source / Reference</th>
              <th style={{ width: '150px', textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
                  Loading customer ledger history...
                </td>
              </tr>
            ) : filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '44px', color: 'var(--muted)' }}>
                  No transaction records found matching this view.
                </td>
              </tr>
            ) : (
              filteredTransactions.map((tx) => {
                const isCredit = tx.type === 'CREDIT';
                return (
                  <tr key={tx.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
                      {tx.date}
                    </td>

                    <td>
                      <span className={`badge ${isCredit ? 'badge-amber' : 'badge-emerald'}`}>
                        {isCredit ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                        {isCredit ? 'Udhaar Given' : 'Payment Received'}
                      </span>
                    </td>

                    <td>
                      <div style={{ fontWeight: '600', color: 'var(--ink)' }}>
                        {tx.description}
                      </div>
                    </td>

                    <td>
                      <span style={{ fontSize: '12.5px', color: 'var(--muted)' }}>
                        {tx.reference || tx.sourceType}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '14.5px',
                          fontWeight: '700',
                          color: isCredit ? '#B26E12' : 'var(--emerald)',
                        }}
                      >
                        {isCredit ? '+' : '-'}{formatINR(tx.amount)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      {/* MODAL: ADD CREDIT */}
      {showCreditModal && (
        <div className="modal-backdrop" onClick={() => setShowCreditModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Record Credit Purchase</h3>
              <button onClick={() => setShowCreditModal(false)} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddCredit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Credit Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    className="form-input"
                    placeholder="e.g. 1200.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Item / Goods Description</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Grocery items, 10kg Wheat"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowCreditModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-amber" disabled={submitting}>
                  {submitting ? 'Recording...' : 'Record Credit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD PAYMENT */}
      {showPaymentModal && (
        <div className="modal-backdrop" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Record Payment Received</h3>
              <button onClick={() => setShowPaymentModal(false)} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleRecordPayment}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Amount Paid (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    className="form-input"
                    placeholder="e.g. 1000.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Reference / UTR</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. UPI Ref / Cash / Cheque"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Settlement payment"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-emerald" disabled={submitting}>
                  {submitting ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
