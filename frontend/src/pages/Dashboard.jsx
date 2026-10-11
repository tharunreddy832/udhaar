import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  UploadCloud,
  FileCheck2,
  RefreshCw,
  AlertTriangle,
  Clock,
  PlusCircle,
  CreditCard,
  UserPlus,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  X,
  Sparkles,
} from 'lucide-react';

export const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Quick Action Modals
  const [customers, setCustomers] = useState([]);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Form states
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  const [selectedCustId, setSelectedCustId] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [txDesc, setTxDesc] = useState('');
  const [txRef, setTxRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchSummary = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/dashboard/summary');
      setSummary(res.data);
    } catch (err) {
      console.error('Failed to fetch dashboard summary:', err);
      setError('Could not load dashboard statistics. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomersList = async () => {
    try {
      const res = await api.get('/api/customers');
      setCustomers(res.data || []);
      if (res.data?.length > 0 && !selectedCustId) {
        setSelectedCustId(res.data[0].id.toString());
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchCustomersList();
  }, []);

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/customers', {
        name: newCustName,
        phone: newCustPhone,
        address: newCustAddress,
      });
      setShowAddCustomerModal(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustAddress('');
      setActionSuccess('Customer registered successfully');
      setTimeout(() => setActionSuccess(''), 4000);
      fetchSummary();
      fetchCustomersList();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordCredit = async (e) => {
    e.preventDefault();
    if (!selectedCustId) return;
    setSubmitting(true);
    try {
      await api.post(`/api/customers/${selectedCustId}/credits`, {
        amount: parseFloat(txAmount),
        entryDate: txDate,
        description: txDesc || 'Credit entry',
        sourceType: 'MANUAL',
      });
      setShowCreditModal(false);
      setTxAmount('');
      setTxDesc('');
      setActionSuccess('Credit entry recorded successfully');
      setTimeout(() => setActionSuccess(''), 4000);
      fetchSummary();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record credit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedCustId) return;
    setSubmitting(true);
    try {
      await api.post(`/api/customers/${selectedCustId}/payments`, {
        amount: parseFloat(txAmount),
        paymentDate: txDate,
        reference: txRef || 'Direct Payment',
        description: txDesc || 'Payment received',
        sourceType: 'MANUAL',
      });
      setShowPaymentModal(false);
      setTxAmount('');
      setTxDesc('');
      setTxRef('');
      setActionSuccess('Payment recorded successfully');
      setTimeout(() => setActionSuccess(''), 4000);
      fetchSummary();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  // Combine real date-based activity for compact cash-flow summary
  const activityDatesMap = {};
  if (summary?.recentCredits) {
    summary.recentCredits.forEach((c) => {
      const d = c.entryDate;
      if (!activityDatesMap[d]) activityDatesMap[d] = { credits: 0, payments: 0 };
      activityDatesMap[d].credits += Number(c.amount || 0);
    });
  }
  if (summary?.recentPayments) {
    summary.recentPayments.forEach((p) => {
      const d = p.paymentDate;
      if (!activityDatesMap[d]) activityDatesMap[d] = { credits: 0, payments: 0 };
      activityDatesMap[d].payments += Number(p.amount || 0);
    });
  }
  const dateSummaries = Object.keys(activityDatesMap)
    .sort()
    .reverse()
    .slice(0, 5)
    .map((date) => ({
      date,
      ...activityDatesMap[date],
    }));

  const totalAttentionItems =
    (summary?.pendingReconciliationCount || 0) +
    (summary?.recordsAwaitingReviewCount || 0) +
    (summary?.pendingImportsCount || 0);

  return (
    <div className="command-grid">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Command Center</h1>
          <p className="page-subtitle">
            AI-reconciled financial ledger, active customer balances, and verification queues
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={fetchSummary} className="btn btn-secondary btn-sm" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh Workspace</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
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
            gap: '10px',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{actionSuccess}</span>
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
          }}
        >
          {error}
        </div>
      )}

      {/* 1. DOMINANT OUTSTANDING BALANCE HERO BANNER */}
      <section className="hero-balance-banner">
        <div className="hero-balance-content">
          <div className="hero-kicker">
            <Wallet size={15} />
            <span>Net Uncollected Udhaar Balance</span>
          </div>

          <div className="hero-balance-figure">
            <span>{formatINR(summary?.totalOutstandingCredit)}</span>
          </div>

          <div className="hero-balance-meta">
            <span>
              Active across <strong>{summary?.totalCustomers || 0} registered accounts</strong>
            </span>
            <span>•</span>
            <span style={{ color: '#E9A23B' }}>
              Pending Collections
            </span>
          </div>
        </div>

        {/* Prominent Command Actions */}
        <div className="hero-actions">
          <button
            onClick={() => setShowCreditModal(true)}
            className="btn btn-amber"
            title="Record a new udhaar credit given to a customer"
          >
            <PlusCircle size={16} />
            <span>Record Credit</span>
          </button>

          <button
            onClick={() => setShowPaymentModal(true)}
            className="btn btn-emerald"
            title="Record payment received from a customer"
          >
            <CreditCard size={16} />
            <span>Record Payment</span>
          </button>

          <button
            onClick={() => setShowAddCustomerModal(true)}
            className="btn btn-secondary"
            title="Add new customer account"
          >
            <UserPlus size={16} />
            <span>Add Customer</span>
          </button>

          <Link
            to="/imports/upload"
            className="btn btn-dark"
            title="Upload statement or chat export for AI extraction"
          >
            <UploadCloud size={16} />
            <span>Import Records</span>
          </Link>
        </div>
      </section>

      {/* 2. SECONDARY FINANCIAL METRICS STRIP */}
      <section className="stats-strip">
        <div className="stat-strip-card">
          <div className="stat-strip-label">
            <span>Total Credit Recorded</span>
            <ArrowUpRight size={16} color="var(--amber)" />
          </div>
          <div className="stat-strip-val" style={{ color: '#B26E12' }}>
            {formatINR(summary?.totalCreditRecorded)}
          </div>
          <div className="stat-strip-meta">Cumulative credit issued to date</div>
        </div>

        <div className="stat-strip-card">
          <div className="stat-strip-label">
            <span>Total Payments Received</span>
            <ArrowDownLeft size={16} color="var(--emerald)" />
          </div>
          <div className="stat-strip-val" style={{ color: 'var(--emerald)' }}>
            {formatINR(summary?.totalPaymentsRecorded)}
          </div>
          <div className="stat-strip-meta">Confirmed collections received</div>
        </div>

        <div className="stat-strip-card">
          <div className="stat-strip-label">
            <span>Active Customers</span>
            <Users size={16} color="var(--cobalt)" />
          </div>
          <div className="stat-strip-val" style={{ color: 'var(--ink)' }}>
            {summary?.totalCustomers || 0}
          </div>
          <div className="stat-strip-meta">Registered business store parties</div>
        </div>
      </section>

      {/* 3. NEEDS YOUR ATTENTION SECTION (Real Backend Data) */}
      <section className="attention-section">
        <div className="attention-header">
          <div className="attention-title-group">
            <AlertTriangle size={18} color="var(--amber)" />
            <h2 className="attention-title">Needs Your Attention</h2>
          </div>
          {totalAttentionItems === 0 ? (
            <span className="badge badge-emerald">
              <CheckCircle2 size={13} />
              All Verified & Reconciled
            </span>
          ) : (
            <span className="badge badge-amber">{totalAttentionItems} Actions Pending</span>
          )}
        </div>

        {totalAttentionItems === 0 ? (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              backgroundColor: 'var(--surface)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
            }}
          >
            <p style={{ fontSize: '14px', color: 'var(--ink)', fontWeight: '600' }}>
              Your ledger is completely up to date!
            </p>
            <p style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '4px' }}>
              All uploaded statements, customer matches, and payment allocations have been reconciled.
            </p>
          </div>
        ) : (
          <div className="attention-cards-grid">
            {/* Reconciliation Match Queue */}
            <div className="attention-item">
              <div className="attention-item-left">
                <span className="attention-item-count">
                  {summary?.pendingReconciliationCount || 0}
                </span>
                <span className="attention-item-desc">
                  Reconciliation matches awaiting verification
                </span>
              </div>
              <Link to="/reconciliation" className="btn btn-secondary btn-sm">
                <span>Review</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            {/* Records Awaiting Approval */}
            <div className="attention-item">
              <div className="attention-item-left">
                <span className="attention-item-count">
                  {summary?.recordsAwaitingReviewCount || 0}
                </span>
                <span className="attention-item-desc">
                  Extracted records needing manual customer assignment
                </span>
              </div>
              <Link to="/imports" className="btn btn-secondary btn-sm">
                <span>Inspect</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            {/* Pending Statement Imports */}
            <div className="attention-item">
              <div className="attention-item-left">
                <span className="attention-item-count">
                  {summary?.pendingImportsCount || 0}
                </span>
                <span className="attention-item-desc">
                  Imports currently in processing or awaiting extraction
                </span>
              </div>
              <Link to="/imports" className="btn btn-secondary btn-sm">
                <span>View Status</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* 4. REAL CASH-FLOW ACTIVITY BREAKDOWN (When date-based data is available) */}
      {dateSummaries.length > 0 && (
        <section className="paper-box" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--ink)' }}>
                Recent Cash-Flow Chronology
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--muted)' }}>
                Aggregated daily volume from recent confirmed transactions
              </p>
            </div>
            <span className="badge badge-neutral">
              <Calendar size={12} />
              Last {dateSummaries.length} Active Days
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${dateSummaries.length}, 1fr)`, gap: '12px' }}>
            {dateSummaries.map((day) => (
              <div
                key={day.date}
                style={{
                  background: 'var(--paper-warm)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--ink)', marginBottom: '8px' }}>
                  {day.date}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                    <span style={{ color: 'var(--muted)' }}>Udhaar:</span>
                    <strong style={{ color: '#B26E12', fontFamily: 'var(--font-mono)' }}>
                      +{formatINR(day.credits)}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                    <span style={{ color: 'var(--muted)' }}>Paid:</span>
                    <strong style={{ color: 'var(--emerald)', fontFamily: 'var(--font-mono)' }}>
                      -{formatINR(day.payments)}
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. RECENT ACTIVITY SPLIT TABLES */}
      <section className="activity-split-grid">
        {/* Recent Credits */}
        <div className="activity-column">
          <div className="activity-column-header">
            <h3 className="activity-column-title">
              <ArrowUpRight size={17} color="var(--amber)" />
              <span>Recent Credit Entries</span>
            </h3>
            <Link to="/customers" style={{ fontSize: '12.5px', color: 'var(--cobalt)', fontWeight: '600' }}>
              View All →
            </Link>
          </div>

          <div className="activity-list">
            {summary?.recentCredits?.length > 0 ? (
              summary.recentCredits.slice(0, 6).map((c) => (
                <div key={c.id} className="activity-row">
                  <div className="activity-row-primary">
                    <Link
                      to={`/customers/${c.customerId}/ledger`}
                      className="activity-customer-name"
                      title="Open ledger"
                    >
                      {c.customerName}
                    </Link>
                    <div className="activity-meta">
                      <span>{c.entryDate}</span>
                      <span>•</span>
                      <span>{c.description || 'Credit record'}</span>
                    </div>
                  </div>
                  <div className="activity-amount amount-credit">
                    +{formatINR(c.amount)}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '28px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                No credit entries recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="activity-column">
          <div className="activity-column-header">
            <h3 className="activity-column-title">
              <ArrowDownLeft size={17} color="var(--emerald)" />
              <span>Recent Payments Received</span>
            </h3>
            <Link to="/imports" style={{ fontSize: '12.5px', color: 'var(--cobalt)', fontWeight: '600' }}>
              View Imports →
            </Link>
          </div>

          <div className="activity-list">
            {summary?.recentPayments?.length > 0 ? (
              summary.recentPayments.slice(0, 6).map((p) => (
                <div key={p.id} className="activity-row">
                  <div className="activity-row-primary">
                    <Link
                      to={`/customers/${p.customerId}/ledger`}
                      className="activity-customer-name"
                      title="Open ledger"
                    >
                      {p.customerName}
                    </Link>
                    <div className="activity-meta">
                      <span>{p.paymentDate}</span>
                      <span>•</span>
                      <span>{p.reference || p.sourceType || 'Payment'}</span>
                    </div>
                  </div>
                  <div className="activity-amount amount-payment">
                    -{formatINR(p.amount)}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '28px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                No payments recorded yet.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* MODAL: ADD CUSTOMER */}
      {showAddCustomerModal && (
        <div className="modal-backdrop" onClick={() => setShowAddCustomerModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Register New Customer</h3>
              <button onClick={() => setShowAddCustomerModal(false)} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddCustomer}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Customer / Party Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Ramesh Patel"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile Number</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="e.g. 9876543210"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Store / Address Notes</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Shop 4, Main Bazaar"
                    value={newCustAddress}
                    onChange={(e) => setNewCustAddress(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Registering...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD CREDIT */}
      {showCreditModal && (
        <div className="modal-backdrop" onClick={() => setShowCreditModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Record Udhaar Credit</h3>
              <button onClick={() => setShowCreditModal(false)} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleRecordCredit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Select Customer *</label>
                  <select
                    className="form-input"
                    value={selectedCustId}
                    onChange={(e) => setSelectedCustId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''} — Balance: {formatINR(c.outstandingBalance)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Credit Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    className="form-input"
                    placeholder="500.00"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Goods Description</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 5kg Basmati Rice, 2L Oil"
                    value={txDesc}
                    onChange={(e) => setTxDesc(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowCreditModal(false)}
                  className="btn btn-secondary"
                >
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
                  <label className="form-label">Select Customer *</label>
                  <select
                    className="form-input"
                    value={selectedCustId}
                    onChange={(e) => setSelectedCustId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''} — Balance: {formatINR(c.outstandingBalance)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Amount Paid (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    className="form-input"
                    placeholder="500.00"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Reference / UPI ID</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. UPI / Google Pay / Cash / Bank"
                    value={txRef}
                    onChange={(e) => setTxRef(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Part payment against invoice"
                    value={txDesc}
                    onChange={(e) => setTxDesc(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="btn btn-secondary"
                >
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
